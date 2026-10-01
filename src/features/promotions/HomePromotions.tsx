import { ButtonLink } from '@/components/Button'
import { PromotionCard } from '@/features/promotions/PromotionCard'
import { fetchActivePromotions } from '@/data/promotions'
import { useAsync } from '@/lib/useAsync'

/**
 * Combos vigentes. Si no hay ninguno, no se renderiza nada: el Home no debe
 * dejar un hueco ni un mensaje de "no hay promociones".
 */
export function HomePromotions() {
  const { data } = useAsync(fetchActivePromotions, [])
  if (!data || data.length === 0) return null

  return (
    <section className="container-page mt-14 lg:mt-20" aria-labelledby="promociones">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="promociones"
            className="text-ink-900 text-xl font-extrabold tracking-tight"
          >
            Promociones
          </h2>
          <p className="text-ink-600 mt-1 text-sm">
            Combos por tiempo limitado. Pídelos por WhatsApp y enseña esta imagen
            en el local.
          </p>
        </div>
        <ButtonLink to="/promociones" variant="outline" size="sm">
          Ver más
        </ButtonLink>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((promo, index) => (
          <li key={promo.id}>
            <PromotionCard promotion={promo} eager={index < 2} />
          </li>
        ))}
      </ul>
    </section>
  )
}
