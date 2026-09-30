import { ButtonAnchor } from '@/components/Button'
import { useSettings } from '@/features/settings/SettingsProvider'
import { whatsappUrl } from './buildMessage'
import type { ComponentProps, ReactNode } from 'react'

type Props = {
  message: string
  children: ReactNode
  variant?: ComponentProps<typeof ButtonAnchor>['variant']
  size?: ComponentProps<typeof ButtonAnchor>['size']
  className?: string
}

/** El numero siempre sale de site_settings, nunca escrito en el componente. */
export function WhatsAppButton({
  message,
  children,
  variant = 'whatsapp',
  size = 'md',
  className,
}: Props) {
  const { whatsappNumber } = useSettings()

  return (
    <ButtonAnchor
      href={whatsappUrl(whatsappNumber, message)}
      target="_blank"
      rel="noopener noreferrer"
      variant={variant}
      size={size}
      className={className}
    >
      <WhatsAppIcon />
      {children}
    </ButtonAnchor>
  )
}

export function WhatsAppIcon({ className = 'size-[1.125rem]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.966 1.164-.198.199-.396.223-.693.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.347-.446.52-.669.174-.223.232-.383.347-.638.116-.255.058-.478-.03-.669-.086-.19-.66-1.59-.904-2.178-.238-.571-.48-.617-.66-.626-.17-.008-.366-.01-.562-.01a1.08 1.08 0 0 0-.783.367c-.27.297-1.03 1.005-1.03 2.45 0 1.444 1.055 2.84 1.202 3.037.148.198 2.076 3.17 5.03 4.444.703.303 1.252.484 1.68.62.708.225 1.352.193 1.862.117.567-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.569-.347z" />
      <path d="M20.52 3.449A11.9 11.9 0 0 0 12.05 0C5.495 0 .16 5.334.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.892-11.893a11.82 11.82 0 0 0-3.366-8.451zM12 21.785h-.004a9.87 9.87 0 0 1-5.032-1.378l-.361-.214-3.741.981.999-3.648-.235-.374a9.86 9.86 0 0 1-1.511-5.26c.002-5.45 4.437-9.884 9.889-9.884a9.82 9.82 0 0 1 6.988 2.898 9.83 9.83 0 0 1 2.893 6.995c-.003 5.45-4.437 9.884-9.885 9.884z" />
    </svg>
  )
}
