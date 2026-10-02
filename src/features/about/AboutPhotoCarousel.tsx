import { useState } from 'react'
import { InfiniteMarquee } from '@/animation/InfiniteMarquee'
import { PhotoLightbox } from './PhotoLightbox'
import type { AboutGalleryItem } from '@/data/settings'

type Props = {
  photos: AboutGalleryItem[]
  /** En la columna de PC las tarjetas son un poco mas chicas. */
  compact?: boolean
}

/**
 * Cinta horizontal de fotos del local.
 * Solo las fotos que hay; clic/toque abre el visor.
 */
export function AboutPhotoCarousel({ photos, compact = false }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const lightboxOpen = openIndex !== null

  if (photos.length === 0) return null

  const itemClass = compact
    ? 'w-[min(70vw,16rem)] shrink-0'
    : 'w-[min(78vw,20rem)] shrink-0 sm:w-[22rem]'

  return (
    <section aria-labelledby="galeria-local" className="min-w-0">
      <div className="mb-3">
        <h2
          id="galeria-local"
          className="text-ink-900 text-lg font-extrabold tracking-tight sm:text-xl"
        >
          Así es el local
        </h2>
        <p className="text-ink-600 mt-1 text-sm">
          Un vistazo al día a día en Chillogallo.
        </p>
      </div>

      <InfiniteMarquee
        items={photos}
        paused={lightboxOpen}
        getKey={(photo, index) => `${photo.url}-${index}`}
        ariaLabel="Fotos del local. Toca o haz clic para ampliar."
        secondsPerItem={6}
        minDuration={18}
        renderItem={(photo, { clone, index }) => (
          <div className={itemClass}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="border-ink-100 group focus-visible:ring-brand-600 block w-full overflow-hidden rounded-card border bg-ink-50 focus-visible:ring-2 focus-visible:outline-none"
              aria-label={clone ? undefined : `Abrir foto: ${photo.alt}`}
              tabIndex={clone ? -1 : 0}
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={photo.url}
                  alt=""
                  loading={!clone && index < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
            </button>
          </div>
        )}
      />

      {lightboxOpen ? (
        <PhotoLightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onChange={setOpenIndex}
        />
      ) : null}
    </section>
  )
}
