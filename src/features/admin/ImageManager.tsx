import { useRef, useState } from 'react'
import { useAdminToast } from './AdminToast'
import { AdminCard, FormError } from './FormControls'
import { ImageCropModal } from './ImageCropModal'
import { ProductImage } from '@/components/ProductImage'
import {
  deleteProductImage,
  setPrimaryImage,
  uploadProductImage,
} from '@/data/admin'
import type { ProductImage as ProductImageRow, Variant } from '@/lib/domain'
import { variantFullLabel } from '@/lib/format'
import { readFileAsDataUrl, validateSourceImage } from '@/lib/cropImage'

type Pending = { src: string; fileName: string; rest: File[] }

/**
 * Imagenes del producto. Antes de subir se abre el editor de recorte (cuadrado,
 * como la tarjeta del catalogo) para no subir a ciegas.
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
  const [variantId, setVariantId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)

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
      })
      toast.success('Imagen subida. Ya se ve en el producto.')
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

  const sorted = [...images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  )

  const busy = uploading || pending !== null

  return (
    <AdminCard
      title="Imágenes"
      description="Antes de subirla podrás recortarla en cuadrado, como se ve en el catálogo. La imagen principal es la de la tarjeta."
    >
      {error ? (
        <div className="mb-4">
          <FormError>{error}</FormError>
        </div>
      ) : null}

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

        <div>
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
        </div>
      </div>

      <p className="text-ink-500 mt-2 text-xs">
        JPG, PNG, WebP o AVIF. Se abre el editor para recortarla; el archivo
        final queda en menos de 3 MB.
        {uploading ? ' Subiendo…' : ''}
        {pending && pending.rest.length > 0
          ? ` Quedan ${pending.rest.length} por ajustar.`
          : ''}
      </p>

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
