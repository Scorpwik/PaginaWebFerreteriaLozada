import { useEffect, useId, useRef } from 'react'
import type { AboutGalleryItem } from '@/data/settings'

type Props = {
  photos: AboutGalleryItem[]
  index: number
  onClose: () => void
  onChange: (index: number) => void
}

/**
 * Visor a pantalla completa para las fotos de Nosotros.
 * Celular: botones grandes, gestos de teclado no hacen falta; PC: flechas + Esc.
 */
export function PhotoLightbox({ photos, index, onClose, onChange }: Props) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const touchStartX = useRef<number | null>(null)
  const photo = photos[index]

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') {
        onChange((index - 1 + photos.length) % photos.length)
      }
      if (event.key === 'ArrowRight') {
        onChange((index + 1) % photos.length)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [index, onChange, onClose, photos.length])

  if (!photo) return null

  const goPrev = () => onChange((index - 1 + photos.length) % photos.length)
  const goNext = () => onChange((index + 1) % photos.length)
  const showNav = photos.length > 1

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink-950/95"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <header className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
        <p id={titleId} className="text-sm font-semibold text-white/90">
          {index + 1} / {photos.length}
          {photo.caption ? (
            <span className="text-white/70 font-medium">
              {' '}
              · {photo.caption}
            </span>
          ) : null}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="grid size-11 shrink-0 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"
          aria-label="Cerrar foto"
        >
          <CloseIcon />
        </button>
      </header>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-14"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => {
          touchStartX.current = event.changedTouches[0]?.clientX ?? null
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current == null || !showNav) return
          const endX = event.changedTouches[0]?.clientX ?? touchStartX.current
          const delta = endX - touchStartX.current
          touchStartX.current = null
          if (Math.abs(delta) < 50) return
          if (delta > 0) goPrev()
          else goNext()
        }}
      >
        {showNav ? (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:grid"
            aria-label="Foto anterior"
          >
            <Chevron direction="left" />
          </button>
        ) : null}

        <figure className="flex max-h-full max-w-full flex-col items-center">
          <img
            src={photo.url}
            alt={photo.alt}
            className="max-h-[min(78dvh,860px)] max-w-full rounded-lg object-contain shadow-2xl"
          />
          <figcaption className="mt-3 max-w-xl px-4 text-center text-sm text-white/85">
            {photo.alt}
          </figcaption>
        </figure>

        {showNav ? (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:grid"
            aria-label="Foto siguiente"
          >
            <Chevron direction="right" />
          </button>
        ) : null}
      </div>

      {showNav ? (
        <footer className="flex items-center justify-center gap-4 px-3 pb-5 sm:hidden">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              goPrev()
            }}
            className="grid size-12 place-items-center rounded-full bg-white/15 text-white"
            aria-label="Foto anterior"
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              goNext()
            }}
            className="grid size-12 place-items-center rounded-full bg-white/15 text-white"
            aria-label="Foto siguiente"
          >
            <Chevron direction="right" />
          </button>
        </footer>
      ) : null}
    </div>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === 'left' ? (
        <path d="M15 6l-6 6 6 6" />
      ) : (
        <path d="M9 6l6 6-6 6" />
      )}
    </svg>
  )
}
