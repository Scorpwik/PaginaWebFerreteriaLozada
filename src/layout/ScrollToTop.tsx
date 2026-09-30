import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Cada cambio de ruta arranca arriba, no a media pagina. */
export function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname, search])

  return null
}
