import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { z } from 'zod'
import { Button } from '@/components/Button'
import { ErrorState, Skeleton } from '@/components/States'
import {
  AdminCard,
  Field,
  FormError,
  FormSuccess,
} from '@/features/admin/FormControls'
import { useAdminToast } from '@/features/admin/AdminToast'
import { useSettingsContext } from '@/features/settings/SettingsProvider'
import { ImageCropModal } from '@/features/admin/ImageCropModal'
import { uploadSiteImage } from '@/data/admin'
import { fetchRawSettings, parseSettings, updateSettings } from '@/data/settings'
import type { SiteSettings } from '@/data/settings'
import type { Json } from '@/lib/types.database'
import {
  IMAGE_SIZE_GUIDE,
  readFileAsDataUrl,
  validateSourceImage,
} from '@/lib/cropImage'
import type { CropPreset } from '@/lib/cropImage'
import {
  aboutGallerySchema,
  aboutSettingsSchema,
  brandSettingsSchema,
  contactSettingsSchema,
  heroSettingsSchema,
  processSettingsSchema,
  scheduleSettingsSchema,
  socialNetworks,
  socialSettingsSchema,
  validateFields,
} from '@/lib/validation'
import type { FieldErrors } from '@/lib/validation'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

/**
 * Editor de site_settings por grupos. Cada grupo es un formulario con campos
 * de verdad (nada de JSON crudo): valida con Zod y guarda solo sus claves.
 * Los subobjetos (horario, portada, SEO) se fusionan con lo que ya hay en la
 * base para no borrar claves que este formulario no conoce.
 */

type Raw = Record<string, Json>

function asRecord(value: Json | undefined): Raw {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Raw)
    : {}
}

/* ---------- Piezas de formulario ---------- */

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  multiline = false,
  rows = 4,
  inputMode,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  multiline?: boolean
  rows?: number
  inputMode?: 'numeric' | 'tel' | 'url'
}) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          className="admin-input"
        />
      ) : (
        <input
          id={id}
          value={value}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          className="admin-input"
        />
      )}
    </Field>
  )
}

/** Campo de URL de imagen: abre el editor de recorte y luego sube al bucket. */
function ImageUrlField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  cropPreset,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  cropPreset: CropPreset
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pending, setPending] = useState<{
    src: string
    fileName: string
  } | null>(null)

  const pick = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setUploadError(null)
    try {
      const problem = validateSourceImage(file)
      if (problem) throw new Error(problem)
      setPending({
        src: await readFileAsDataUrl(file),
        fileName: file.name,
      })
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : 'No se pudo leer.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const confirmCrop = async (file: File) => {
    setBusy(true)
    setPending(null)
    try {
      onChange(await uploadSiteImage(file))
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : 'No se pudo subir.')
    } finally {
      setBusy(false)
    }
  }

  const showPreview = /^https:\/\//i.test(value)

  return (
    <Field
      label={label}
      htmlFor={id}
      error={error ?? uploadError}
      hint={
        hint ??
        'Sube el archivo: se abre el editor para recortarla. Luego pulsa Guardar cambios en este bloque.'
      }
    >
      <input
        id={id}
        value={value}
        inputMode="url"
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className="admin-input"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={busy || pending !== null}
          aria-label={`Elegir archivo para ${label}`}
          onChange={(event) => void pick(event.target.files)}
          className="text-ink-700 file:border-ink-200 file:text-ink-800 hover:file:border-brand-600 text-sm file:mr-3 file:rounded-lg file:border file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold"
        />
        {busy ? <span className="text-ink-500 text-xs">Subiendo…</span> : null}
        {showPreview ? (
          <img
            src={value}
            alt=""
            className={`border-ink-100 rounded-lg border bg-white object-cover ${
              cropPreset === 'heroDesktop' || cropPreset === 'hero'
                ? 'h-14 w-36'
                : cropPreset === 'heroMobile'
                  ? 'h-20 w-16'
                  : cropPreset === 'gallery'
                    ? 'h-12 w-20'
                    : cropPreset === 'og'
                      ? 'h-14 w-28'
                      : 'size-14'
            }`}
          />
        ) : null}
      </div>

      {pending ? (
        <ImageCropModal
          imageSrc={pending.src}
          preset={cropPreset}
          fileName={pending.fileName}
          onCancel={() => setPending(null)}
          onConfirm={confirmCrop}
        />
      ) : null}
    </Field>
  )
}

