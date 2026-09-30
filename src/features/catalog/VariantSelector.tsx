import { useEffect, useMemo, useState } from 'react'
import { variantLabel } from '@/lib/format'
import { AvailabilityBadge } from '@/components/AvailabilityBadge'
import { formatPrice } from '@/lib/format'
import type { Variant } from '@/lib/domain'

type AxisKey = 'size' | 'color' | 'presentation' | 'sale_unit'

const axisLabels: Record<AxisKey, string> = {
  size: 'Medida',
  color: 'Color',
  presentation: 'Presentación',
  sale_unit: 'Forma de venta',
}

const axisOrder: AxisKey[] = ['size', 'color', 'presentation', 'sale_unit']

type Selection = Partial<Record<AxisKey, string>>

function valuesOf(variants: Variant[], axis: AxisKey): string[] {
  return Array.from(
    new Set(
      variants
        .map((variant) => variant[axis])
        .filter((value): value is string => Boolean(value && value.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
}

function matches(variant: Variant, selection: Selection): boolean {
  return axisOrder.every((axis) => {
    const wanted = selection[axis]
    return wanted === undefined || variant[axis] === wanted
  })
}

/**
 * Solo muestra los selectores que esa familia realmente usa: una carretilla
 * sin medida ni color no muestra ningun desplegable.
 */
export function VariantSelector({
  variants,
  selected,
  onSelect,
}: {
  variants: Variant[]
  selected: Variant | null
  onSelect: (variant: Variant | null) => void
}) {
  const activeAxes = useMemo(
    () => axisOrder.filter((axis) => valuesOf(variants, axis).length > 1),
    [variants],
  )

  const [selection, setSelection] = useState<Selection>({})

  // Arranca en la primera variante vendible para que el precio se vea de una.
  useEffect(() => {
    const preferred =
      variants.find((variant) => variant.availability === 'disponible') ??
      variants[0]
    if (!preferred) {
      onSelect(null)
      return
    }

    const initial: Selection = {}
    for (const axis of activeAxes) {
      const value = preferred[axis]
      if (value) initial[axis] = value
    }
    setSelection(initial)
    onSelect(preferred)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants])

  const choose = (axis: AxisKey, value: string) => {
    const next: Selection = { ...selection, [axis]: value }

    // Si la combinacion no existe, se descartan los ejes posteriores.
    let candidates = variants.filter((variant) => matches(variant, next))
    if (candidates.length === 0) {
      const relaxed: Selection = { [axis]: value }
      candidates = variants.filter((variant) => matches(variant, relaxed))
      for (const other of activeAxes) {
        if (other === axis) continue
        const value2 = candidates[0]?.[other]
        if (value2) relaxed[other] = value2
      }
      setSelection(relaxed)
      onSelect(candidates[0] ?? null)
      return
    }

    setSelection(next)
    onSelect(candidates[0])
  }

  if (variants.length === 0) return null

  // Una sola variante: no hay nada que elegir.
  if (variants.length === 1) {
    const only = variants[0]
    const label = variantLabel(only)
    return (
      <div className="border-ink-100 rounded-card border p-4">
        <p className="text-ink-500 text-xs font-semibold uppercase tracking-wide">
          Presentación
        </p>
        <p className="text-ink-900 mt-1 font-semibold">
          {label || only.sale_unit || 'Unidad'}
        </p>
      </div>
    )
  }

  // Varias variantes sin atributos que las distingan: lista explicita.
  if (activeAxes.length === 0) {
    return (
      <fieldset>
        <legend className="text-ink-900 mb-2 text-sm font-bold">
          Elige una opción
        </legend>
        <div className="space-y-2">
          {variants.map((variant) => (
            <label
              key={variant.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 ${
                selected?.id === variant.id
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-ink-200 hover:border-ink-300'
              }`}
            >
              <input
                type="radio"
                name="variante"
                checked={selected?.id === variant.id}
                onChange={() => onSelect(variant)}
                className="accent-brand-600 size-4"
              />
              <span className="text-ink-900 flex-1 text-sm font-semibold">
                {variantLabel(variant) || variant.sale_unit || 'Unidad'}
              </span>
              <span className="text-ink-700 text-sm font-bold">
                {variant.availability === 'consultar'
                  ? 'A consultar'
                  : formatPrice(variant.price)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  return (
    <div className="space-y-5">
      {activeAxes.map((axis) => {
        const values = valuesOf(variants, axis)
        const useChips = values.length <= 8

        return (
          <fieldset key={axis}>
            <legend className="text-ink-900 mb-2 text-sm font-bold">
              {axisLabels[axis]}
            </legend>

            {useChips ? (
              <div className="flex flex-wrap gap-2">
                {values.map((value) => {
                  const possible = variants.some((variant) =>
                    matches(variant, { ...selection, [axis]: value }),
                  )
                  const exists = variants.some((variant) => variant[axis] === value)
                  const isSelected = selection[axis] === value

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => choose(axis, value)}
                      disabled={!exists}
                      aria-pressed={isSelected}
                      className={`rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                          : possible
                            ? 'border-ink-200 text-ink-800 hover:border-ink-400'
                            : 'border-ink-100 text-ink-400'
                      }`}
                    >
                      {value}
                    </button>
                  )
                })}
              </div>
            ) : (
              <select
                value={selection[axis] ?? ''}
                onChange={(event) => choose(axis, event.target.value)}
                aria-label={axisLabels[axis]}
                className="border-ink-200 focus:border-brand-600 w-full rounded-lg border-2 bg-white px-3 py-3 font-semibold focus:outline-none"
              >
                <option value="" disabled>
                  Elige {axisLabels[axis].toLowerCase()}
                </option>
                {values.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            )}
          </fieldset>
        )
      })}

      {selected ? (
        <p className="text-ink-600 flex items-center gap-2 text-sm">
          Seleccionado:
          <span className="text-ink-900 font-semibold">
            {variantLabel(selected) || 'Unidad'}
          </span>
          <AvailabilityBadge availability={selected.availability} />
        </p>
      ) : null}
    </div>
  )
}
