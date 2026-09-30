import type { Tables } from './types.database'

export type Availability = 'disponible' | 'agotado' | 'consultar'

export type VariantLike = {
  size: string | null
  color: string | null
  presentation: string | null
  sale_unit: string | null
}

export type Variant = {
  id: string
  origin_id: number | null
  size: string | null
  color: string | null
  presentation: string | null
  sale_unit: string | null
  price: number
  barcode: string | null
  availability: Availability
}

export type ProductImage = {
  id: string
  url: string
  is_primary: boolean
  sort_order: number
  variant_id: string | null
}

export type Category = {
  id: string
  name: string
  slug: string
  parent_id: string | null
  sort_order: number
}

export type CategoryNode = Category & { children: CategoryNode[] }

/** Lo minimo que la tarjeta del catalogo necesita para pintarse. */
export type ProductCard = {
  id: string
  origin_id: number | null
  name: string
  categoryName: string | null
  categorySlug: string | null
  imageUrl: string | null
  priceFrom: number | null
  priceTo: number | null
  availability: Availability
  variantCount: number
  isOffer: boolean
  isBestseller: boolean
}

export type ProductDetail = {
  id: string
  origin_id: number | null
  name: string
  description: string | null
  isOffer: boolean
  isBestseller: boolean
  category: Pick<Category, 'id' | 'name' | 'slug'> | null
  parentCategory: Pick<Category, 'id' | 'name' | 'slug'> | null
  variants: Variant[]
  images: ProductImage[]
}

export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/* ---------- Reglas de negocio puras ---------- */

/**
 * Disponibilidad de la familia a partir de sus variantes.
 * Basta una variante disponible para que el producto se pueda pedir.
 * Si no hay ninguna disponible pero si alguna a consultar, se consulta.
 */
export function aggregateAvailability(
  variants: Pick<Variant, 'availability'>[],
): Availability {
  if (variants.length === 0) return 'consultar'
  if (variants.some((v) => v.availability === 'disponible')) return 'disponible'
  if (variants.some((v) => v.availability === 'consultar')) return 'consultar'
  return 'agotado'
}

/**
 * Rango de precios visible. Solo cuentan las variantes que se pueden vender
 * con precio publicado: las de 'consultar' no tienen precio que mostrar.
 */
export function priceRange(variants: Pick<Variant, 'price' | 'availability'>[]): {
  from: number | null
  to: number | null
} {
  const prices = variants
    .filter((v) => v.availability !== 'consultar' && v.price > 0)
    .map((v) => v.price)

  if (prices.length === 0) return { from: null, to: null }
  return { from: Math.min(...prices), to: Math.max(...prices) }
}

/** Solo se puede añadir al carrito lo que tiene precio y esta disponible. */
export function canAddToCart(variant: Pick<Variant, 'price' | 'availability'>): boolean {
  return variant.availability === 'disponible' && variant.price > 0
}

/** Los selectores solo se muestran si la familia realmente usa ese atributo. */
export function variantAxes(variants: Variant[]): {
  sizes: string[]
  colors: string[]
  presentations: string[]
  saleUnits: string[]
} {
  const unique = (values: (string | null)[]) =>
    Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim()))))

  return {
    sizes: unique(variants.map((v) => v.size)),
    colors: unique(variants.map((v) => v.color)),
    presentations: unique(variants.map((v) => v.presentation)),
    saleUnits: unique(variants.map((v) => v.sale_unit)),
  }
}

export function buildCategoryTree(rows: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>()
  for (const row of rows) byId.set(row.id, { ...row, children: [] })

  const roots: CategoryNode[] = []
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const sort = (nodes: CategoryNode[]) => {
    nodes.sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'es'),
    )
    for (const node of nodes) sort(node.children)
  }
  sort(roots)

  return roots
}

/* ---------- Adaptadores desde filas de Supabase ---------- */

type VariantRow = Pick<
  Tables<'product_variants'>,
  | 'id'
  | 'origin_id'
  | 'size'
  | 'color'
  | 'presentation'
  | 'sale_unit'
  | 'price'
  | 'barcode'
  | 'availability'
>

export function toVariant(row: VariantRow): Variant {
  const availability = row.availability
  return {
    id: row.id,
    origin_id: row.origin_id,
    size: row.size,
    color: row.color,
    presentation: row.presentation,
    sale_unit: row.sale_unit,
    price: Number(row.price ?? 0),
    barcode: row.barcode,
    availability:
      availability === 'disponible' ||
      availability === 'agotado' ||
      availability === 'consultar'
        ? availability
        : 'consultar',
  }
}

export function toCategory(row: Tables<'categories'>): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parent_id: row.parent_id,
    sort_order: row.sort_order,
  }
}

/** La imagen principal: la marcada is_primary, si no la de menor sort_order. */
export function pickPrimaryImage(images: ProductImage[]): string | null {
  if (images.length === 0) return null
  const primary = images.find((image) => image.is_primary)
  if (primary) return primary.url
  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null
}
