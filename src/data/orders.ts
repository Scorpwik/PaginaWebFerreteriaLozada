import { supabase } from '@/lib/supabase'
import { createQuoteSchema } from '@/lib/validation'
import type { CreateQuoteInput } from '@/lib/validation'

export type QuoteResult = {
  quote_number: string
  valid_until: string
  total: number
  client_name: string
  lines: {
    product_name: string
    variant_label: string | null
    quantity: number
    unit_price: number
    subtotal: number
  }[]
  pdf_url: string | null
  pdf_base64: string
}

export class QuoteError extends Error {
  readonly details: string[]

  constructor(message: string, details: string[] = []) {
    super(message)
    this.name = 'QuoteError'
    this.details = details
  }
}

/**
 * Unico camino para crear una cotizacion. El cliente no inserta en orders:
 * la Edge Function revalida precios, recalcula el total y genera el PDF.
 */
export async function createQuote(input: CreateQuoteInput): Promise<QuoteResult> {
  const parsed = createQuoteSchema.safeParse(input)
  if (!parsed.success) {
    throw new QuoteError(
      'Revisa los datos del pedido.',
      parsed.error.issues.map((issue) => issue.message),
    )
  }

  const { data, error } = await supabase.functions.invoke<
    QuoteResult | { error: string; details?: string[] }
  >('create-quote', { body: parsed.data })

  if (error) {
    // La funcion manda el motivo real en el cuerpo; el SDK solo dice que fallo.
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      try {
        const payload = (await context.json()) as {
          error?: string
          details?: string[]
        }
        if (payload?.error) throw new QuoteError(payload.error, payload.details ?? [])
      } catch (parseError) {
        if (parseError instanceof QuoteError) throw parseError
      }
    }
    throw new QuoteError(
      'No pudimos generar la cotización. Revisa tu conexión e inténtalo otra vez.',
    )
  }

  if (!data || 'error' in data) {
    throw new QuoteError(
      (data as { error: string } | null)?.error ??
        'No pudimos generar la cotización.',
    )
  }

  return data
}

/** Convierte el PDF que devuelve la funcion en un archivo compartible. */
export function quotePdfFile(result: QuoteResult): File {
  const binary = atob(result.pdf_base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)

  return new File([bytes], `Cotizacion-${result.quote_number}.pdf`, {
    type: 'application/pdf',
  })
}
