import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ErrorState, Skeleton } from '@/components/States'
import { PromotionCard } from '@/features/promotions/PromotionCard'
import { fetchActivePromotions } from '@/data/promotions'
import { useAsync } from '@/lib/useAsync'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

export function PromotionsPage() {
  useDocumentMeta({
    title: 'Promociones | Ferretería Lozada',
    description:
      'Combos y promociones vigentes de Ferretería Lozada. Pídelos por WhatsApp y enseña la imagen en el local.',
  })

  const { data, loading, error, reload } = useAsync(fetchActivePromotions, [])

  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[{ label: 'Inicio', to: '/' }, { label: 'Promociones' }]}
      />

      <h1 className="text-ink-900 text-2xl font-extrabold tracking-tight sm:text-3xl">
        Promociones
      </h1>
      <p className="text-ink-600 mt-2 max-w-2xl text-sm">
        Combos por tiempo limitado. Pídelos por WhatsApp y enseña esta imagen
        en el local.
      </p>

      {error ? (
        <div className="mt-8">
          <ErrorState error={error} onRetry={reload} />
        </div>
      ) : loading ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index}>
              <Skeleton className="h-80" />
            </li>
          ))}
        </ul>
      ) : !data || data.length === 0 ? (
        <p className="text-ink-600 mt-10 text-sm">
          No hay promociones activas por ahora — vuelve pronto
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((promotion, index) => (
            <li key={promotion.id}>
              <PromotionCard promotion={promotion} eager={index < 2} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
