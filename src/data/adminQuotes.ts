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

/* ---------- Estadisticas simples ---------- */

export type AdminStats = {
  quoteCount: number
  quotedTotal: number
  productCount: number
  variantCount: number
  outOfStockCount: number
  noPriceCount: number
  topProducts: { name: string; quantity: number; orders: number }[]
  topCategories: { name: string; quotes: number }[]
}

const STATS_PAGE = 1000
const STATS_MAX_PAGES = 20

/**
 * PostgREST corta cada respuesta en 1000 filas por defecto. Sin paginar, con
 * mas de 1000 lineas de cotizacion el "monto cotizado" y los "mas pedidos"
 * saldrian truncados sin avisar. Tope de 20 paginas (20.000 filas): con la
 * purga a 15 dias no se acerca, y evita un bucle si algo va mal.
 */
async function collectPages(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<unknown[]> {
  const rows: unknown[] = []

  for (let index = 0; index < STATS_MAX_PAGES; index += 1) {
    const from = index * STATS_PAGE
    const { data, error } = await page(from, from + STATS_PAGE - 1)
    if (error) throw new Error(error.message)

    rows.push(...(data ?? []))
    if (!data || data.length < STATS_PAGE) break
  }

  return rows
}

/**
 * Conteos con head: true (no traen filas) y agregados en memoria para los "mas
 * pedidos": las tablas de cotizaciones son chicas porque se purgan cada 15
 * dias, asi que no hace falta una vista materializada.
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const [orderRows, itemRows, products, variants, outOfStock, noPrice] =
    await Promise.all([
      collectPages((from, to) =>
        supabase.from('orders').select('total').order('id').range(from, to),
      ),
      collectPages((from, to) =>
        supabase
          .from('order_items')
          .select(
            'order_id, product_name, quantity, variant:product_variants!order_items_variant_id_fkey ( product:products!product_variants_product_id_fkey ( category:categories!products_category_id_fkey ( name ) ) )',
          )
          .order('id')
          .range(from, to),
      ),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase
        .from('product_variants')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('product_variants')
        .select('id', { count: 'exact', head: true })
        .eq('availability', 'agotado'),
      supabase
        .from('product_variants')
        .select('id', { count: 'exact', head: true })
        .lte('price', 0),
    ])

  for (const result of [products, variants, outOfStock, noPrice]) {
    if (result.error) throw result.error
  }

  type ItemRow = {
    order_id: string
    product_name: string
    quantity: number
    variant: {
      product: { category: { name: string } | null } | null
    } | null
  }

  const byProduct = new Map<string, { quantity: number; orders: Set<string> }>()
  const byCategory = new Map<string, Set<string>>()

  for (const row of itemRows as unknown as ItemRow[]) {
    const product = byProduct.get(row.product_name) ?? {
      quantity: 0,
      orders: new Set<string>(),
    }
    product.quantity += Number(row.quantity ?? 0)
    product.orders.add(row.order_id)
    byProduct.set(row.product_name, product)

    const categoryName = row.variant?.product?.category?.name
    if (categoryName) {
      const set = byCategory.get(categoryName) ?? new Set<string>()
      set.add(row.order_id)
      byCategory.set(categoryName, set)
    }
  }

  const quotedTotal = (orderRows as { total: number | null }[]).reduce(
    (sum, row) => sum + Number(row.total ?? 0),
    0,
  )

  return {
    quoteCount: orderRows.length,
    quotedTotal: Math.round(quotedTotal * 100) / 100,
    productCount: products.count ?? 0,
    variantCount: variants.count ?? 0,
    outOfStockCount: outOfStock.count ?? 0,
    noPriceCount: noPrice.count ?? 0,
    topProducts: [...byProduct.entries()]
      .map(([name, value]) => ({
        name,
        quantity: Math.round(value.quantity * 100) / 100,
        orders: value.orders.size,
      }))
      .sort((a, b) => b.orders - a.orders || b.quantity - a.quantity)
      .slice(0, 10),
    topCategories: [...byCategory.entries()]
      .map(([name, set]) => ({ name, quotes: set.size }))
      .sort((a, b) => b.quotes - a.quotes)
      .slice(0, 8),
  }
}
