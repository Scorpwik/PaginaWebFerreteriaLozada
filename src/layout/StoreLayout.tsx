import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { CartBadge } from './CartBadge'

/** Cascara de la tienda. El panel admin usa la suya, sin cabecera comercial. */
export function StoreLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header actions={<CartBadge />} />

      <main id="contenido" className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
