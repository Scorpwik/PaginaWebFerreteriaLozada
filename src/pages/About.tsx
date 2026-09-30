import { ButtonLink } from '@/components/Button'
import { WhatsAppButton } from '@/features/whatsapp/WhatsAppButton'
import { generalInquiryMessage } from '@/features/whatsapp/buildMessage'
import { AboutPhotoCarousel } from '@/features/about/AboutPhotoCarousel'
import { useSettings } from '@/features/settings/SettingsProvider'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

export function AboutPage() {
  const settings = useSettings()
  const hasGallery = settings.aboutGallery.length > 0

  useDocumentMeta({
    title: `Sobre nosotros | ${settings.businessName}`,
    description:
      'Ferretería Lozada, proyecto familiar en Chillogallo desde 2002. Dirección, horarios y contacto.',
  })

  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[{ label: 'Inicio', to: '/' }, { label: 'Sobre nosotros' }]}
      />

      <h1 className="text-ink-900 text-2xl font-extrabold tracking-tight sm:text-3xl">
        Un proyecto familiar que creció con el barrio
      </h1>

      {/*
        Movil: texto → visita → mapa → fotos.
        PC:    texto | visita
               fotos | mapa   (alineados, mas compacto).
      */}
      <div
        className={`mt-8 grid gap-8 lg:gap-x-12 lg:gap-y-8 ${
          hasGallery
            ? 'lg:grid-cols-[1.3fr_1fr] lg:grid-rows-[auto_auto]'
            : 'lg:grid-cols-[1.3fr_1fr]'
        }`}
      >
        <div className="order-1 lg:col-start-1 lg:row-start-1">
          {settings.aboutHistory ? (
            <div className="text-ink-700 space-y-4 text-[0.9375rem] leading-relaxed">
              {settings.aboutHistory.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          ) : null}

          {settings.aboutCoverage ? (
            <div className="rounded-card bg-sky-brand/50 border-sky-brand mt-8 border p-5">
              <h2 className="text-ink-900 text-sm font-bold uppercase tracking-wide">
                Dónde entregamos
              </h2>
              <p className="text-ink-700 mt-2 text-sm leading-relaxed">
                {settings.aboutCoverage}
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/catalogo" size="lg">
              Ver catálogo
            </ButtonLink>
            <WhatsAppButton message={generalInquiryMessage()} size="lg">
              Escríbenos
            </WhatsAppButton>
          </div>
        </div>

        <div className="border-ink-100 order-2 overflow-hidden rounded-card border lg:col-start-2 lg:row-start-1 lg:self-start">
          <h2 className="text-ink-900 border-ink-100 border-b px-5 py-4 text-sm font-bold uppercase tracking-wide">
            Visítanos
          </h2>

          <dl className="divide-ink-100 divide-y text-sm">
            <div className="px-5 py-4">
              <dt className="text-ink-500 text-xs font-semibold uppercase tracking-wide">
                Dirección
              </dt>
              <dd className="text-ink-900 mt-1 font-medium">{settings.address}</dd>
            </div>

            <div className="px-5 py-4">
              <dt className="text-ink-500 text-xs font-semibold uppercase tracking-wide">
                Horarios
              </dt>
              <dd className="text-ink-800 mt-1 space-y-0.5">
                <p>{settings.schedule.weekdays}</p>
                <p>Sábado: {settings.schedule.saturday}</p>
                <p>Domingo: {settings.schedule.sunday}</p>
                <p className="text-amber-brand-dark font-medium">
                  {settings.schedule.holidays}
                </p>
              </dd>
            </div>

            <div className="px-5 py-4">
              <dt className="text-ink-500 text-xs font-semibold uppercase tracking-wide">
                Teléfono / WhatsApp
              </dt>
              <dd className="mt-1">
                <a
                  href={`tel:+${settings.whatsappNumber}`}
                  className="text-brand-700 font-semibold hover:underline"
                >
                  {settings.whatsappDisplay}
                </a>
              </dd>
            </div>

            {Object.keys(settings.socialLinks).length > 0 ? (
              <div className="px-5 py-4">
                <dt className="text-ink-500 text-xs font-semibold uppercase tracking-wide">
                  Redes
                </dt>
                <dd className="mt-1 flex flex-wrap gap-3">
                  {Object.entries(settings.socialLinks).map(([name, url]) => (
                    <a
                      key={name}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-700 font-semibold capitalize hover:underline"
                    >
                      {name}
                    </a>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        {settings.mapsEmbedUrl ? (
          <div className="border-ink-100 order-3 overflow-hidden rounded-card border lg:col-start-2 lg:row-start-2 lg:h-full">
            <iframe
              src={settings.mapsEmbedUrl}
              title={`Ubicación de ${settings.businessName} en Google Maps`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-72 w-full border-0 lg:h-full lg:min-h-[16rem]"
            />
          </div>
        ) : null}

        {hasGallery ? (
          <div className="order-4 min-w-0 lg:col-start-1 lg:row-start-2 lg:self-stretch">
            <AboutPhotoCarousel
              photos={settings.aboutGallery}
              compact
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
