import { useEffect, useState } from 'react'

const DESKTOP_QUERY = '(min-width: 1024px)'

/**
 * Viewport de escritorio (Tailwind `lg`). Los efectos GSAP pesados (parallax,
 * transiciones de pagina) se montan solo aqui: un celular grande no cuenta
 * como desktop, aunque la pantalla mida lo mismo que un portatil.
 */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(DESKTOP_QUERY).matches
  })

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setDesktop(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return desktop
}
