import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@4'
import { buildQuotePdf } from './pdf.ts'
import type { QuoteLine } from './pdf.ts'

/**
 * Crea la cotizacion del lado servidor. El navegador nunca inserta en la base:
 * manda variant_id + cantidad, y aqui se releen los precios reales, se
 * recalcula el total, se guarda la orden y se genera el PDF.
 */

const RATE_LIMIT = 6
const RATE_WINDOW_SECONDS = 600
const VALIDITY_DAYS = 15
const SIGNED_URL_SECONDS = VALIDITY_DAYS * 24 * 60 * 60

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

function cleanClientName(input: string): string {
  return input
    .replace(CONTROL_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .replace(/[<>&"'`\\{}[\]|^~]/g, '')
    .replace(/https?:\/\/\S+/gi, '')
    .trim()
}

const payloadSchema = z.object({
  client_name: z
    .string()
    .transform(cleanClientName)
    .refine((v) => v.length >= 3, 'Escribe tu nombre.')
    .refine((v) => /\p{L}/u.test(v), 'El nombre debe tener al menos una letra.'),
  items: z
    .array(
      z.object({
        variant_id: z.uuid(),
        quantity: z
          .number()
          .int()
          .positive()
          .max(100000),
      }),
    )
    .min(1, 'El carrito esta vacio.')
    .max(80, 'Demasiadas lineas.'),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Se guarda el hash, no la IP: alcanza para limitar y no almacena datos personales. */
async function hashIp(request: Request): Promise<string> {
  const forwarded = request.headers.get('x-forwarded-for') ?? ''
  const ip = forwarded.split(',')[0]?.trim() || 'sin-ip'
  const data = new TextEncoder().encode(`create-quote:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** Por bloques: hacer spread de un Uint8Array grande revienta la pila. */
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function settingString(
  settings: Map<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = settings.get(key)
  return typeof value === 'string' && value.trim() ? value : fallback
}

function variantLabel(variant: {
  size: string | null
  color: string | null
  presentation: string | null
  sale_unit: string | null
}): string {
  const base = [variant.size, variant.color, variant.presentation]
    .filter((part) => part && part.trim())
    .join(' / ')
  if (!variant.sale_unit) return base
  return base ? `${base} (${variant.sale_unit})` : variant.sale_unit
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return json({ error: 'Método no permitido.' }, 405)
  }

  // La service role key solo existe aqui, en los secrets de la funcion.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )

  try {
    const rateKey = await hashIp(request)
    const { data: allowed, error: rateError } = await supabase.rpc(
      'check_rate_limit',
      {
        p_key: rateKey,
        p_limit: RATE_LIMIT,
        p_window_seconds: RATE_WINDOW_SECONDS,
      },
    )

    if (rateError) throw rateError
    if (allowed === false) {
      return json(
        {
          error:
            'Estás generando muchas cotizaciones seguidas. Espera unos minutos o escríbenos por WhatsApp.',
        },
        429,
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) {
      return json(
        {
          error: 'Revisa los datos del pedido.',
          details: parsed.error.issues.map((issue) => issue.message),
        },
        400,
      )
    }

    const { client_name: clientName, items } = parsed.data

    // Se suman las cantidades repetidas antes de tocar la base.
    const wanted = new Map<string, number>()
    for (const item of items) {
      wanted.set(
        item.variant_id,
        (wanted.get(item.variant_id) ?? 0) + item.quantity,
      )
    }

    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select(
        'id, origin_id, size, color, presentation, sale_unit, price, availability, products ( name, origin_id )',
      )
      .in('id', [...wanted.keys()])

    if (variantsError) throw variantsError

    if (!variants || variants.length !== wanted.size) {
      return json(
        {
          error:
            'Algún producto de tu carrito ya no está disponible. Actualiza la página y vuelve a intentarlo.',
        },
        409,
      )
    }

    const unavailable = variants.filter(
      (variant) => variant.availability !== 'disponible' || Number(variant.price) <= 0,
    )
    if (unavailable.length > 0) {
      return json(
        {
          error:
            'Hay productos en tu carrito que ya no están disponibles o no tienen precio publicado. Quítalos y vuelve a intentarlo.',
          variant_ids: unavailable.map((variant) => variant.id),
        },
        409,
      )
    }

    // El total se recalcula siempre con el precio de la base, nunca con el
    // que manda el cliente.
    const lines = variants.map((variant) => {
      const quantity = wanted.get(variant.id) ?? 0
      const unitPrice = Number(variant.price)
      const product = variant.products as unknown as {
        name: string
        origin_id: number | null
      } | null

      return {
        variant_id: variant.id,
        product_name: product?.name ?? 'Producto',
        variant_label: variantLabel(variant) || null,
        code: String(product?.origin_id ?? variant.origin_id ?? '-'),
        quantity,
        unit_price: unitPrice,
        subtotal: Math.round(unitPrice * quantity * 100) / 100,
      }
    })

    const total =
      Math.round(lines.reduce((sum, line) => sum + line.subtotal, 0) * 100) / 100

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ client_name: clientName, total })
      .select('id, quote_number, created_at, valid_until, total')
      .single()

    if (orderError) throw orderError

    const { error: itemsError } = await supabase.from('order_items').insert(
      lines.map((line) => ({
        order_id: order.id,
        variant_id: line.variant_id,
        product_name: line.product_name,
        variant_label: line.variant_label,
        quantity: line.quantity,
        unit_price: line.unit_price,
        subtotal: line.subtotal,
      })),
    )

    if (itemsError) {
      // Sin lineas la cotizacion no sirve: se deshace para no dejar basura.
      await supabase.from('orders').delete().eq('id', order.id)
      throw itemsError
    }

    /* ---------- PDF ---------- */

    const { data: settingsRows } = await supabase
      .from('site_settings')
      .select('key, value')

    const settings = new Map<string, unknown>(
      (settingsRows ?? []).map((row) => [row.key, row.value]),
    )
    const scheduleValue = settings.get('schedule')
    const schedule =
      scheduleValue && typeof scheduleValue === 'object'
        ? String((scheduleValue as Record<string, unknown>).weekdays ?? '')
        : ''

    let logoBytes: Uint8Array | null = null
    let logoMime: string | null = null
    const logoUrl = settingString(settings, 'logo_url', '')
    if (logoUrl) {
      try {
        const response = await fetch(logoUrl)
        if (response.ok) {
          const type = response.headers.get('content-type') ?? ''
          if (type.includes('png') || type.includes('jpeg')) {
            logoBytes = new Uint8Array(await response.arrayBuffer())
            logoMime = type.includes('png') ? 'image/png' : 'image/jpeg'
          }
        }
      } catch {
        // El logo es decorativo: si no carga, la cotizacion sale igual.
      }
    }

    const pdfLines: QuoteLine[] = lines.map((line) => ({
      code: line.code,
      productName: line.product_name,
      variantLabel: line.variant_label ?? '',
      quantity: line.quantity,
      unitPrice: line.unit_price,
      subtotal: line.subtotal,
    }))

    const pdfBytes = await buildQuotePdf({
      businessName: settingString(settings, 'business_name', 'Ferretería Lozada'),
      address: settingString(settings, 'address', ''),
      phone: settingString(settings, 'whatsapp_display', ''),
      schedule,
      logoBytes,
      logoMime,
      quoteNumber: order.quote_number,
      clientName,
      createdAt: new Date(order.created_at),
      validUntil: order.valid_until,
      lines: pdfLines,
      total,
      validityDays: VALIDITY_DAYS,
    })

    const path = `${order.quote_number}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('quotes')
      .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true })

    let signedUrl: string | null = null
    if (!uploadError) {
      await supabase.from('orders').update({ pdf_url: path }).eq('id', order.id)
      const { data: signed } = await supabase.storage
        .from('quotes')
        .createSignedUrl(path, SIGNED_URL_SECONDS)
      signedUrl = signed?.signedUrl ?? null
    }

    // El PDF va tambien en base64 para que el celular pueda compartirlo o
    // descargarlo sin depender de la red otra vez.
    const base64 = toBase64(pdfBytes)

    return json({
      quote_number: order.quote_number,
      valid_until: order.valid_until,
      total,
      client_name: clientName,
      lines: lines.map((line) => ({
        product_name: line.product_name,
        variant_label: line.variant_label,
        quantity: line.quantity,
        unit_price: line.unit_price,
        subtotal: line.subtotal,
      })),
      pdf_url: signedUrl,
      pdf_base64: base64,
    })
  } catch (error) {
    console.error('create-quote falló:', error)
    return json(
      {
        error:
          'No pudimos generar la cotización. Intenta otra vez o escríbenos por WhatsApp.',
      },
      500,
    )
  }
})
