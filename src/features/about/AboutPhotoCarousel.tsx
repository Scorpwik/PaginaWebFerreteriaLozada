import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/animation/useReducedMotion'
import { PhotoLightbox } from './PhotoLightbox'
import type { AboutGalleryItem } from '@/data/settings'

type Props = {
  photos: AboutGalleryItem[]
  /** En la columna de PC las tarjetas son un poco mas chicas. */
  compact?: boolean
}

/**
 * Cinta horizontal de fotos del local.
 * Solo las fotos que hay; clic/toque abre el visor. Sin texto "Ver foto" ni
 * barra de scroll visible.
 */
export function AboutPhotoCarousel({ photos, compact = false }: Props) {
  const reducedMotion = useReducedMotion()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLUListElement>(null)
  const [overflows, setOverflows] = useState(false)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    const track = trackRef.current
    if (!scroller || !track) return

    const measure = () => {
      setOverflows(track.scrollWidth > scroller.clientWidth + 8)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    observer.observe(track)
    return () => observer.disconnect()
  }, [photos])

  if (photos.length === 0) return null

  const lightboxOpen = openIndex !== null
  const autoPlay =
    !reducedMotion && !lightboxOpen && overflows && photos.length >= 3
  const loopPhotos = autoPlay ? [...photos, ...photos] : photos

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

      <div
        ref={scrollerRef}
        className={`overflow-x-auto pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          autoPlay ? 'group/carousel' : ''
        }`}
        role="region"
        aria-label="Fotos del local. Toca o haz clic para ampliar."
        aria-roledescription="carrusel"
      >
        <ul
          ref={trackRef}
          className={`flex w-max gap-3 ${
            autoPlay
              ? 'about-marquee group-hover/carousel:[animation-play-state:paused] group-focus-within/carousel:[animation-play-state:paused]'
              : ''
          }`}
          style={
            autoPlay
              ? {
                  animationDuration: `${Math.max(18, photos.length * 6)}s`,
                }
              : undefined
          }
        >
          {loopPhotos.map((photo, index) => {
            const realIndex = index % photos.length
            const isClone = autoPlay && index >= photos.length
            return (
              <li
                key={`${photo.url}-${index}`}
                className={
                  compact
                    ? 'w-[min(70vw,16rem)] shrink-0'
                    : 'w-[min(78vw,20rem)] shrink-0 sm:w-[22rem]'
                }
                aria-hidden={isClone || undefined}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(realIndex)}
                  className="border-ink-100 group focus-visible:ring-brand-600 block w-full overflow-hidden rounded-card border bg-ink-50 focus-visible:ring-2 focus-visible:outline-none"
                  aria-label={
                    isClone ? undefined : `Abrir foto: ${photo.alt}`
                  }
                  tabIndex={isClone ? -1 : 0}
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={photo.url}
                      alt=""
                      loading={index < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable={false}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

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
