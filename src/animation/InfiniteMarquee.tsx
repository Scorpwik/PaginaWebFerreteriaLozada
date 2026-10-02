import { useEffect, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { useReducedMotion } from '@/animation/useReducedMotion'

type Props<T> = {
  items: T[]
  getKey: (item: T, index: number) => string
  renderItem: (item: T, ctx: { clone: boolean; index: number }) => ReactNode
  ariaLabel: string
  /** Pausa el loop (p. ej. mientras un lightbox está abierto). */
  paused?: boolean
  /** Segundos por ítem; el total se acota a un mínimo razonable. */
  secondsPerItem?: number
  minDuration?: number
  className?: string
  listClassName?: string
}

/**
 * Cinta horizontal con loop infinito real (dos copias + GSAP a -width).
 * Misma lógica que el carrusel de fotos de Sobre Nosotros.
 */
export function InfiniteMarquee<T>({
  items,
  getKey,
  renderItem,
  ariaLabel,
  paused = false,
  secondsPerItem = 5,
  minDuration = 16,
  className = '',
  listClassName = 'flex gap-3 pr-3',
}: Props<T>) {
  const reducedMotion = useReducedMotion()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const firstSetRef = useRef<HTMLUListElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const [overflows, setOverflows] = useState(false)

  const autoPlay =
    !reducedMotion && !paused && overflows && items.length >= 2

  useEffect(() => {
    const scroller = scrollerRef.current
    const firstSet = firstSetRef.current
    if (!scroller || !firstSet || items.length === 0) return

    const measure = () => {
      setOverflows(firstSet.scrollWidth > scroller.clientWidth + 8)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    observer.observe(firstSet)
    return () => observer.disconnect()
  }, [items])

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

    const duration = Math.max(minDuration, items.length * secondsPerItem)
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
  }, [autoPlay, items, minDuration, secondsPerItem])

  if (items.length === 0) return null

  const renderSet = (clone: boolean) =>
    items.map((item, index) => (
      <li
        key={`${clone ? 'c' : 'o'}-${getKey(item, index)}`}
        aria-hidden={clone || undefined}
      >
        {renderItem(item, { clone, index })}
      </li>
    ))

  return (
    <div
      ref={scrollerRef}
      className={
        autoPlay
          ? `overflow-hidden ${className}`
          : `overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`
      }
      role="region"
      aria-label={ariaLabel}
      aria-roledescription="carrusel"
    >
      <div ref={trackRef} className="flex w-max will-change-transform">
        <ul ref={firstSetRef} className={listClassName}>
          {renderSet(false)}
        </ul>
        {autoPlay ? (
          <ul className={listClassName} aria-hidden="true">
            {renderSet(true)}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
