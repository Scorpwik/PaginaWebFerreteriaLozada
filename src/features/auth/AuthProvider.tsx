import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * Autenticacion real con Supabase Auth: no hay contrasena en el codigo.
 * Estar logueado no alcanza para entrar al panel; el usuario tambien tiene que
 * existir en la tabla admins, que es la misma condicion que aplican las
 * politicas RLS de la base.
 */

export type AuthStatus = 'loading' | 'signed-out' | 'not-admin' | 'admin'

export type AdminProfile = { id: string; name: string | null }

type AuthValue = {
  status: AuthStatus
  session: Session | null
  admin: AdminProfile | null
  /** Motivo legible cuando status es not-admin (RLS, sin fila, etc.). */
  gateMessage: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

/** Traducimos los errores de Supabase: el usuario no lee ingles tecnico. */
function readableAuthError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }
  if (normalized.includes('email not confirmed')) {
    return 'Todavía no confirmaste el correo de esta cuenta.'
  }
  if (normalized.includes('too many requests') || normalized.includes('rate limit')) {
    return 'Demasiados intentos. Espera unos minutos.'
  }
  return 'No pudimos iniciar sesión. Intenta otra vez.'
}

function gateMessageFrom(error: { code?: string; message?: string } | null): string {
  if (!error) {
    return 'Tu cuenta inició sesión, pero no está registrada como administradora. Pide que te agreguen a la tabla admins.'
  }

  const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  if (
    text.includes('permission') ||
    text.includes('rls') ||
    text.includes('42501') ||
    text.includes('row-level security') ||
    text.includes('not allowed')
  ) {
    return 'Tu cuenta inició sesión, pero la base no permite leer la tabla admins (RLS). Hay que aplicar la función is_admin() y las políticas correctas.'
  }

  return 'Tu cuenta inició sesión, pero no pudimos comprobar si eres administrador. Revisa la conexión e inténtalo otra vez.'
}

/**
 * Eventos que NO deben volver a consultar admins ni poner la UI en "loading".
 * Al cambiar de pestaña del navegador Supabase refresca el token y, si
 * tratamos eso como un login nuevo, el panel se desmonta y los formularios
 * vuelven al inicio.
 */
function isQuietAuthEvent(event: AuthChangeEvent): boolean {
  return event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [gateMessage, setGateMessage] = useState<string | null>(null)

  // Refs para leer el estado actual dentro de resolve sin re-suscribir el effect.
  const statusRef = useRef(status)
  const adminRef = useRef(admin)
  statusRef.current = status
  adminRef.current = admin

  // Los waiters de signIn se resuelven cuando termina el chequeo de admin.
  const waitersRef = useRef<Array<(status: AuthStatus) => void>>([])

  useEffect(() => {
    let cancelled = false
    let generation = 0

    const settle = (next: AuthStatus) => {
      const waiters = waitersRef.current
      waitersRef.current = []
      for (const waiter of waiters) waiter(next)
    }

    const resolve = async (next: Session | null, options: { quiet?: boolean } = {}) => {
      const mine = ++generation
      if (cancelled) return

      setSession(next)

      if (!next) {
        setAdmin(null)
        setGateMessage(null)
        setStatus('signed-out')
        settle('signed-out')
        return
      }

      // Ya verificamos a este mismo usuario: no hay que reconsultar ni
      // parpadear el spinner (eso reseteaba las paginas al volver a la pestana).
      if (
        options.quiet ||
        (statusRef.current === 'admin' && adminRef.current?.id === next.user.id)
      ) {
        settle(statusRef.current)
        return
      }

      // Solo mostramos "loading" si todavia no sabemos si es admin. Si ya
      // estabamos dentro del panel, mantenemos la UI montada.
      if (statusRef.current !== 'admin' && statusRef.current !== 'not-admin') {
        setStatus('loading')
      }
      setGateMessage(null)

      const { data, error } = await supabase
        .from('admins')
        .select('id, name')
        .eq('id', next.user.id)
        .maybeSingle()

      if (cancelled || mine !== generation) return

      if (error || !data) {
        setAdmin(null)
        setGateMessage(gateMessageFrom(error))
        setStatus('not-admin')
        settle('not-admin')
        return
      }

      setAdmin(data)
      setGateMessage(null)
      setStatus('admin')
      settle('admin')
    }

    /**
     * Critico: no llamar a supabase.from() DENTRO del callback sincronico de
     * onAuthStateChange. En supabase-js el cliente mantiene un candado de Auth
     * hasta que el callback termina; una query que necesita ese candado se
     * queda esperando para siempre y el login "no hace nada".
     */
    const scheduleResolve = (
      next: Session | null,
      options: { quiet?: boolean } = {},
    ) => {
      window.setTimeout(() => {
        void resolve(next, options)
      }, 0)
    }

    void supabase.auth.getSession().then(({ data }) => {
      scheduleResolve(data.session)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, next) => {
        if (isQuietAuthEvent(event)) {
          // Solo actualizamos la sesion en memoria; la UI no se toca.
          if (next) setSession(next)
          return
        }
        scheduleResolve(next)
      },
    )

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
      settle('signed-out')
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim()

    const settled = new Promise<AuthStatus>((resolve) => {
      waitersRef.current.push(resolve)
    })

    // Forzamos re-chequeo aunque hubiera un admin cacheado de otra cuenta.
    statusRef.current = 'loading'
    adminRef.current = null
    setStatus('loading')
    setAdmin(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    })

    if (error) {
      waitersRef.current = []
      setStatus('signed-out')
      throw new Error(readableAuthError(error.message))
    }

    const outcome = await Promise.race([
      settled,
      new Promise<AuthStatus>((resolve) => {
        window.setTimeout(() => resolve('loading'), 12000)
      }),
    ])

    if (outcome === 'loading') {
      throw new Error(
        'La sesión se abrió, pero la comprobación de administrador no respondió. Revisa la tabla admins y las políticas RLS, o recarga la página.',
      )
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setAdmin(null)
    setGateMessage(null)
    setStatus('signed-out')
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ status, session, admin, gateMessage, signIn, signOut }),
    [status, session, admin, gateMessage, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth requiere AuthProvider.')
  return value
}
