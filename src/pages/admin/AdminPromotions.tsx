import { useState } from 'react'
import { Button } from '@/components/Button'
import { ProductImage } from '@/components/ProductImage'
import { EmptyState, ErrorState, Skeleton } from '@/components/States'
import {
  AdminCard,
  Field,
  FormError,
} from '@/features/admin/FormControls'
import { ImageSourcePicker } from '@/features/admin/ImageSourcePicker'
import { useAdminToast } from '@/features/admin/AdminToast'
import {
  createPromotion,
  deletePromotion,
  fetchAdminPromotions,
  resolvePromotionImageUrl,
  updatePromotion,
} from '@/data/adminPromotions'
import type { Promotion } from '@/lib/domain'
import {
  addDaysToIsoDate,
  daysUntilDate,
  formatDate,
  remainingDaysLabel,
  todayInQuito,
} from '@/lib/format'
import { promotionFormSchema, validateFields } from '@/lib/validation'
import { useAsync } from '@/lib/useAsync'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

const END_SHORTCUTS = [3, 7, 15, 30] as const

type Scope = 'active' | 'expired'

function emptyForm() {
  const today = todayInQuito()
  return {
    title: '',
    description: '',
    price_label: '',
    end_date: addDaysToIsoDate(today, 7),
    start_date: today,
  }
}

