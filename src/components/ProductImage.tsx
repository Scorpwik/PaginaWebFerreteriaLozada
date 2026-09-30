import { useState } from 'react'

const PLACEHOLDER = '/placeholder-tool.svg'

/**
 * Nunca muestra una imagen rota: si no hay url o la carga falla, cae al
 * placeholder de herramientas.
 */
export function ProductImage({
  url,
  alt,
  className = '',
  eager = false,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
}: {
  url: string | null
  alt: string
  className?: string
  eager?: boolean
  sizes?: string
}) {
  const [failed, setFailed] = useState(false)
  const source = !url || failed ? PLACEHOLDER : url
  const isPlaceholder = source === PLACEHOLDER

  return (
    <img
      src={source}
      alt={isPlaceholder ? `${alt} (sin imagen disponible)` : alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
      fetchPriority={eager ? 'high' : 'auto'}
      sizes={sizes}
      onError={() => setFailed(true)}
      className={`${isPlaceholder ? 'bg-ink-50 object-contain p-6' : 'object-cover'} ${className}`}
    />
  )
}