function GroupCard({
  title,
  description,
  onSubmit,
  busy,
  formError,
  children,
}: {
  title: string
  description: string
  onSubmit: (event: React.FormEvent) => void
  busy: boolean
  formError: string | null
  children: ReactNode
}) {
  return (
    <AdminCard title={title} description={description}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {children}
        {formError ? <FormError>{formError}</FormError> : null}
        <Button type="submit" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </AdminCard>
  )
}

/**
 * Estado comun de un grupo plano (todos sus campos son texto): valores,
 * errores por campo, guardado y mensajes. Cada grupo solo declara su esquema
 * y como convertir lo validado en claves de site_settings.
 */
function useFlatGroup<S extends z.ZodType>({
  initial,
  schema,
  toEntries,
  onSaved,
}: {
  initial: Record<string, string>
  schema: S
  toEntries: (data: z.output<S>) => Record<string, Json>
  onSaved: () => Promise<void>
}) {
  const toast = useAdminToast()
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (key: string) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const result = validateFields(schema, values)
    if (!result.ok) {
      setErrors(result.errors)
      setFormError('Revisa los campos marcados.')
      toast.error('Revisa los campos marcados en rojo.')
      return
    }
    setErrors({})

    setBusy(true)
    try {
      await updateSettings(toEntries(result.data))
      toast.success('Cambios guardados. Ya se ven en el sitio.')
      await onSaved()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo guardar.'
      setFormError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return { values, errors, formError, busy, set, submit }
}

type GroupProps = {
  settings: SiteSettings
  raw: Raw
  onSaved: () => Promise<void>
}

/* ---------- Grupos ---------- */

function ContactGroup({ settings, onSaved }: GroupProps) {
  const form = useFlatGroup({
    initial: {
      business_name: settings.businessName,
      whatsapp_number: settings.whatsappNumber,
      whatsapp_display: settings.whatsappDisplay,
      address: settings.address,
      maps_embed_url: settings.mapsEmbedUrl,
      quote_validity_days: String(settings.quoteValidityDays),
    },
    schema: contactSettingsSchema,
    toEntries: (data) => ({ ...data }),
    onSaved,
  })
  const { values, errors, set } = form

  return (
    <GroupCard
      title="Negocio y contacto"
      description="El número de WhatsApp y la dirección se usan en el botón de cotizar, el pie de página y la sección Nosotros."
      onSubmit={(event) => void form.submit(event)}
      busy={form.busy}
      formError={form.formError}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="set-business"
          label="Nombre del negocio"
          value={values.business_name}
          onChange={set('business_name')}
          error={errors.business_name}
        />
        <TextField
          id="set-validity"
          label="Días de validez de la cotización"
          value={values.quote_validity_days}
          onChange={set('quote_validity_days')}
          error={errors.quote_validity_days}
          inputMode="numeric"
          hint="Las cotizaciones se borran solas pasado este tiempo."
        />
        <TextField
          id="set-wa-number"
          label="WhatsApp (para el enlace)"
          value={values.whatsapp_number}
          onChange={set('whatsapp_number')}
          error={errors.whatsapp_number}
          inputMode="tel"
          hint="Con código de país y sin signos. Ejemplo: 593995307272"
        />
        <TextField
          id="set-wa-display"
          label="WhatsApp (como se muestra)"
          value={values.whatsapp_display}
          onChange={set('whatsapp_display')}
          error={errors.whatsapp_display}
          hint="Ejemplo: +593 99 530 7272"
        />
      </div>
      <TextField
        id="set-address"
        label="Dirección"
        value={values.address}
        onChange={set('address')}
        error={errors.address}
      />
      <TextField
        id="set-maps"
        label="Enlace del mapa (Google Maps, modo insertar)"
        value={values.maps_embed_url}
        onChange={set('maps_embed_url')}
        error={errors.maps_embed_url}
        inputMode="url"
        hint="Si lo dejas vacío se usa el mapa por defecto."
      />
    </GroupCard>
  )
}

function ScheduleGroup({ settings, raw, onSaved }: GroupProps) {
  const form = useFlatGroup({
    initial: { ...settings.schedule },
    schema: scheduleSettingsSchema,
    toEntries: (data) => ({ schedule: { ...asRecord(raw.schedule), ...data } }),
    onSaved,
  })
  const { values, errors, set } = form

  return (
    <GroupCard
      title="Horario de atención"
      description="Escríbelo como quieres que lo lea el cliente."
      onSubmit={(event) => void form.submit(event)}
      busy={form.busy}
      formError={form.formError}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="set-weekdays"
          label="Lunes a viernes"
          value={values.weekdays}
          onChange={set('weekdays')}
          error={errors.weekdays}
        />
        <TextField
          id="set-saturday"
          label="Sábado"
          value={values.saturday}
          onChange={set('saturday')}
          error={errors.saturday}
        />
        <TextField
          id="set-sunday"
          label="Domingo"
          value={values.sunday}
          onChange={set('sunday')}
          error={errors.sunday}
        />
        <TextField
          id="set-holidays"
          label="Feriados"
          value={values.holidays}
          onChange={set('holidays')}
          error={errors.holidays}
        />
      </div>
    </GroupCard>
  )
}

function HeroGroup({ settings, raw, onSaved }: GroupProps) {
  const hero = settings.homeHero
  const form = useFlatGroup({
    initial: {
      title: hero.title,
      subtitle: hero.subtitle,
      image_desktop_url: hero.imageDesktopUrl,
      image_mobile_url: hero.imageMobileUrl,
      image_alt: hero.imageAlt,
      primary_cta: hero.primaryCta,
      secondary_cta: hero.secondaryCta,
    },
    schema: heroSettingsSchema,
    toEntries: (data) => ({
      home_hero: {
        ...asRecord(raw.home_hero),
        ...data,
        // Se deja image_url alineada al desktop por si algo viejo la lee.
        image_url: data.image_desktop_url,
      },
    }),
    onSaved,
  })
  const { values, errors, set } = form

  return (
    <GroupCard
      title="Portada del inicio"
      description="Sube una foto para computador y otra para celular. Así el local no se corta mal en ninguno."
      onSubmit={(event) => void form.submit(event)}
      busy={form.busy}
      formError={form.formError}
    >
      <TextField
        id="set-hero-title"
        label="Título"
        value={values.title}
        onChange={set('title')}
        error={errors.title}
      />
      <TextField
        id="set-hero-subtitle"
        label="Subtítulo"
        value={values.subtitle}
        onChange={set('subtitle')}
        error={errors.subtitle}
        multiline
        rows={3}
      />

      <div className="border-ink-100 rounded-lg border bg-ink-50/80 px-3 py-3 text-sm">
        <p className="text-ink-800 font-bold">Medidas recomendadas</p>
        <ul className="text-ink-600 mt-1.5 list-inside list-disc space-y-0.5 text-xs">
          <li>
            <strong>Computador:</strong> 1920 × 820 px (panorámica 21:9), JPG o
            WebP
          </li>
          <li>
            <strong>Celular:</strong> 1080 × 1350 px (vertical 4:5), JPG o WebP
          </li>
        </ul>
        <p className="text-ink-500 mt-2 text-xs">
          Si recortas antes en el celular o en el PC, súbelas ya listas. Si no,
          el editor del sitio te ayuda a recortar al subir.
        </p>
      </div>

      <ImageUrlField
        id="set-hero-desktop"
        label="Foto de portada — computador"
        value={values.image_desktop_url}
        onChange={set('image_desktop_url')}
        error={errors.image_desktop_url}
        cropPreset="heroDesktop"
        hint="Ideal 1920 × 820 px. Solo se muestra en pantallas grandes."
      />
      <ImageUrlField
        id="set-hero-mobile"
        label="Foto de portada — celular"
        value={values.image_mobile_url}
        onChange={set('image_mobile_url')}
        error={errors.image_mobile_url}
        cropPreset="heroMobile"
        hint="Ideal 1080 × 1350 px. Solo se muestra en el teléfono."
      />
      <TextField
        id="set-hero-alt"
        label="Descripción de las fotos"
        value={values.image_alt}
        onChange={set('image_alt')}
        error={errors.image_alt}
        hint="La leen los lectores de pantalla y aparece si la foto no carga."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="set-hero-cta1"
          label="Texto del botón principal"
          value={values.primary_cta}
          onChange={set('primary_cta')}
          error={errors.primary_cta}
        />
        <TextField
          id="set-hero-cta2"
          label="Texto del botón de WhatsApp"
          value={values.secondary_cta}
          onChange={set('secondary_cta')}
          error={errors.secondary_cta}
        />
      </div>
    </GroupCard>
  )
}

type StepDraft = { title: string; text: string }

function ProcessGroup({ settings, onSaved }: GroupProps) {
  const toast = useAdminToast()
  const [steps, setSteps] = useState<StepDraft[]>(() =>
    settings.homeProcess.map((step) => ({ ...step })),
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const update = (index: number, patch: Partial<StepDraft>) =>
    setSteps((current) =>
      current.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    )

  const move = (index: number, direction: -1 | 1) =>
    setSteps((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    // Un paso completamente vacio se descarta en vez de dar error.
    const filled = steps.filter((step) => step.title.trim() || step.text.trim())
    const result = validateFields(processSettingsSchema, filled)
    if (!result.ok) {
      setErrors(result.errors)
      setFormError('Revisa los pasos marcados.')
      toast.error('Revisa los pasos marcados.')
      return
    }
    setErrors({})

    setBusy(true)
    try {
      await updateSettings({ home_process: result.data })
      toast.success('Pasos del inicio guardados.')
      await onSaved()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo guardar.'
      setFormError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <GroupCard
      title="Cómo trabajamos (pasos del inicio)"
      description="Hasta 6 pasos cortos. Si no dejas ninguno, la sección no se muestra."
      onSubmit={(event) => void submit(event)}
      busy={busy}
      formError={formError}
    >
      {steps.length === 0 ? (
        <p className="text-ink-600 text-sm">Todavía no hay pasos.</p>
      ) : null}

      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li
            key={index}
            className="border-ink-100 bg-ink-50 space-y-3 rounded-lg border p-3"
          >
            <p className="text-ink-700 text-xs font-bold uppercase tracking-wide">
              Paso {index + 1}
            </p>
            <TextField
              id={`set-step-title-${index}`}
              label="Título"
              value={step.title}
              onChange={(value) => update(index, { title: value })}
              error={errors[`${index}.title`]}
            />
            <TextField
              id={`set-step-text-${index}`}
              label="Texto"
              value={step.text}
              onChange={(value) => update(index, { text: value })}
              error={errors[`${index}.text`]}
              multiline
              rows={2}
            />
            <div className="flex gap-4 text-sm font-semibold">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="text-brand-700 underline disabled:opacity-40"
              >
                Subir
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === steps.length - 1}
                className="text-brand-700 underline disabled:opacity-40"
              >
                Bajar
              </button>
              <button
                type="button"
                onClick={() =>
                  setSteps((current) => current.filter((_, i) => i !== index))
                }
                className="text-red-700 underline"
              >
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ol>

      {errors[''] ? <FormError>{errors['']}</FormError> : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={steps.length >= 6}
        onClick={() => setSteps((current) => [...current, { title: '', text: '' }])}
      >
        Añadir paso
      </Button>
    </GroupCard>
  )
}

function AboutGroup({ settings, onSaved }: GroupProps) {
  const form = useFlatGroup({
    initial: {
      about_history: settings.aboutHistory,
      about_coverage: settings.aboutCoverage,
    },
    schema: aboutSettingsSchema,
    toEntries: (data) => ({ ...data }),
    onSaved,
  })
  const { values, errors, set } = form

  return (
    <GroupCard
      title="Sección Nosotros — textos"
      description="Deja una línea en blanco entre párrafos. Las fotos van en el bloque de abajo."
      onSubmit={(event) => void form.submit(event)}
      busy={form.busy}
      formError={form.formError}
    >
      <TextField
        id="set-about-history"
        label="Historia"
        value={values.about_history}
        onChange={set('about_history')}
        error={errors.about_history}
        multiline
        rows={6}
      />
      <TextField
        id="set-about-coverage"
        label="Zonas y clientes que atendemos"
        value={values.about_coverage}
        onChange={set('about_coverage')}
        error={errors.about_coverage}
        multiline
        rows={4}
      />
    </GroupCard>
  )
}

type GalleryDraft = { url: string; alt: string; caption: string }

function AboutGalleryGroup({ settings, onSaved }: GroupProps) {
  const toast = useAdminToast()
  const [photos, setPhotos] = useState<GalleryDraft[]>(() =>
    settings.aboutGallery.map((item) => ({ ...item })),
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const update = (index: number, patch: Partial<GalleryDraft>) =>
    setPhotos((current) =>
      current.map((photo, i) => (i === index ? { ...photo, ...patch } : photo)),
    )

  const move = (index: number, direction: -1 | 1) =>
    setPhotos((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const result = validateFields(aboutGallerySchema, photos)
    if (!result.ok) {
      setErrors(result.errors)
      setFormError('Revisa las fotos marcadas.')
      toast.error('Revisa las fotos marcadas en rojo.')
      return
    }
    setErrors({})
    setBusy(true)
    try {
      await updateSettings({ about_gallery: result.data })
      toast.success('Galería guardada.')
      await onSaved()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo guardar.'
      setFormError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <GroupCard
      title="Sección Nosotros — fotos del local"
      description="Salen abajo en un carrusel horizontal. Sube las que tengas (1 a 8); no quedan huecos vacíos."
      onSubmit={(event) => void submit(event)}
      busy={busy}
      formError={formError}
    >
      <p className="text-ink-600 text-xs">
        Medida recomendada: <strong>1600 × 1000 px</strong> (horizontal 16:10),
        JPG o WebP.
      </p>

      <ul className="space-y-4">
        {photos.map((photo, index) => (
          <li
            key={`gallery-${index}`}
            className="border-ink-100 rounded-lg border bg-white p-3"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-ink-800 text-sm font-bold">
                Foto {index + 1}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-ink-600 hover:text-ink-900 text-xs font-semibold"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  Subir
                </button>
                <button
                  type="button"
                  className="text-ink-600 hover:text-ink-900 text-xs font-semibold"
                  disabled={index === photos.length - 1}
                  onClick={() => move(index, 1)}
                >
                  Bajar
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold text-red-700 hover:underline"
                  onClick={() =>
                    setPhotos((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                >
                  Quitar
                </button>
              </div>
            </div>

            <ImageUrlField
              id={`gallery-url-${index}`}
              label="Archivo"
              value={photo.url}
              onChange={(url) => update(index, { url })}
              error={errors[`${index}.url`]}
              cropPreset="gallery"
              hint="Se abre el editor de recorte horizontal (16:10)."
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <TextField
                id={`gallery-alt-${index}`}
                label="Descripción (obligatoria)"
                value={photo.alt}
                onChange={(alt) => update(index, { alt })}
                error={errors[`${index}.alt`]}
                hint="Ej: Fachada de Ferretería Lozada en Chillogallo"
              />
              <TextField
                id={`gallery-caption-${index}`}
                label="Pie de foto (opcional)"
                value={photo.caption}
                onChange={(caption) => update(index, { caption })}
                error={errors[`${index}.caption`]}
              />
            </div>
          </li>
        ))}
      </ul>

      {photos.length === 0 ? (
        <p className="text-ink-500 text-sm">
          Todavía no hay fotos. Añade una o más; en la página se verán al final,
          en fila horizontal.
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={photos.length >= 8}
        onClick={() =>
          setPhotos((current) => [
            ...current,
            { url: '', alt: '', caption: '' },
          ])
        }
      >
        Añadir foto
      </Button>
    </GroupCard>
  )
}

function ImageGuideCard() {
  return (
    <AdminCard
      title="Guía de medidas de fotos"
      description="Recorta antes si quieres, o usa el editor al subir. Formato: JPG o WebP (PNG para logo)."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="text-ink-500 border-ink-100 border-b text-xs uppercase tracking-wide">
              <th className="py-2 pr-3 font-semibold">Uso</th>
              <th className="py-2 pr-3 font-semibold">Medida</th>
              <th className="py-2 font-semibold">Formato</th>
            </tr>
          </thead>
          <tbody className="text-ink-800 divide-ink-100 divide-y">
            {IMAGE_SIZE_GUIDE.map((row) => (
              <tr key={row.use}>
                <td className="py-2.5 pr-3 font-medium">{row.use}</td>
                <td className="py-2.5 pr-3 font-mono text-xs">{row.size}</td>
                <td className="py-2.5 text-xs">{row.format}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  )
}

const socialLabels: Record<(typeof socialNetworks)[number], string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
}

function SocialGroup({ settings, raw, onSaved }: GroupProps) {
  const form = useFlatGroup({
    initial: Object.fromEntries(
      socialNetworks.map((name) => [name, settings.socialLinks[name] ?? '']),
    ),
    schema: socialSettingsSchema,
    toEntries: (data) => {
      // Se conservan las redes que este formulario no maneja (ej. YouTube).
      const others = Object.fromEntries(
        Object.entries(asRecord(raw.social_links)).filter(
          ([key]) => !(socialNetworks as readonly string[]).includes(key),
        ),
      )
      return { social_links: { ...others, ...data } }
    },
    onSaved,
  })
  const { values, errors, set } = form

  return (
    <GroupCard
      title="Redes sociales"
      description="Deja vacía la que no uses y no se mostrará."
      onSubmit={(event) => void form.submit(event)}
      busy={form.busy}
      formError={form.formError}
    >
      {socialNetworks.map((name) => (
        <TextField
          key={name}
          id={`set-social-${name}`}
          label={socialLabels[name]}
          value={values[name]}
          onChange={set(name)}
          error={errors[name]}
          inputMode="url"
          hint="Dirección completa, con https://"
        />
      ))}
    </GroupCard>
  )
}

function BrandGroup({ settings, raw, onSaved }: GroupProps) {
  const form = useFlatGroup({
    initial: {
      logo_url: settings.logoUrl,
      seo_title: settings.seo.title,
      seo_description: settings.seo.description,
      seo_og_image: settings.seo.ogImage,
    },
    schema: brandSettingsSchema,
    toEntries: (data) => ({
      logo_url: data.logo_url,
      seo: {
        ...asRecord(raw.seo),
        title: data.seo_title,
        description: data.seo_description,
        og_image: data.seo_og_image,
      },
    }),
    onSaved,
  })
  const { values, errors, set } = form

  return (
    <GroupCard
      title="Logo y Google"
      description="El logo aparece en el encabezado y en las cotizaciones. El título y la descripción son lo que se ve al buscar la ferretería en Google."
      onSubmit={(event) => void form.submit(event)}
      busy={form.busy}
      formError={form.formError}
    >
      <ImageUrlField
        id="set-logo"
        label="Logo"
        value={values.logo_url}
        onChange={set('logo_url')}
        error={errors.logo_url}
        cropPreset="logo"
      />
      <TextField
        id="set-seo-title"
        label="Título en Google"
        value={values.seo_title}
        onChange={set('seo_title')}
        error={errors.seo_title}
        hint="Hasta 70 caracteres."
      />
      <TextField
        id="set-seo-description"
        label="Descripción en Google"
        value={values.seo_description}
        onChange={set('seo_description')}
        error={errors.seo_description}
        multiline
        rows={3}
        hint="Hasta 200 caracteres."
      />
      <ImageUrlField
        id="set-og"
        label="Imagen al compartir el enlace"
        value={values.seo_og_image}
        onChange={set('seo_og_image')}
        error={errors.seo_og_image}
        cropPreset="og"
        hint="Se ve al compartir el sitio por WhatsApp o redes. Se abre el editor para recortarla."
      />
    </GroupCard>
  )
}

/* ---------- Pagina ---------- */

const groups: { id: string; Component: (props: GroupProps) => ReactNode }[] = [
  { id: 'contact', Component: ContactGroup },
  { id: 'schedule', Component: ScheduleGroup },
  { id: 'hero', Component: HeroGroup },
  { id: 'process', Component: ProcessGroup },
  { id: 'about', Component: AboutGroup },
  { id: 'about-gallery', Component: AboutGalleryGroup },
  { id: 'social', Component: SocialGroup },
  { id: 'brand', Component: BrandGroup },
]

export default function AdminSettings() {
  useDocumentMeta({ title: 'Ajustes | Administración', noIndex: true })

  const { reload: reloadSite } = useSettingsContext()
  const [raw, setRaw] = useState<Raw | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [versions, setVersions] = useState<Record<string, number>>({})
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      setRaw(await fetchRawSettings())
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const savedFor = (groupId: string) => async () => {
    // Primero se relee la base y despues se remonta el grupo, para que el
    // formulario muestre el valor ya limpio y guardado, no lo que se escribio.
    await load()
    reloadSite()
    setVersions((current) => ({ ...current, [groupId]: (current[groupId] ?? 0) + 1 }))
    setNotice('Cambios guardados. Ya se ven en el sitio.')
  }

  if (error) return <ErrorState error={error} onRetry={() => void load()} />

  if (!raw) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40" />
        ))}
      </div>
    )
  }

  const settings = parseSettings(
    Object.entries(raw).map(([key, value]) => ({ key, value })),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-ink-900 text-2xl font-extrabold">Ajustes del sitio</h1>
        <p className="text-ink-600 mt-1 text-sm">
          Cada bloque se guarda por separado. Nada de esto está escrito en el
          código: lo que cambies aquí cambia en la tienda.
        </p>
      </div>

      {notice ? <FormSuccess>{notice}</FormSuccess> : null}

      <ImageGuideCard />

      {groups.map(({ id, Component }) => (
        <Component
          key={`${id}-${versions[id] ?? 0}`}
          settings={settings}
          raw={raw}
          onSaved={savedFor(id)}
        />
      ))}
    </div>
  )
}
