import { supabase } from '@/lib/supabase'

/**
 * Historial de cotizaciones. Las filas se borran solas a los 15 dias con el job
 * de pg_cron purge-expired-quotes, asi que aqui no hay logica de caducidad:
 * lo que ya no aparece es porque la base lo limpio.
 */

export type QuoteHistoryRow = {
  id: string
  quoteNumber: string
  clientName: string
  total: number
  createdAt: string
  validUntil: string
  pdfPath: string | null
  itemCount: number
}

export const QUOTES_PAGE_SIZE = 20

export async function fetchQuotes(page = 1): Promise<{
  items: QuoteHistoryRow[]
  total: number
  totalPages: number
}> {
  const from = (Math.max(1, page) - 1) * QUOTES_PAGE_SIZE

  const { data, error, count } = await supabase
    .from('orders')
    .select(
      'id, quote_number, client_name, total, created_at, valid_until, pdf_url, order_items ( id )',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, from + QUOTES_PAGE_SIZE - 1)

  if (error) throw error

  type Row = {
    id: string
    quote_number: string
    client_name: string
    total: number
    created_at: string
    valid_until: string
    pdf_url: string | null
    order_items: { id: string }[]
  }

  const total = count ?? 0

  return {
    items: (data as unknown as Row[]).map((row) => ({
      id: row.id,
      quoteNumber: row.quote_number,
      clientName: row.client_name,
      total: Number(row.total ?? 0),
      createdAt: row.created_at,
      validUntil: row.valid_until,
      pdfPath: row.pdf_url,
      itemCount: row.order_items.length,
    })),
    total,
    totalPages: Math.max(1, Math.ceil(total / QUOTES_PAGE_SIZE)),
  }
}

export type QuoteLineRow = {
  productName: string
  variantLabel: string | null
  quantity: number
  unitPrice: number
  subtotal: number
}

export async function fetchQuoteLines(orderId: string): Promise<QuoteLineRow[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('product_name, variant_label, quantity, unit_price, subtotal')
    .eq('order_id', orderId)
    .order('product_name')

  if (error) throw error

  return (data ?? []).map((row) => ({
    productName: row.product_name,
    variantLabel: row.variant_label,
    quantity: Number(row.quantity ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    subtotal: Number(row.subtotal ?? 0),
  }))
}

/**
 * El bucket quotes es privado, asi que el PDF se abre con una URL firmada de
 * corta duracion generada en el momento del clic.
 */
export async function signQuotePdf(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('quotes')
    .createSignedUrl(path, 300)

  if (error) throw new Error('No pudimos abrir el PDF de esta cotización.')
  return data.signedUrl
}

export async function deleteQuote(id: string): Promise<void> {
  // Con RLS, un DELETE sin permiso no da error: simplemente borra 0 filas.
  // Se pide la fila de vuelta para distinguir "borrada" de "no permitido".
  const { data, error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) throw new Error('No se pudo borrar la cotización.')
  if (!data || data.length === 0) {
    throw new Error('No se borró: la cotización ya no existe o no tienes permiso.')
  }
}
