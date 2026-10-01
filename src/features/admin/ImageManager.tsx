import { useRef, useState } from 'react'
import { useAdminToast } from './AdminToast'
import { AdminCard, Checkbox, FormError } from './FormControls'
import { ImageCropModal } from './ImageCropModal'
import { ProductImage } from '@/components/ProductImage'
import {
  addProductImageFromUrl,
  deleteProductImage,
  setPrimaryImage,
  uploadProductImage,
} from '@/data/admin'
import {
  sortProductImages,
  type ProductImage as ProductImageRow,
  type Variant,
} from '@/lib/domain'
import { variantFullLabel } from '@/lib/format'
import { readFileAsDataUrl, validateSourceImage } from '@/lib/cropImage'
import { productImageUrlSchema } from '@/lib/validation'

type Pending = { src: string; fileName: string; rest: File[] }
type EntryMode = 'file' | 'url'

/**
 * Imagenes del producto. Se puede subir un archivo (con recorte) o pegar una
 * URL https que se guarda tal cual en product_images.
 */
export function ImageManager({
  productId,
  images,
  variants,
  onChanged,
}: {
  productId: string
  images: ProductImageRow[]
  variants: Variant[]
  onChanged: () => void
}) {
  const toast = useAdminToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<EntryMode>('file')
  const [variantId, setVariantId] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)

  const [urlValue, setUrlValue] = useState('')
  const [urlPreviewOk, setUrlPreviewOk] = useState(true)
  const [savingUrl, setSavingUrl] = useState(false)

  const parsedUrl = productImageUrlSchema.safeParse(urlValue)
  const validUrl = parsedUrl.success ? parsedUrl.data : null
  const urlFieldError =
    urlValue.trim().length > 0 && !parsedUrl.success
      ? (parsedUrl.error.issues[0]?.message ?? 'URL no válida.')
      : null

  const startNext = async (files: File[]) => {
    const [next, ...rest] = files
    if (!next) {
      setPending(null)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const problem = validateSourceImage(next)
    if (problem) {
      setError(problem)
      toast.error(problem)
      await startNext(rest)
      return
    }

    setPending({
      src: await readFileAsDataUrl(next),
      fileName: next.name,
      rest,
    })
  }

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    await startNext(Array.from(files))
  }

  const confirmCrop = async (file: File) => {
    const remaining = pending?.rest ?? []
    setUploading(true)
    setPending(null)
    try {
      await uploadProductImage(productId, file, {
        variantId: variantId || null,
        isPrimary,
      })
      toast.success('Imagen subida. Ya se ve en el producto.')
      setIsPrimary(false)
      onChanged()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo subir.'
      setError(message)
      toast.error(message)
    } finally {
      setUploading(false)
      await startNext(remaining)
    }
  }

  const cancelCrop = async () => {
    const remaining = pending?.rest ?? []
    setPending(null)
    await startNext(remaining)
  }

  const saveFromUrl = async () => {
    setError(null)

    if (!validUrl) {
      const message =
        urlFieldError ?? 'Pega una dirección https válida de la imagen.'
      setError(message)
      toast.error(message)
      return
    }

    setSavingUrl(true)
    try {
      await addProductImageFromUrl(productId, validUrl, {
        variantId: variantId || null,
        isPrimary,
      })
      toast.success('Imagen guardada desde la URL.')
      setUrlValue('')
      setUrlPreviewOk(true)
      setIsPrimary(false)
      onChanged()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo guardar la URL.'
      setError(message)
      toast.error(message)
    } finally {
      setSavingUrl(false)
    }
  }

  const makePrimary = async (imageId: string) => {
    setError(null)
    try {
      await setPrimaryImage(productId, imageId)
      toast.success('Esta es ahora la imagen principal del catálogo.')
      onChanged()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo cambiar.'
      setError(message)
      toast.error(message)
    }
  }

  const remove = async (image: ProductImageRow) => {
    if (!window.confirm('¿Borrar esta imagen?')) return
    setError(null)
    try {
      await deleteProductImage(image.id, image.url)
      toast.success('Imagen borrada.')
      onChanged()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo borrar.'
      setError(message)
      toast.error(message)
    }
  }

  const sorted = sortProductImages(images)

  const busy = uploading || pending !== null || savingUrl

  return (
    <AdminCard
      title="Imágenes"
      description="Puedes subir un archivo (con recorte cuadrado) o pegar una URL https. La imagen principal es la de la tarjeta del catálogo."
    >
      {error ? (
        <div className="mb-4">
          <FormError>{error}</FormError>
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label="Cómo agregar la imagen"
        className="border-ink-100 mb-4 flex flex-wrap gap-2 rounded-lg border p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'file'}
          disabled={busy}
          onClick={() => {
            setMode('file')
            setError(null)
          }}
          className={
            mode === 'file'
              ? 'bg-brand-600 rounded-md px-3 py-2 text-sm font-semibold text-white'
              : 'text-ink-700 hover:bg-ink-50 rounded-md px-3 py-2 text-sm font-semibold'
          }
        >
          Subir archivo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'url'}
          disabled={busy}
          onClick={() => {
            setMode('url')
            setError(null)
          }}
          className={
            mode === 'url'
              ? 'bg-brand-600 rounded-md px-3 py-2 text-sm font-semibold text-white'
              : 'text-ink-700 hover:bg-ink-50 rounded-md px-3 py-2 text-sm font-semibold'
          }
        >
          Pegar URL
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label
            htmlFor="image-variant"
            className="text-ink-800 mb-1.5 block text-sm font-semibold"
          >
            Asociar a
          </label>
          <select
            id="image-variant"
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
            className="admin-input"
            disabled={busy}
          >
            <option value="">Todo el producto</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variantFullLabel(variant) || 'Variante única'}
              </option>
            ))}
          </select>
        </div>

        <div className="pb-1">
          <Checkbox
            id="image-is-primary"
            label="Marcar como imagen principal"
            checked={isPrimary}
            onChange={setIsPrimary}
            disabled={busy}
            tip="Si no marcas ninguna, la primera imagen del producto queda como principal."
          />
        </div>
      </div>

      {mode === 'file' ? (
        <div className="mt-4">
          <label
            htmlFor="image-file"
            className="text-ink-800 mb-1.5 block text-sm font-semibold"
          >
            Elegir imagen
          </label>
          <input
            id="image-file"
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            disabled={busy}
            onChange={(event) => void pick(event.target.files)}
            className="text-ink-700 file:border-ink-200 file:text-ink-800 hover:file:border-brand-600 block w-full text-sm file:mr-3 file:rounded-lg file:border file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold"
          />
          <p className="text-ink-500 mt-2 text-xs">
            JPG, PNG, WebP o AVIF. Se abre el editor para recortarla; el archivo
            final queda en menos de 3 MB.
            {uploading ? ' Subiendo…' : ''}
            {pending && pending.rest.length > 0
              ? ` Quedan ${pending.rest.length} por ajustar.`
              : ''}
          </p>
        </div>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void saveFromUrl()
          }}
        >
          <div>
            <label
              htmlFor="image-url"
              className="text-ink-800 mb-1.5 block text-sm font-semibold"
            >
              URL de la imagen
            </label>
            <input
              id="image-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://…"
              value={urlValue}
              disabled={busy}
              onChange={(event) => {
                setUrlValue(event.target.value)
                setUrlPreviewOk(true)
                setError(null)
              }}
              className="admin-input"
            />
            {urlFieldError ? (
              <p className="mt-1 text-xs font-semibold text-red-700">
                {urlFieldError}
              </p>
            ) : (
              <p className="text-ink-500 mt-1 text-xs">
                Se guarda el enlace tal cual, sin descargar ni subir al bucket.
              </p>
            )}
          </div>

          {validUrl ? (
            <div className="border-ink-100 max-w-xs overflow-hidden rounded-lg border">
              {urlPreviewOk ? (
                <img
                  src={validUrl}
                  alt="Vista previa de la URL"
                  className="aspect-square w-full object-cover"
                  onError={() => setUrlPreviewOk(false)}
                  onLoad={() => setUrlPreviewOk(true)}
                />
              ) : (
                <div className="bg-ink-50 text-ink-600 flex aspect-square items-center justify-center p-4 text-center text-xs">
                  No se pudo cargar la vista previa. Revisa que el enlace sea
                  público y apunte a una imagen.
                </div>
              )}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy || !validUrl}
            className="bg-brand-600 hover:bg-brand-700 disabled:bg-ink-200 disabled:text-ink-500 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed"
          >
            {savingUrl ? 'Guardando…' : 'Guardar imagen desde URL'}
          </button>
        </form>
      )}

      {sorted.length > 0 ? (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((image) => {
            const variant = variants.find((v) => v.id === image.variant_id)

            return (
              <li
                key={image.id}
                className="border-ink-100 overflow-hidden rounded-lg border"
              >
                <ProductImage
                  url={image.url}
                  alt="Imagen del producto"
                  className="aspect-square w-full"
                  sizes="150px"
                />
                <div className="space-y-1.5 p-2">
                  {image.is_primary ? (
                    <p className="text-brand-800 text-xs font-bold">Principal</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void makePrimary(image.id)}
                      className="text-brand-700 text-xs font-semibold underline"
                    >
                      Hacer principal
                    </button>
                  )}
                  <p className="text-ink-500 truncate text-xs">
                    {variant
                      ? variantFullLabel(variant) || 'Variante única'
                      : 'Todo el producto'}
                  </p>
                  <button
                    type="button"
                    onClick={() => void remove(image)}
                    className="text-xs font-semibold text-red-700 underline"
                  >
                    Borrar
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {pending ? (
        <ImageCropModal
          imageSrc={pending.src}
          preset="product"
          fileName={pending.fileName}
          onCancel={() => void cancelCrop()}
          onConfirm={confirmCrop}
        />
      ) : null}
    </AdminCard>
  )
}
