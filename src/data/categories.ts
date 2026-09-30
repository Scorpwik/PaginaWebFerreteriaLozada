import { supabase } from '@/lib/supabase'
import { buildCategoryTree, toCategory } from '@/lib/domain'
import type { Category, CategoryNode } from '@/lib/domain'

const CATEGORY_COLUMNS = 'id, name, slug, parent_id, sort_order, created_at'

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(CATEGORY_COLUMNS)
    .order('sort_order')
    .order('name')

  if (error) throw error
  return (data ?? []).map(toCategory)
}

export async function fetchCategoryTree(): Promise<CategoryNode[]> {
  return buildCategoryTree(await fetchCategories())
}

/**
 * Resuelve una ruta /catalogo/:padre/:hijo a categorias reales.
 * Devuelve null si el slug no existe, para que la pagina muestre 404.
 */
export async function resolveCategoryPath(
  parentSlug: string,
  childSlug?: string,
): Promise<{ parent: Category; child: Category | null } | null> {
  const slugs = childSlug ? [parentSlug, childSlug] : [parentSlug]
  const { data, error } = await supabase
    .from('categories')
    .select(CATEGORY_COLUMNS)
    .in('slug', slugs)

  if (error) throw error

  const rows = (data ?? []).map(toCategory)
  const parent = rows.find((row) => row.slug === parentSlug)
  if (!parent) return null

  if (!childSlug) return { parent, child: null }

  const child = rows.find((row) => row.slug === childSlug)
  if (!child || child.parent_id !== parent.id) return null

  return { parent, child }
}

/** Ids de una categoria y sus hijas, para filtrar productos de toda la rama. */
export function categoryBranchIds(
  categories: Category[],
  rootId: string,
): string[] {
  const ids = [rootId]
  let frontier = [rootId]

  while (frontier.length > 0) {
    const children = categories
      .filter((c) => c.parent_id && frontier.includes(c.parent_id))
      .map((c) => c.id)
    const fresh = children.filter((id) => !ids.includes(id))
    ids.push(...fresh)
    frontier = fresh
  }

  return ids
}
