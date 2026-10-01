import { supabase } from '@/lib/supabase'
import { addDaysToIsoDate, todayInQuito } from '@/lib/format'

/**
 * Estadísticas del panel. Las cotizaciones viven como mucho 15 días (pg_cron),
 * así que los agregados caben en memoria sin una vista materializada.
 */

export type AdminStats = {
  quoteCount: number
  quotedTotal: number
  productCount: number
  variantCount: number
  outOfStockCount: number
  noPriceCount: number
  quotesByDay: QuoteDayCount[]
  topProducts: {
    id: string | null
    name: string
    quantity: number
    orders: number
  }[]
  topCategories: { id: string | null; name: string; quotes: number }[]
}

export type QuoteDayCount = {
  date: string
  count: number
}

const STATS_PAGE = 1000
const STATS_MAX_PAGES = 20
const QUOTE_WINDOW_DAYS = 15
const QUITO_OFFSET = '-05:00'

/**
 * PostgREST corta cada respuesta en 1000 filas por defecto. Sin paginar, con
 * más de 1000 líneas de cotización el "monto cotizado" y los "más pedidos"
 * saldrían truncados sin avisar. Tope de 20 páginas (20.000 filas): con la
 * purga a 15 días no se acerca, y evita un bucle si algo va mal.
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

function dateWindowInQuito(days: number): string[] {
  const today = todayInQuito()
  const dates: string[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    dates.push(addDaysToIsoDate(today, -offset))
  }
  return dates
}

function dateInQuito(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
  }).format(new Date(iso))
}

/**
 * Agrupa orders.created_at por día (calendario de Quito) en los últimos
 * `days` días, incluyendo los que van en cero.
 */
export async function fetchQuotesByDay(
  days = QUOTE_WINDOW_DAYS,
): Promise<QuoteDayCount[]> {
  const window = dateWindowInQuito(days)
  const start = `${window[0]}T00:00:00${QUITO_OFFSET}`

  const rows = (await collectPages((from, to) =>
    supabase
      .from('orders')
      .select('created_at')
      .gte('created_at', start)
      .order('created_at')
      .range(from, to),
  )) as { created_at: string }[]

  const counts = new Map<string, number>()
  for (const date of window) counts.set(date, 0)
  for (const row of rows) {
    const date = dateInQuito(row.created_at)
    if (counts.has(date)) {
      counts.set(date, (counts.get(date) ?? 0) + 1)
    }
  }

  return window.map((date) => ({ date, count: counts.get(date) ?? 0 }))
}

/**
 * Conteos con head: true (no traen filas) y agregados en memoria para los
 * "más pedidos".
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const [orderRows, itemRows, products, variants, outOfStock, noPrice, quotesByDay] =
    await Promise.all([
      collectPages((from, to) =>
        supabase.from('orders').select('total').order('id').range(from, to),
      ),
      collectPages((from, to) =>
        supabase
          .from('order_items')
          .select(
            'order_id, product_name, quantity, variant:product_variants!order_items_variant_id_fkey ( product:products!product_variants_product_id_fkey ( id, category:categories!products_category_id_fkey ( id, name ) ) )',
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
        .or('price.is.null,price.eq.0'),
      fetchQuotesByDay(QUOTE_WINDOW_DAYS),
    ])

  for (const result of [products, variants, outOfStock, noPrice]) {
    if (result.error) throw result.error
  }

  type ItemRow = {
    order_id: string
    product_name: string
    quantity: number
    variant: {
      product: {
        id: string
        category: { id: string; name: string } | null
      } | null
    } | null
  }

  const byProduct = new Map<
    string,
    { id: string | null; name: string; quantity: number; orders: Set<string> }
  >()
  const byCategory = new Map<
    string,
    { id: string | null; name: string; quotes: Set<string> }
  >()

  for (const row of itemRows as unknown as ItemRow[]) {
    const productId = row.variant?.product?.id ?? null
    const productKey = productId ?? `name:${row.product_name}`
    const product = byProduct.get(productKey) ?? {
      id: productId,
      name: row.product_name,
      quantity: 0,
      orders: new Set<string>(),
    }
    product.quantity += Number(row.quantity ?? 0)
    product.orders.add(row.order_id)
    byProduct.set(productKey, product)

    const category = row.variant?.product?.category
    if (category) {
      const categoryKey = category.id
      const current = byCategory.get(categoryKey) ?? {
        id: category.id,
        name: category.name,
        quotes: new Set<string>(),
      }
      current.quotes.add(row.order_id)
      byCategory.set(categoryKey, current)
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
    quotesByDay,
    topProducts: [...byProduct.values()]
      .map((value) => ({
        id: value.id,
        name: value.name,
        quantity: Math.round(value.quantity * 100) / 100,
        orders: value.orders.size,
      }))
      .sort((a, b) => b.orders - a.orders || b.quantity - a.quantity)
      .slice(0, 10),
    topCategories: [...byCategory.values()]
      .map((value) => ({
        id: value.id,
        name: value.name,
        quotes: value.quotes.size,
      }))
      .sort((a, b) => b.quotes - a.quotes)
      .slice(0, 8),
  }
}
