import { useState } from 'react'
import { Button } from '@/components/Button'
import { useAdminToast } from './AdminToast'
import { AdminCard, Field, FormError } from './FormControls'
import {
  createVariant,
  deleteVariant,
  patchVariant,
  updateVariant,
} from '@/data/admin'
import type { VariantFormValues } from '@/data/admin'
import type { Availability, Variant } from '@/lib/domain'
import { availabilityLabels, formatPrice, variantFullLabel } from '@/lib/format'

/**
 * Editor de variantes. Precio y disponibilidad se cambian en la misma tabla,
 * que es lo que la ferreteria hace todos los dias; el resto de campos se abre
 * en el formulario.
 */

const emptyVariant: VariantFormValues = {
  origin_id: null,
  size: null,
  color: null,
  presentation: null,
  sale_unit: null,
  price: 0,
  barcode: null,
  availability: 'disponible',
}

const availabilityOptions: Availability[] = ['disponible', 'agotado', 'consultar']

function toFormValues(variant: Variant): VariantFormValues {
  return {
    origin_id: variant.origin_id,
    size: variant.size,
    color: variant.color,
    presentation: variant.presentation,
    sale_unit: variant.sale_unit,
    price: variant.price,
    barcode: variant.barcode,
    availability: variant.availability,
  }
}

