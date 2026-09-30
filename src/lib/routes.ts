import { slugify } from './format'

/**
 * products no tiene columna slug, asi que la URL usa origin_id (el codigo del
 * sistema de facturacion) y anade el nombre como sufijo legible. Si un
 * producto llegara sin origin_id se cae al uuid, que siempre existe.
 */
export function productPath(product: {
  id: string
  origin_id: number | null
  name: string
}): string {
  const identifier = product.origin_id ?? product.id
  const suffix = slugify(product.name)
  return suffix
    ? `/producto/${identifier}-${suffix}`
    : `/producto/${identifier}`
}

/**
 * Extrae el identificador del parametro de ruta. Acepta "1855",
 * "1855-tornillo-para-madera" y un uuid con o sin sufijo.
 */
export function parseProductParam(
  param: string | undefined,
): { kind: 'origin'; originId: number } | { kind: 'id'; id: string } | null {
  if (!param) return null

  const numeric = /^(\d{1,9})(?:-|$)/.exec(param)
  if (numeric) return { kind: 'origin', originId: Number(numeric[1]) }

  const uuid =
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:-|$)/i.exec(
      param,
    )
  if (uuid) return { kind: 'id', id: uuid[1].toLowerCase() }

  return null
}

export function categoryPath(parentSlug: string, childSlug?: string | null): string {
  return childSlug
    ? `/catalogo/${parentSlug}/${childSlug}`
    : `/catalogo/${parentSlug}`
}
