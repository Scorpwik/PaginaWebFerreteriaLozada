import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProductGrid } from './ProductGrid'
import { SearchBar } from './SearchBar'
import { Filters } from './Filters'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState } from '@/components/States'
import { ButtonLink } from '@/components/Button'
import {
  fetchCatalogPage,
  fetchCatalogPriceCeiling,
  PAGE_SIZE,
} from '@/data/products'
import { useAsync } from '@/lib/useAsync'
import { isAvailability } from '@/lib/format'

function parsePriceParam(raw: string | null): number | null {
  if (raw == null || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : null
}

/**
 * Listado paginado reutilizado por /catalogo y por las paginas de categoria.
 * Todo el estado del filtro vive en la URL, asi que una busqueda se puede
 * compartir por WhatsApp tal cual.
 */
export function CatalogBrowser({
  categoryIds = null,
}: {
  categoryIds?: string[] | null
}) {
  const [params, setParams] = useSearchParams()
  const [priceCeiling, setPriceCeiling] = useState(100)

  const search = params.get('q') ?? ''
  const availabilityParam = params.get('disp') ?? ''
  const availability = isAvailability(availabilityParam)
    ? availabilityParam
    : null
  const onlyOffers = params.get('oferta') === '1'
  const onlyBestsellers = params.get('mas-vendidos') === '1'
  const priceMin = parsePriceParam(params.get('pmin'))
  const priceMax = parsePriceParam(params.get('pmax'))
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)

  const categoryKey = categoryIds?.join(',') ?? ''

  useEffect(() => {
    let cancelled = false
    void fetchCatalogPriceCeiling()
      .then((ceiling) => {
        if (!cancelled) setPriceCeiling(ceiling)
      })
      .catch(() => {
        /* fallback local ya esta en state */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const { data, loading, error, reload } = useAsync(
    () =>
      fetchCatalogPage({
        search,
        categoryIds,
        availability,
        onlyOffers,
        onlyBestsellers,
        priceMin,
        priceMax,
        page,
        pageSize: PAGE_SIZE,
      }),
    [
      search,
      categoryKey,
      availability,
      onlyOffers,
      onlyBestsellers,
      priceMin,
      priceMax,
      page,
    ],
  )

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params)
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
      }
      // Cualquier cambio de filtro vuelve a la primera pagina.
      if (!('page' in changes)) next.delete('page')
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  if (error) return <ErrorState error={error} onRetry={reload} />

  const products = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <div>
      <div className="mb-5">
        {/* key fuerza remount cuando cambia ?q= desde el Home u otra pagina. */}
        <SearchBar key={search} id="buscador-catalogo" initialValue={search} />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Filters
          priceCeiling={priceCeiling}
          value={{ availability, priceMin, priceMax }}
          onChange={(next) =>
            update({
              disp: next.availability,
              pmin: next.priceMin != null ? String(next.priceMin) : null,
              pmax: next.priceMax != null ? String(next.priceMax) : null,
            })
          }
        />

        <button
          type="button"
          onClick={() => update({ oferta: onlyOffers ? null : '1' })}
          aria-pressed={onlyOffers}
          className={`rounded-full border-2 px-3 py-2 text-sm font-semibold transition-colors ${
            onlyOffers
              ? 'border-brand-600 bg-brand-50 text-brand-800'
              : 'border-ink-200 bg-white text-ink-800 hover:border-ink-300'
          }`}
        >
          Solo ofertas
        </button>

        <button
          type="button"
          onClick={() =>
            update({ 'mas-vendidos': onlyBestsellers ? null : '1' })
          }
          aria-pressed={onlyBestsellers}
          className={`rounded-full border-2 px-3 py-2 text-sm font-semibold transition-colors ${
            onlyBestsellers
              ? 'border-brand-600 bg-brand-50 text-brand-800'
              : 'border-ink-200 bg-white text-ink-800 hover:border-ink-300'
          }`}
        >
          Solo más vendidos
        </button>

        {search ? (
          <p className="text-ink-600 text-sm">
            Resultados para{' '}
            <span className="text-ink-900 font-semibold">“{search}”</span>
          </p>
        ) : null}

        {!loading ? (
          <p className="text-ink-500 ml-auto text-sm" aria-live="polite">
            {total === 0
              ? 'Sin resultados'
              : `${total} ${total === 1 ? 'producto' : 'productos'}`}
          </p>
        ) : null}
      </div>

      {loading ? (
        <ProductGrid products={[]} loading skeletonCount={PAGE_SIZE / 2} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No encontramos ese producto"
          description={
            search
              ? 'Prueba con menos palabras, con la medida sola o con el código. Si no aparece, escríbenos y lo buscamos por ti.'
              : 'Todavía no hay productos publicados en esta sección.'
          }
          action={
            <ButtonLink to="/catalogo" variant="outline">
              Ver todo el catálogo
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ProductGrid products={products} />
          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 1}
            onChange={(next) => update({ page: String(next) })}
          />
        </>
      )}
    </div>
  )
}
