import type { Availability } from '@/lib/domain'

/**
 * Los tres unicos estados que el sitio muestra. Nunca se publica una cantidad
 * numerica de stock.
 */
const styles: Record<Availability, { label: string; className: string }> = {
  disponible: {
    label: 'Disponible',
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
  agotado: {
    label: 'Agotado',
    className: 'bg-ink-100 text-ink-700 ring-ink-200',
  },
  consultar: {
    label: 'Consultar precio',
    className: 'bg-amber-50 text-amber-brand-dark ring-amber-200',
  },
}

export function AvailabilityBadge({
  availability,
  label,
  className = '',
}: {
  availability: Availability
  /** Texto propio (ej. "Agotado: 6x2"). Por defecto usa la etiqueta del estado. */
  label?: string
  className?: string
}) {
  const style = styles[availability]
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.className} ${className}`}
    >
      <span className="truncate">{label ?? style.label}</span>
    </span>
  )
}
