import { Link } from 'react-router-dom'
import { useSettings } from '@/features/settings/SettingsProvider'

/**
 * Todavia no hay logo definitivo. El espacio ya esta reservado: cuando
 * site_settings.logo_url tenga una imagen, entra sin tocar el layout.
 */
export function Logo({ className = '' }: { className?: string }) {
  const { businessName, logoUrl } = useSettings()

  return (
    <Link
      to="/"
      className={`flex shrink-0 items-center gap-2.5 ${className}`}
      aria-label={`${businessName}, ir al inicio`}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={businessName}
          className="h-10 w-auto max-w-[180px] object-contain"
        />
      ) : (
        <>
          <span className="bg-brand-600 grid size-10 place-items-center rounded-lg text-xl font-extrabold text-white">
            L
          </span>
          <span className="leading-none">
            <span className="text-ink-900 block text-base font-extrabold tracking-tight">
              Ferretería
            </span>
            <span className="text-brand-700 block text-base font-extrabold tracking-tight">
              Lozada
            </span>
          </span>
        </>
      )}
    </Link>
  )
}
