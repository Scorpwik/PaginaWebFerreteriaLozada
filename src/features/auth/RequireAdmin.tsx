import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/States'
import { useAuth } from './AuthProvider'

/**
 * Puerta unica del panel. El guard es comodidad de interfaz: la proteccion real
 * la hacen las politicas RLS, que exigen is_admin() para cualquier escritura.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, session, admin, gateMessage, signOut } = useAuth()
  const location = useLocation()

  // Si ya entramos al panel, no desmontar la pagina ante un "loading"
  // momentaneo (eso reseteaba formularios al cambiar de pestana).
  if (status === 'loading' && !admin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Verificando tu sesión" />
      </div>
    )
  }

  if (status === 'loading' && admin) {
    return <>{children}</>
  }

  if (status === 'signed-out') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  if (status === 'not-admin') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-ink-900 text-2xl font-extrabold">
          Esta cuenta no tiene acceso
        </h1>
        <p className="text-ink-600 mt-3 text-sm leading-relaxed">
          {gateMessage ??
            `${session?.user.email ?? 'Esta cuenta'} inició sesión, pero no está registrada como administradora de la ferretería.`}
        </p>
        <Button className="mt-6" onClick={() => void signOut()}>
          Cerrar sesión
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
