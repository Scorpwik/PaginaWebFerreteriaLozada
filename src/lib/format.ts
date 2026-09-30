import type { Availability, VariantLike } from './domain'

const currency = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Precios muy bajos (un tornillo a $0.013) necesitan mas decimales. */
const currencySmall = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 3,
  maximumFractionDigits: 4,
})

export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '-'
  return value > 0 && value < 0.1 ? currencySmall.format(value) : currency.format(value)
}

export function formatMoney(value: number): string {
  return currency.format(Number.isFinite(value) ? value : 0)
}

const quantityFormatter = new Intl.NumberFormat('es-EC', {
  maximumFractionDigits: 2,
})

export function formatQuantity(value: number): string {
  return quantityFormatter.format(value)
}

export function formatDate(value: string | Date): string {
  // Un valor 'date' de Postgres llega como '2026-10-15' y Date lo interpreta a
  // medianoche UTC, que en Ecuador (UTC-5) es el dia anterior. Se formatea en
  // UTC para que la fecha de validez de la cotizacion coincida con la base.
  const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: dateOnly ? 'UTC' : undefined,
  }).format(date)
}

/**
 * Etiqueta legible de una variante, uniendo solo los atributos que existen.
 * Una carretilla sin medida ni color devuelve '' y la UI no muestra nada.
 */
export function variantLabel(variant: VariantLike): string {
  return [variant.size, variant.color, variant.presentation]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' / ')
}

/** Etiqueta completa incluyendo la forma de venta, para el PDF y WhatsApp. */
export function variantFullLabel(variant: VariantLike): string {
  const base = variantLabel(variant)
  if (!variant.sale_unit) return base
  return base ? `${base} (${variant.sale_unit})` : variant.sale_unit
}

export const availabilityLabels: Record<Availability, string> = {
  disponible: 'Disponible',
  agotado: 'Agotado',
  consultar: 'Consultar precio',
}

export function isAvailability(value: string): value is Availability {
  return value === 'disponible' || value === 'agotado' || value === 'consultar'
}

export function toAvailability(value: string): Availability {
  return isAvailability(value) ? value : 'consultar'
}

/** Slug para URLs amigables. El id real sigue viajando en la ruta. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
