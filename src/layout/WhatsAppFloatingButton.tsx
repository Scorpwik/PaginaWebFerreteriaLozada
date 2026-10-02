import { WhatsAppIcon } from '@/features/whatsapp/WhatsAppButton'
import { useSettings } from '@/features/settings/SettingsProvider'
import { generalInquiryMessage, whatsappUrl } from '@/features/whatsapp/buildMessage'

/**
 * Burbuja de contacto general, fija en la esquina inferior derecha.
 * No reemplaza CTAs puntuales (consultar disponibilidad, solicitar combo, hero).
 */
export function WhatsAppFloatingButton() {
  const { whatsappNumber } = useSettings()

  return (
    <a
      href={whatsappUrl(whatsappNumber, generalInquiryMessage())}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Pedir por WhatsApp"
      className="fixed z-50 grid size-14 place-items-center rounded-full bg-[#1c8c4c] text-white shadow-lg shadow-ink-900/25 transition-transform hover:scale-105 hover:bg-[#166b3b] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c8c4c] focus-visible:ring-offset-2"
      style={{
        right: 'max(1rem, env(safe-area-inset-right))',
        bottom: 'max(1.25rem, calc(1rem + env(safe-area-inset-bottom)))',
      }}
    >
      <WhatsAppIcon className="size-7" />
    </a>
  )
}
