import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/States'
import { useAuth } from '@/features/auth/AuthProvider'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { Field, FormError } from '@/features/admin/FormControls'

export default function AdminLogin() {
  const { status, session, gateMessage, signIn, signOut } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useDocumentMeta({
    title: 'Administración | Ferretería Lozada',
    description: 'Acceso al panel de administración de Ferretería Lozada.',
    noIndex: true,
  })

  if (status === 'admin') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/admin'} replace />
  }

  // Primera carga de la sesion guardada: no mostrar el formulario con el boton
  // en "Entrando…" como si el usuario hubiera pulsado algo.
  if (status === 'loading' && !busy && !session) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Verificando tu sesión" />
      </div>
    )
  }

  // Sesion abierta pero sin permiso: no se re-muestra el formulario "como si
  // no hubiera pasado nada", que era justo el bug que se veia al dar Entrar.
  if (status === 'not-admin') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-ink-900 text-2xl font-extrabold">
          Esta cuenta no tiene acceso
        </h1>
        <p className="text-ink-600 mt-3 text-sm leading-relaxed">
          {gateMessage ??
            `${session?.user.email ?? 'Esta cuenta'} inició sesión, pero no está registrada como administradora.`}
        </p>
        <p className="text-ink-500 mt-2 text-xs">
          En Supabase → Table Editor → <code>admins</code> debe existir una fila
          cuyo <code>id</code> sea el UID del usuario.
        </p>
        <Button className="mt-6" onClick={() => void signOut()}>
          Cerrar sesión e intentar con otra cuenta
        </Button>
        <p className="text-ink-500 mt-8 text-center text-xs">
          <Link to="/" className="underline">
            Volver a la tienda
          </Link>
        </p>
      </div>
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email, password)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos iniciar sesión.')
    } finally {
      setBusy(false)
    }
  }

  const checking = status === 'loading' || busy

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-ink-900 text-2xl font-extrabold">Administración</h1>
      <p className="text-ink-600 mt-2 text-sm">
        Entra con tu correo para editar el catálogo y ver las cotizaciones.
      </p>

      <form onSubmit={(event) => void submit(event)} className="mt-8 space-y-4">
        <Field label="Correo" htmlFor="admin-email">
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="admin-input"
            disabled={checking}
          />
        </Field>

        <Field label="Contraseña" htmlFor="admin-password">
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="admin-input"
            disabled={checking}
          />
        </Field>

        {error ? <FormError>{error}</FormError> : null}

        <Button type="submit" size="lg" className="w-full" disabled={checking}>
          {checking ? (
            <span className="inline-flex items-center gap-2">
              <Spinner label="Entrando" />
              Entrando…
            </span>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>

      <p className="text-ink-500 mt-8 text-center text-xs">
        <Link to="/" className="underline">
          Volver a la tienda
        </Link>
      </p>
    </div>
  )
}
