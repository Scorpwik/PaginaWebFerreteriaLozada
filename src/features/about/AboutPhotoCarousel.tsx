import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
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
 * Loop infinito real: dos copias del set; GSAP desplaza hasta -width del
 * primer set y reinicia a 0 sin transición (copias idénticas → sin salto).
 */
export function AboutPhotoCarousel({ photos, compact = false }: Props) {
  const reducedMotion = useReducedMotion()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const firstSetRef = useRef<HTMLUListElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const [overflows, setOverflows] = useState(false)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const lightboxOpen = openIndex !== null
  const autoPlay =
    !reducedMotion && !lightboxOpen && overflows && photos.length >= 2

  useEffect(() => {
    const scroller = scrollerRef.current
    const firstSet = firstSetRef.current
    if (!scroller || !firstSet || photos.length === 0) return

    const measure = () => {
      setOverflows(firstSet.scrollWidth > scroller.clientWidth + 8)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    observer.observe(firstSet)
    return () => observer.disconnect()
  }, [photos])

  useEffect(() => {
    const track = trackRef.current
    const firstSet = firstSetRef.current
    if (!track || !firstSet) return

    tweenRef.current?.kill()
    tweenRef.current = null
    gsap.set(track, { x: 0 })

    if (!autoPlay) return

    const distance = firstSet.offsetWidth
    if (distance <= 0) return

    const duration = Math.max(18, photos.length * 6)

    const tween = gsap.to(track, {
      x: -distance,
      duration,
      ease: 'none',
      repeat: -1,
    })
    tweenRef.current = tween

    const pause = () => tween.pause()
    const resume = () => tween.resume()
    const scroller = scrollerRef.current
    scroller?.addEventListener('pointerenter', pause)
    scroller?.addEventListener('pointerleave', resume)
    scroller?.addEventListener('focusin', pause)
    scroller?.addEventListener('focusout', resume)

    return () => {
      tween.kill()
      tweenRef.current = null
      scroller?.removeEventListener('pointerenter', pause)
      scroller?.removeEventListener('pointerleave', resume)
      scroller?.removeEventListener('focusin', pause)
      scroller?.removeEventListener('focusout', resume)
      gsap.set(track, { x: 0 })
    }
  }, [autoPlay, photos])

  if (photos.length === 0) return null

  const itemClass = compact
    ? 'w-[min(70vw,16rem)] shrink-0'
    : 'w-[min(78vw,20rem)] shrink-0 sm:w-[22rem]'

  const renderSet = (clone: boolean) =>
    photos.map((photo, index) => (
      <li
        key={`${clone ? 'clone' : 'orig'}-${photo.url}-${index}`}
        className={itemClass}
        aria-hidden={clone || undefined}
      >
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
      </li>
    ))

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
        className={
          autoPlay
            ? 'overflow-hidden pb-0'
            : 'overflow-x-auto pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        }
        role="region"
        aria-label="Fotos del local. Toca o haz clic para ampliar."
        aria-roledescription="carrusel"
      >
        <div ref={trackRef} className="flex w-max will-change-transform">
          <ul ref={firstSetRef} className="flex gap-3 pr-3">
            {renderSet(false)}
          </ul>
          {autoPlay ? (
            <ul className="flex gap-3 pr-3" aria-hidden="true">
              {renderSet(true)}
            </ul>
          ) : null}
        </div>
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