export default function AdminPromotions() {
  useDocumentMeta({ title: 'Combos y promociones | Administración', noIndex: true })
  const toast = useAdminToast()

  const [scope, setScope] = useState<Scope>('active')
  const list = useAsync(() => fetchAdminPromotions(scope), [scope])

  const [editing, setEditing] = useState<Promotion | 'new' | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [urlValue, setUrlValue] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const current = editing !== 'new' && editing !== null ? editing : null

  const openNew = () => {
    setEditing('new')
    setForm(emptyForm())
    setFile(null)
    setUrlValue('')
    setFormError(null)
    setFieldErrors({})
  }

  const openEdit = (promotion: Promotion, reactivate = false) => {
    const today = todayInQuito()
    setEditing(promotion)
    setForm({
      title: promotion.title,
      description: promotion.description ?? '',
      price_label: promotion.priceLabel ?? '',
      start_date: reactivate ? today : promotion.startDate,
      end_date: reactivate
        ? addDaysToIsoDate(today, 7)
        : promotion.endDate,
    })
    setFile(null)
    setUrlValue('')
    setFormError(null)
    setFieldErrors({})
  }

  const closeForm = () => {
    setEditing(null)
    setFile(null)
    setUrlValue('')
    setFormError(null)
    setFieldErrors({})
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setBusy(true)

    try {
      const image_url = await resolvePromotionImageUrl({
        file,
        url: urlValue,
        fallbackUrl: current?.imageUrl,
      })

      const payload = {
        ...form,
        image_url,
      }
      const checked = validateFields(promotionFormSchema, payload)
      if (!checked.ok) {
        setFieldErrors(checked.errors)
        setFormError('Revisa los campos marcados.')
        return
      }
      setFieldErrors({})

      if (current) {
        await updatePromotion(current.id, checked.data)
        toast.success(`Listo: se guardó "${checked.data.title}".`)
      } else {
        await createPromotion(checked.data)
        toast.success(`Listo: se publicó "${checked.data.title}".`)
      }
      closeForm()
      list.reload()
      setScope('active')
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo guardar.'
      setFormError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (promotion: Promotion) => {
    if (!window.confirm(`¿Borrar "${promotion.title}"?`)) return
    try {
      await deletePromotion(promotion)
      if (current?.id === promotion.id) closeForm()
      toast.success(`Se borró "${promotion.title}".`)
      list.reload()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo borrar.'
      setFormError(message)
      toast.error(message)
    }
  }

  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink-900 text-2xl font-extrabold">
            Combos y promociones
          </h1>
          <p className="text-ink-600 mt-1 max-w-2xl text-sm">
            Ofertas temporales con la imagen que diseña papá. No son productos
            del catálogo: el cliente pide el combo por WhatsApp y enseña la
            foto en el local.
          </p>
        </div>
        <Button type="button" onClick={openNew}>
          Nueva promoción
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Vigencia"
        className="border-ink-100 flex w-fit flex-wrap gap-1 rounded-lg border p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'active'}
          onClick={() => setScope('active')}
          className={
            scope === 'active'
              ? 'bg-brand-600 rounded-md px-3 py-2 text-sm font-semibold text-white'
              : 'text-ink-700 hover:bg-ink-50 rounded-md px-3 py-2 text-sm font-semibold'
          }
        >
          Activas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'expired'}
          onClick={() => setScope('expired')}
          className={
            scope === 'expired'
              ? 'bg-brand-600 rounded-md px-3 py-2 text-sm font-semibold text-white'
              : 'text-ink-700 hover:bg-ink-50 rounded-md px-3 py-2 text-sm font-semibold'
          }
        >
          Expiradas
        </button>
      </div>

      {editing ? (
        <AdminCard
          title={current ? `Editar: ${current.title}` : 'Nueva promoción'}
          description="La promoción aparece en el Home hasta el día de fin (incluido)."
        >
          <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
            <Field
              label="Título"
              htmlFor="promo-title"
              error={fieldErrors.title}
            >
              <input
                id="promo-title"
                className="admin-input"
                value={form.title}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    title: event.target.value,
                  }))
                }
                maxLength={120}
                required
              />
            </Field>

            <Field
              label="Descripción"
              htmlFor="promo-description"
              hint="Opcional. Una o dos frases."
              error={fieldErrors.description}
            >
              <textarea
                id="promo-description"
                className="admin-input min-h-24"
                value={form.description}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    description: event.target.value,
                  }))
                }
                maxLength={280}
              />
            </Field>

            <Field
              label="Precio (texto libre)"
              htmlFor="promo-price"
              hint='Ejemplos: "$45", "Desde $30", "2x1". No está atado al inventario.'
              error={fieldErrors.price_label}
            >
              <input
                id="promo-price"
                className="admin-input"
                value={form.price_label}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    price_label: event.target.value,
                  }))
                }
                maxLength={40}
              />
            </Field>

            <div>
              <p className="text-ink-800 mb-1.5 text-sm font-semibold">Imagen</p>
              <ImageSourcePicker
                currentUrl={current?.imageUrl}
                file={file}
                onFile={setFile}
                urlValue={urlValue}
                onUrlChange={setUrlValue}
                busy={busy}
                cropPreset="promo"
              />
              {fieldErrors.image_url ? (
                <p className="mt-1 text-xs font-semibold text-red-700">
                  {fieldErrors.image_url}
                </p>
              ) : null}
            </div>

            <Field
              label="Fecha de fin"
              htmlFor="promo-end"
              error={fieldErrors.end_date}
            >
              <input
                id="promo-end"
                type="date"
                className="admin-input"
                value={form.end_date}
                min={form.start_date}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    end_date: event.target.value,
                  }))
                }
                required
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {END_SHORTCUTS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        end_date: addDaysToIsoDate(todayInQuito(), days),
                      }))
                    }
                    className="border-ink-200 hover:border-brand-600 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  >
                    +{days} días
                  </button>
                ))}
              </div>
            </Field>

            {formError ? <FormError>{formError}</FormError> : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'Guardando…' : current ? 'Guardar cambios' : 'Publicar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={closeForm}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </AdminCard>
      ) : null}

      {list.loading && !list.data ? (
        <Skeleton className="h-40" />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          title={
            scope === 'active'
              ? 'No hay promociones vigentes'
              : 'No hay promociones expiradas'
          }
          description={
            scope === 'active'
              ? 'Crea una para que aparezca en el inicio del sitio hasta la fecha de fin.'
              : 'Las que venzan se archivan aquí. Puedes reactivarlas cambiando la fecha de fin.'
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(list.data ?? []).map((promotion) => {
            const days = daysUntilDate(promotion.endDate)
            return (
              <li
                key={promotion.id}
                className="border-ink-100 flex gap-3 overflow-hidden rounded-lg border bg-white p-3"
              >
                <div className="bg-ink-50 size-24 shrink-0 overflow-hidden rounded-md">
                  <ProductImage
                    url={promotion.imageUrl}
                    alt=""
                    className="size-full"
                    sizes="96px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-ink-900 font-bold">{promotion.title}</p>
                  {promotion.priceLabel ? (
                    <p className="text-brand-700 text-sm font-semibold">
                      {promotion.priceLabel}
                    </p>
                  ) : null}
                  <p className="text-ink-500 mt-1 text-xs">
                    {scope === 'active'
                      ? remainingDaysLabel(days)
                      : `Venció el ${formatDate(promotion.endDate)}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                    {scope === 'active' ? (
                      <button
                        type="button"
                        className="text-brand-700 underline"
                        onClick={() => openEdit(promotion)}
                      >
                        Editar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-brand-700 underline"
                        onClick={() => openEdit(promotion, true)}
                      >
                        Reactivar
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-red-700 underline"
                      onClick={() => void remove(promotion)}
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
