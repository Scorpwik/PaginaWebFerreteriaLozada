import { ProductImage } from '@/components/ProductImage'
import { WhatsAppButton } from '@/features/whatsapp/WhatsAppButton'
import { promotionInquiryMessage } from '@/features/whatsapp/buildMessage'
import { daysUntilDate, remainingDaysLabel } from '@/lib/format'
import type { Promotion } from '@/lib/domain'

export function PromotionCard({
  promotion,
  eager = false,
}: {
  promotion: Promotion
  eager?: boolean
}) {
  const days = daysUntilDate(promotion.endDate)

  return (
    <article
      data-reveal
      className="card-hover-desktop border-ink-100 rounded-card group focus-within:ring-brand-600 relative flex flex-col overflow-hidden border bg-white will-change-transform focus-within:ring-2"
    >
      <div className="bg-ink-50 relative h-[220px] overflow-hidden md:h-[260px] lg:h-[280px]">
        <ProductImage
          url={promotion.imageUrl}
          alt={promotion.title}
          eager={eager}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="size-full max-h-[220px] object-cover md:max-h-[260px] lg:max-h-[280px] lg:transition-transform lg:duration-500 lg:group-hover:scale-105"
        />
        <span className="bg-brand-700 absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold text-white">
          {remainingDaysLabel(days)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-ink-900 text-sm font-semibold leading-snug">
          {promotion.title}
        </h3>
        {promotion.description ? (
          <p className="text-ink-600 text-sm leading-relaxed">
            {promotion.description}
          </p>
        ) : null}
        {promotion.priceLabel ? (
          <p className="text-ink-900 font-bold">{promotion.priceLabel}</p>
        ) : null}

        <WhatsAppButton
          message={promotionInquiryMessage(promotion.title)}
          size="md"
          className="mt-2 w-full"
        >
          Solicitar combo
        </WhatsAppButton>
        <p className="text-ink-500 text-xs leading-relaxed">
          Acércate con esta imagen para acceder a esta promoción
        </p>
      </div>
    </article>
  )
}
