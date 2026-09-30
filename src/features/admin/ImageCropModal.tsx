import { useCallback, useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { Button } from '@/components/Button'
import { FormError } from './FormControls'
import {
  CROP_PRESETS,
  cropToJpeg,
  cropToPreviewUrl,
  type CropPreset,
} from '@/lib/cropImage'
import { MAX_IMAGE_BYTES } from '@/lib/images'

/**
 * Editor de recorte antes de subir. Cada preset tiene su propia relacion de
 * aspecto y una previa del dispositivo donde se vera.
 */
export function ImageCropModal({
  imageSrc,
  preset,
  fileName,
  onCancel,
  onConfirm,
}: {
  imageSrc: string
  preset: CropPreset
  fileName: string
  onCancel: () => void
  onConfirm: (file: File) => void | Promise<void>
}) {
  const config = CROP_PRESETS[preset]
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setArea(pixels)
  }, [])

  useEffect(() => {
    if (!area) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void cropToPreviewUrl(imageSrc, area).then((url) => {
        if (!cancelled) setPreviewUrl(url)
      })
    }, 120)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [area, imageSrc])

  const confirm = async () => {
    if (!area) return
    setError(null)
    setBusy(true)
    try {
      const file = await cropToJpeg(
        imageSrc,
        area,
        config.maxEdge,
        MAX_IMAGE_BYTES,
      )
      await onConfirm(file)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo recortar.')
      setBusy(false)
    }
  }

  const isHeroDesktop = preset === 'heroDesktop' || preset === 'hero'
  const isHeroMobile = preset === 'heroMobile'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/70 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-title"
    >
      <div className="flex max-h-[95dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="border-ink-100 border-b px-4 py-3 sm:px-5">
          <h2 id="crop-title" className="text-ink-900 text-lg font-extrabold">
            Ajusta la imagen — {config.label}
          </h2>
          <p className="text-ink-600 mt-0.5 text-sm">
            {config.hint} Ideal: <strong>{config.recommend}</strong>. Archivo:{' '}
            {fileName}
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="relative h-64 overflow-hidden rounded-xl bg-ink-900 sm:h-80">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={config.aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
              showGrid
            />
          </div>

          <label className="text-ink-800 mt-4 flex items-center gap-3 text-sm font-semibold">
            Acercar
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="accent-brand-600 w-full"
            />
          </label>

          {isHeroDesktop || isHeroMobile ? (
            <div className="mt-5">
              <p className="text-ink-800 text-sm font-bold">
                Así se verá en el inicio
              </p>
              <div className="mt-3 max-w-sm">
                <DevicePreview
                  label={isHeroMobile ? 'Celular' : 'Computador'}
                  frameClass={
                    isHeroMobile
                      ? 'aspect-[4/5] max-w-[12rem]'
                      : 'aspect-[21/9] w-full'
                  }
                  previewUrl={previewUrl}
                />
              </div>
            </div>
          ) : null}

          {preset === 'gallery' ? (
            <div className="mt-5">
              <p className="text-ink-800 text-sm font-bold">
                Vista en el carrusel de Nosotros
              </p>
              <div className="border-ink-100 mt-2 max-w-sm overflow-hidden rounded-lg border bg-white shadow-sm">
                <div className="aspect-[16/10] bg-ink-50">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {preset === 'product' || preset === 'logo' ? (
            <div className="mt-5">
              <p className="text-ink-800 text-sm font-bold">
                {preset === 'logo' ? 'Vista del logo' : 'Vista de tarjeta'}
              </p>
              <div className="border-ink-100 mt-2 w-36 overflow-hidden rounded-lg border bg-white shadow-sm">
                <div className="aspect-square bg-ink-50">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                {preset === 'product' ? (
                  <p className="text-ink-700 truncate px-2 py-1.5 text-xs font-semibold">
                    Tu producto
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4">
              <FormError>{error}</FormError>
            </div>
          ) : null}
        </div>

        <footer className="border-ink-100 flex flex-wrap justify-end gap-2 border-t px-4 py-3 sm:px-5">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={busy || !area}
            onClick={() => void confirm()}
          >
            {busy ? 'Preparando…' : 'Usar este recorte'}
          </Button>
        </footer>
      </div>
    </div>
  )
}

function DevicePreview({
  label,
  frameClass,
  previewUrl,
}: {
  label: string
  frameClass: string
  previewUrl: string | null
}) {
  return (
    <div>
      <p className="text-ink-600 mb-1.5 text-xs font-semibold uppercase tracking-wide">
        {label}
      </p>
      <div
        className={`border-ink-200 relative overflow-hidden rounded-lg border bg-ink-900 ${frameClass}`}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <div
          className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/55 to-ink-950/15"
          aria-hidden="true"
        />
        <p className="absolute bottom-2 left-2 right-2 text-[0.65rem] font-bold leading-snug text-white drop-shadow">
          Todo para tu obra…
        </p>
      </div>
    </div>
  )
}
