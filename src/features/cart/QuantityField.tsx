import { useEffect, useState } from 'react'
import {
  MAX_QUANTITY,
  MIN_QUANTITY,
  normalizeQuantity,
  sanitizeQuantityDigits,
} from './cart'

type Props = {
  id?: string
  value: number
  onChange: (quantity: number) => void
  'aria-label'?: string
  'aria-describedby'?: string
  className?: string
  inputClassName?: string
}

/**
 * Cantidad entera positiva compartida por ficha de producto y carrito.
 * Mientras se escribe solo pasan dígitos; vacío o 0 al salir del campo → 1.
 */
export function QuantityField({
  id,
  value,
  onChange,
  className = '',
  inputClassName = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: Props) {
  const [text, setText] = useState(() => String(normalizeQuantity(value)))

  useEffect(() => {
    setText(String(normalizeQuantity(value)))
  }, [value])

  const commit = (raw: string) => {
    const digits = sanitizeQuantityDigits(raw)
    const next = normalizeQuantity(digits === '' ? 0 : Number(digits))
    setText(String(next))
    onChange(next)
  }

  const step = (delta: number) => {
    const current = normalizeQuantity(text === '' ? value : Number(text) || 0)
    const next = normalizeQuantity(current + delta)
    setText(String(next))
    onChange(next)
  }

  return (
    <div
      className={`border-ink-200 flex items-stretch overflow-hidden rounded-lg border-2 bg-white ${className}`}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        className="text-ink-700 hover:bg-ink-50 px-3 font-bold sm:px-4 sm:text-lg"
        aria-label="Quitar uno"
      >
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={text}
        onChange={(event) => {
          const digits = sanitizeQuantityDigits(event.target.value)
          setText(digits)
          if (digits !== '') {
            const parsed = Number(digits)
            if (Number.isFinite(parsed) && parsed >= MIN_QUANTITY) {
              onChange(normalizeQuantity(parsed))
            }
          }
        }}
        onBlur={() => commit(text)}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        className={`border-ink-200 w-16 border-x-2 py-2 text-center text-sm font-bold focus:outline-none sm:w-20 sm:py-3 sm:text-base ${inputClassName}`}
      />
      <button
        type="button"
        onClick={() => step(1)}
        className="text-ink-700 hover:bg-ink-50 px-3 font-bold sm:px-4 sm:text-lg"
        aria-label="Añadir uno"
        disabled={normalizeQuantity(value) >= MAX_QUANTITY}
      >
        +
      </button>
    </div>
  )
}
