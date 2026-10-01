import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ButtonLink } from '@/components/Button'
import { ErrorState, Skeleton } from '@/components/States'
import { Pagination } from '@/components/Pagination'
import { AdminCard, Checkbox, FormError } from '@/features/admin/FormControls'
import { useAdminToast } from '@/features/admin/AdminToast'
import { categoryBranchIds, fetchCategories } from '@/data/categories'
import {
  deleteProduct,
  fetchAdminProducts,
  toggleProductFlag,
} from '@/data/admin'
import type { AdminProductRow } from '@/data/admin'
import { buildCategoryTree } from '@/lib/domain'
import type { CategoryNode } from '@/lib/domain'
import { formatDate } from '@/lib/format'
import { useAsync, useDebounced } from '@/lib/useAsync'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

function categoryOptions(nodes: CategoryNode[], depth = 0): {
  id: string
  label: string
}[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${'— '.repeat(depth)}${node.name}` },
    ...categoryOptions(node.children, depth + 1),
  ])
}

function parseVariantIssue(
  value: string | null,
): 'agotado' | 'sin-precio' | null {
  if (value === 'agotado' || value === 'sin-precio') return value
  return null
}

export default function AdminProducts() {
  useDocumentMeta({ title: 'Productos | Administración', noIndex: true })
  const toast = useAdminToast()
  const [params, setParams] = useSearchParams()
  const variantIssue = parseVariantIssue(params.get('filtro'))

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [onlyOffers, setOnlyOffers] = useState(false)
  const [onlyBestsellers, setOnlyBestsellers] = useState(false)
  const [page, setPage] = useState(1)
  const [actionError, setActionError] = useState<string | null>(null)

  const debouncedSearch = useDebounced(search, 350)

  const categories = useAsync(() => fetchCategories(), [])

  // Padre + todas sus hijas: filtrar por "Fijaciones" incluye Tornillos, etc.
  const categoryIds = useMemo(() => {
    if (!categoryId || !categories.data) return null
    return categoryBranchIds(categories.data, categoryId)
  }, [categoryId, categories.data])

  const products = useAsync(
    () =>
      fetchAdminProducts({
        search: debouncedSearch,
        categoryIds,
        onlyOffers,
        onlyBestsellers,
        variantIssue,
        page,
      }),
    [debouncedSearch, categoryIds, onlyOffers, onlyBestsellers, variantIssue, page],
  )

  const options = categoryOptions(buildCategoryTree(categories.data ?? []))

  const toggleFlag = async (
    row: AdminProductRow,
    flag: 'is_offer' | 'is_bestseller',
    value: boolean,
  ) => {
    setActionError(null)
    try {
      await toggleProductFlag(row.id, flag, value)
      const label = flag === 'is_offer' ? 'oferta' : 'más vendido'
      toast.success(
        value
          ? `"${row.name}" marcado como ${label}.`
          : `"${row.name}" ya no es ${label}.`,
      )
      products.reload()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo cambiar.'
      setActionError(message)
      toast.error(message)
    }
  }

  const remove = async (row: AdminProductRow) => {
    setActionError(null)
    if (
      !window.confirm(
        `¿Borrar "${row.name}"?\n\nSe borran también sus ${row.variantCount} variante(s) y sus imágenes.`,
      )
    ) {
      return
    }
    try {
      await deleteProduct(row.id)
      toast.success(`Se borró "${row.name}".`)
      products.reload()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo borrar.'
      setActionError(message)
      toast.error(message)
    }
  }

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setPage(1)
    setter(value)
  }

  const setVariantIssue = (value: string) => {
    setPage(1)
    const next = new URLSearchParams(params)
    if (value === 'agotado' || value === 'sin-precio') {
      next.set('filtro', value)
    } else {
      next.delete('filtro')
    }
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink-900 text-2xl font-extrabold">Productos</h1>
          <p className="text-ink-600 mt-1 text-sm">
            {products.data
              ? `${products.data.total} producto(s)${
                  variantIssue === 'agotado'
                    ? ' con variantes agotadas'
                    : variantIssue === 'sin-precio'
                      ? ' con variantes sin precio'
                      : ' en el catálogo'
                }.`
              : 'Cargando catálogo…'}
          </p>
        </div>
        <ButtonLink to="/admin/productos/nuevo">Nuevo producto</ButtonLink>
      </div>

      <AdminCard>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label
              htmlFor="admin-search"
              className="text-ink-800 mb-1.5 block text-sm font-semibold"
            >
              Buscar
            </label>
            <input
              id="admin-search"
              type="search"
              value={search}
              onChange={(event) => resetPage(setSearch)(event.target.value)}
              placeholder="Nombre o código del producto"
              className="admin-input"
            />
          </div>

          <div>
            <label
              htmlFor="admin-category"
              className="text-ink-800 mb-1.5 block text-sm font-semibold"
            >
              Categoría
            </label>
            <select
              id="admin-category"
              value={categoryId}
              onChange={(event) => resetPage(setCategoryId)(event.target.value)}
              className="admin-input"
              title="Si eliges una categoría principal, también se muestran los productos de sus subcategorías."
            >
              <option value="">Todas</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {categoryId && (categoryIds?.length ?? 0) > 1 ? (
              <p className="text-ink-500 mt-1 text-xs">
                Incluye esta categoría y {(categoryIds?.length ?? 1) - 1}{' '}
                subcategoría(s).
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="admin-variant-issue"
              className="text-ink-800 mb-1.5 block text-sm font-semibold"
            >
              Problema de variante
            </label>
            <select
              id="admin-variant-issue"
              value={variantIssue ?? ''}
              onChange={(event) => setVariantIssue(event.target.value)}
              className="admin-input"
            >
              <option value="">Todos</option>
              <option value="agotado">Con variantes agotadas</option>
              <option value="sin-precio">Con variantes sin precio</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-5">
          <Checkbox
            id="filter-offers"
            label="Solo ofertas"
            checked={onlyOffers}
            onChange={resetPage(setOnlyOffers)}
          />
          <Checkbox
            id="filter-bestsellers"
            label="Solo más vendidos"
            checked={onlyBestsellers}
            onChange={resetPage(setOnlyBestsellers)}
          />
        </div>
      </AdminCard>

      {actionError ? <FormError>{actionError}</FormError> : null}

      {products.error ? (
        <ErrorState error={products.error} onRetry={products.reload} />
      ) : products.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : products.data && products.data.items.length === 0 ? (
        <AdminCard>
          <p className="text-ink-600 text-sm">
            Ningún producto coincide con esos filtros.
          </p>
        </AdminCard>
      ) : (
        <>
          <ul className="space-y-2">
            {products.data?.items.map((row) => (
              <li
                key={row.id}
                className="border-ink-100 rounded-card border bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/admin/productos/${row.id}`}
                      className="text-ink-900 hover:text-brand-700 font-semibold"
                    >
                      {row.name}
                    </Link>
                    <p className="text-ink-500 mt-0.5 text-xs">
                      {row.origin_id ? `Código ${row.origin_id}` : 'Sin código'} ·{' '}
                      {row.categoryName ?? 'Sin categoría'} · {row.variantCount}{' '}
                      variante(s) · editado {formatDate(row.updatedAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <Checkbox
                      id={`offer-${row.id}`}
                      label="Oferta"
                      checked={row.isOffer}
                      onChange={(value) => void toggleFlag(row, 'is_offer', value)}
                    />
                    <Checkbox
                      id={`best-${row.id}`}
                      label="Más vendido"
                      checked={row.isBestseller}
                      onChange={(value) =>
                        void toggleFlag(row, 'is_bestseller', value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => void remove(row)}
                      className="text-sm font-semibold text-red-700 underline"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={products.data?.totalPages ?? 1}
            onChange={setPage}
          />
        </>
      )}
    </div>
  )
}