export function VariantEditor({
  productId,
  variants,
  onChanged,
}: {
  productId: string
  variants: Variant[]
  onChanged: () => void
}) {
  const toast = useAdminToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<VariantFormValues>(emptyVariant)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const openNew = () => {
    setError(null)
    setEditingId(null)
    setForm(emptyVariant)
    setCreating(true)
  }

  const openEdit = (variant: Variant) => {
    setError(null)
    setCreating(false)
    setEditingId(variant.id)
    setForm(toFormValues(variant))
  }

  const close = () => {
    setCreating(false)
    setEditingId(null)
    setError(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (editingId) {
        await updateVariant(editingId, form)
        toast.success('Variante actualizada.')
      } else {
        await createVariant(productId, form)
        toast.success('Variante añadida.')
      }
      close()
      onChanged()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo guardar.'
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const quickPatch = async (
    id: string,
    patch: { price?: number; availability?: Availability },
  ) => {
    setError(null)
    try {
      await patchVariant(id, patch)
      if (patch.price !== undefined) {
        toast.success(`Precio actualizado a ${formatPrice(patch.price)}.`)
      } else if (patch.availability) {
        toast.success(
          `Disponibilidad: ${availabilityLabels[patch.availability]}.`,
        )
      }
      onChanged()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo actualizar.'
      setError(message)
      toast.error(message)
      onChanged()
    }
  }

  const remove = async (variant: Variant) => {
    const label = variantFullLabel(variant) || 'esta variante'
    if (!window.confirm(`¿Borrar ${label}?`)) return
    setError(null)
    try {
      await deleteVariant(variant.id)
      if (editingId === variant.id) close()
      toast.success('Variante borrada.')
      onChanged()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo borrar.'
      setError(message)
      toast.error(message)
    }
  }

  return (
    <AdminCard
      title="Variantes"
      description="Medidas, colores y presentaciones con su precio. Un producto sin variantes no se puede pedir."
      actions={
        <Button type="button" size="sm" onClick={openNew}>
          Añadir variante
        </Button>
      }
    >
      {error ? (
        <div className="mb-4">
          <FormError>{error}</FormError>
        </div>
      ) : null}

      {variants.length === 0 && !creating ? (
        <p className="text-ink-600 text-sm">
          Este producto todavía no tiene variantes. Añade al menos una con su
          precio y forma de venta.
        </p>
      ) : (
        <ul className="divide-ink-100 divide-y">
          {variants.map((variant) => (
            <li key={variant.id} className="py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-ink-900 text-sm font-semibold">
                    {variantFullLabel(variant) || 'Variante única'}
                  </p>
                  <p className="text-ink-500 text-xs">
                    {variant.origin_id ? `Código ${variant.origin_id}` : 'Sin código'}
                    {variant.barcode ? ` · Barras ${variant.barcode}` : ''}
                  </p>
                </div>

                <label className="shrink-0">
                  <span className="sr-only">
                    Precio de {variantFullLabel(variant) || 'la variante'}
                  </span>
                  <input
                    // El key fuerza a releer el precio cuando cambia desde el
                    // formulario: defaultValue solo se aplica al montar.
                    key={`${variant.id}-${variant.price}`}
                    type="number"
                    step="0.0001"
                    min="0"
                    defaultValue={variant.price}
                    onBlur={(event) => {
                      const next = Number(event.target.value)
                      if (Number.isFinite(next) && next !== variant.price) {
                        void quickPatch(variant.id, { price: next })
                      }
                    }}
                    className="admin-input-sm w-28"
                  />
                </label>

                <label className="shrink-0">
                  <span className="sr-only">
                    Disponibilidad de {variantFullLabel(variant) || 'la variante'}
                  </span>
                  <select
                    value={variant.availability}
                    onChange={(event) =>
                      void quickPatch(variant.id, {
                        availability: event.target.value as Availability,
                      })
                    }
                    className="admin-input-sm w-36"
                  >
                    {availabilityOptions.map((option) => (
                      <option key={option} value={option}>
                        {availabilityLabels[option]}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex shrink-0 gap-3">
                  <button
                    type="button"
                    onClick={() => openEdit(variant)}
                    className="text-brand-700 text-sm font-semibold underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(variant)}
                    className="text-sm font-semibold text-red-700 underline"
                  >
                    Borrar
                  </button>
                </div>
              </div>

              {variant.availability === 'disponible' && variant.price <= 0 ? (
                <p className="text-amber-brand-dark mt-1.5 text-xs font-semibold">
                  Está marcada como disponible pero sin precio: el cliente no
                  podrá añadirla al carrito.
                </p>
              ) : null}

              {variant.availability !== 'consultar' && variant.price > 0 ? (
                <p className="text-ink-500 mt-1.5 text-xs">
                  Se muestra como {formatPrice(variant.price)}
                  {variant.sale_unit ? ` por ${variant.sale_unit}` : ''}.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {creating || editingId ? (
        <form
          onSubmit={(event) => void submit(event)}
          className="border-ink-100 mt-5 space-y-4 rounded-lg border bg-ink-50 p-4"
        >
          <p className="text-ink-900 text-sm font-bold">
            {editingId ? 'Editar variante' : 'Nueva variante'}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Medida"
              htmlFor="variant-size"
              hint="Ejemplo: 4x1, 1/2 pulgada"
            >
              <input
                id="variant-size"
                value={form.size ?? ''}
                onChange={(event) =>
                  setForm((c) => ({ ...c, size: event.target.value }))
                }
                className="admin-input"
              />
            </Field>

            <Field label="Color" htmlFor="variant-color">
              <input
                id="variant-color"
                value={form.color ?? ''}
                onChange={(event) =>
                  setForm((c) => ({ ...c, color: event.target.value }))
                }
                className="admin-input"
              />
            </Field>

            <Field
              label="Presentación"
              htmlFor="variant-presentation"
              hint="Ejemplo: Caja de 100, Saco"
            >
              <input
                id="variant-presentation"
                value={form.presentation ?? ''}
                onChange={(event) =>
                  setForm((c) => ({ ...c, presentation: event.target.value }))
                }
                className="admin-input"
              />
            </Field>

            <Field
              label="Forma de venta"
              htmlFor="variant-unit"
              hint="Ejemplo: unidad, metro, quintal"
            >
              <input
                id="variant-unit"
                value={form.sale_unit ?? ''}
                onChange={(event) =>
                  setForm((c) => ({ ...c, sale_unit: event.target.value }))
                }
                className="admin-input"
              />
            </Field>

            <Field
              label="Precio"
              htmlFor="variant-price"
              hint="Admite hasta 4 decimales, para artículos de centavos."
            >
              <input
                id="variant-price"
                type="number"
                step="0.0001"
                min="0"
                value={form.price}
                onChange={(event) =>
                  setForm((c) => ({ ...c, price: Number(event.target.value) }))
                }
                required
                className="admin-input"
              />
            </Field>

            <Field label="Disponibilidad" htmlFor="variant-availability">
              <select
                id="variant-availability"
                value={form.availability}
                onChange={(event) =>
                  setForm((c) => ({
                    ...c,
                    availability: event.target.value as Availability,
                  }))
                }
                className="admin-input"
              >
                {availabilityOptions.map((option) => (
                  <option key={option} value={option}>
                    {availabilityLabels[option]}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Código del sistema"
              htmlFor="variant-origin"
              hint="El ID producto de la facturación. Es el que usa el importador."
            >
              <input
                id="variant-origin"
                type="number"
                min="1"
                value={form.origin_id ?? ''}
                onChange={(event) =>
                  setForm((c) => ({
                    ...c,
                    origin_id: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
                className="admin-input"
              />
            </Field>

            <Field
              label="Código de barras"
              htmlFor="variant-barcode"
              hint="Solo informativo: puede repetirse entre productos."
            >
              <input
                id="variant-barcode"
                value={form.barcode ?? ''}
                onChange={(event) =>
                  setForm((c) => ({ ...c, barcode: event.target.value }))
                }
                className="admin-input"
              />
            </Field>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar variante'}
            </Button>
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </AdminCard>
  )
}
