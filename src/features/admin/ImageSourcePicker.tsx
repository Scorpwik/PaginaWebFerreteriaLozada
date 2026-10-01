import { useEffect, useRef, useState } from 'react'
import { ImageCropModal } from './ImageCropModal'
import { ProductImage } from '@/components/ProductImage'
import { readFileAsDataUrl, validateSourceImage } from '@/lib/cropImage'
import type { CropPreset } from '@/lib/cropImage'
import { productImageUrlSchema } from '@/lib/validation'

type EntryMode = 'file' | 'url'

/**
 * Selector dual archivo + URL https, el mismo patrón que las imágenes de
 * producto. El recorte se hace aquí; quien llama decide si sube al bucket
 * o guarda el enlace.
 */
export function ImageSourcePicker({
  currentUrl,
  file,
  onFile,
  urlValue,
  onUrlChange,
  busy = false,
  cropPreset = 'promo',
}: {
  currentUrl?: string | null
  file: File | null
  onFile: (file: File | null) => void
  urlValue: string
  onUrlChange: (url: string) => void
  busy?: boolean
  cropPreset?: CropPreset
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<EntryMode>(currentUrl ? 'url' : 'file')
  const [pendingSrc, setPendingSrc] = useState<{
    src: string
    fileName: string
  } | null>(null)
  const [pickError, setPickError] = useState<string | null>(null)
  const [urlPreviewOk, setUrlPreviewOk] = useState(true)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setFilePreview(null)
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setFilePreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const parsedUrl = productImageUrlSchema.safeParse(urlValue)
  const validUrl = parsedUrl.success ? parsedUrl.data : null
  const urlFieldError =
    urlValue.trim().length > 0 && !parsedUrl.success
      ? (parsedUrl.error.issues[0]?.message ?? 'URL no válida.')
      : null

  const previewUrl =
    filePreview ??
    (mode === 'url' && validUrl ? validUrl : null) ??
    currentUrl ??
    null

  const pick = async (files: FileList | null) => {
    const next = files?.[0]
    if (!next) return
    const problem = validateSourceImage(next)
    if (problem) {
      setPickError(problem)
      return
    }
    setPickError(null)
    setPendingSrc({
      src: await readFileAsDataUrl(next),
      fileName: next.name,
    })
  }

  return (
    <div>
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
          onClick={() => setMode('file')}
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
          onClick={() => setMode('url')}
          className={
            mode === 'url'
              ? 'bg-brand-600 rounded-md px-3 py-2 text-sm font-semibold text-white'
              : 'text-ink-700 hover:bg-ink-50 rounded-md px-3 py-2 text-sm font-semibold'
          }
        >
          Pegar URL
        </button>
      </div>

      {mode === 'file' ? (
        <div>
          <label
            htmlFor="promo-image-file"
            className="text-ink-800 mb-1.5 block text-sm font-semibold"
          >
            Elegir imagen
          </label>
          <input
            id="promo-image-file"
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={busy}
            onChange={(event) => void pick(event.target.files)}
            className="text-ink-700 file:border-ink-200 file:text-ink-800 hover:file:border-brand-600 block w-full text-sm file:mr-3 file:rounded-lg file:border file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold"
          />
          <p className="text-ink-500 mt-2 text-xs">
            JPG, PNG, WebP o AVIF. Se abre el editor para recortarla; el archivo
            final queda en menos de 3 MB.
          </p>
          {pickError ? (
            <p className="mt-1 text-xs font-semibold text-red-700">{pickError}</p>
          ) : null}
        </div>
      ) : (
        <div>
          <label
            htmlFor="promo-image-url"
            className="text-ink-800 mb-1.5 block text-sm font-semibold"
          >
            URL de la imagen
          </label>
          <input
            id="promo-image-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://…"
            value={urlValue}
            disabled={busy}
            onChange={(event) => {
              onUrlChange(event.target.value)
              onFile(null)
              setUrlPreviewOk(true)
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
      )}

      {previewUrl ? (
        <div className="border-ink-100 mt-4 max-w-xs overflow-hidden rounded-lg border">
          {mode === 'url' && validUrl && !urlPreviewOk ? (
            <div className="bg-ink-50 text-ink-600 flex aspect-[4/5] items-center justify-center p-4 text-center text-xs">
              No se pudo cargar la vista previa. Revisa que el enlace sea
              público y apunte a una imagen.
            </div>
          ) : (
            <ProductImage
              url={previewUrl}
              alt="Vista previa de la promoción"
              className="aspect-[4/5] w-full"
              sizes="320px"
            />
          )}
        </div>
      ) : null}

      {mode === 'url' && validUrl ? (
        <img
          src={validUrl}
          alt=""
          className="hidden"
          onError={() => setUrlPreviewOk(false)}
          onLoad={() => setUrlPreviewOk(true)}
        />
      ) : null}

      {pendingSrc ? (
        <ImageCropModal
          imageSrc={pendingSrc.src}
          preset={cropPreset}
          fileName={pendingSrc.fileName}
          onCancel={() => {
            setPendingSrc(null)
            if (inputRef.current) inputRef.current.value = ''
          }}
          onConfirm={(cropped) => {
            onFile(cropped)
            onUrlChange('')
            setPendingSrc(null)
            if (inputRef.current) inputRef.current.value = ''
          }}
        />
      ) : null}
    </div>
  )
}
