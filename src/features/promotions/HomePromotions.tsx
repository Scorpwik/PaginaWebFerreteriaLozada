import { ProductImage } from '@/components/ProductImage'
import { WhatsAppButton } from '@/features/whatsapp/WhatsAppButton'
import { promotionInquiryMessage } from '@/features/whatsapp/buildMessage'
import { fetchActivePromotions } from '@/data/promotions'
import { daysUntilDate, remainingDaysLabel } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'

/**
 * Combos vigentes. Si no hay ninguno, no se renderiza nada: el Home no debe
 * dejar un hueco ni un mensaje de "no hay promociones".
 */
export function HomePromotions() {
  const { data } = useAsync(fetchActivePromotions, [])
  if (!data || data.length === 0) return null

  return (
    <section className="container-page mt-16" aria-labelledby="promociones">
      <div className="mb-5">
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

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((promo, index) => {
          const days = daysUntilDate(promo.endDate)
          return (
            <li
              key={promo.id}
              data-reveal
              className="border-ink-100 rounded-card flex flex-col overflow-hidden border bg-white will-change-transform"
            >
              <div className="bg-ink-50 relative aspect-[4/5] overflow-hidden">
                <ProductImage
                  url={promo.imageUrl}
                  alt={promo.title}
                  eager={index < 2}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="size-full"
                />
                <span className="bg-brand-700 absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold text-white">
                  {remainingDaysLabel(days)}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-ink-900 text-base font-bold leading-snug">
                  {promo.title}
                </h3>
                {promo.description ? (
                  <p className="text-ink-600 text-sm leading-relaxed">
                    {promo.description}
                  </p>
                ) : null}
                {promo.priceLabel ? (
                  <p className="text-ink-900 text-lg font-extrabold">
                    {promo.priceLabel}
                  </p>
                ) : null}

                <WhatsAppButton
                  message={promotionInquiryMessage(promo.title)}
                  size="md"
                  className="mt-2 w-full"
                >
                  Solicitar combo
                </WhatsAppButton>
                <p className="text-ink-500 text-xs leading-relaxed">
                  Acércate con esta imagen para acceder a esta promoción
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
