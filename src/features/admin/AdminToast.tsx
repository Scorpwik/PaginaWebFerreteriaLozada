import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'

type ToastTone = 'success' | 'error' | 'info'

type Toast = {
  id: number
  tone: ToastTone
  message: string
}

type ToastApi = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const toneClass: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
}

const toneLabel: Record<ToastTone, string> = {
  success: 'Listo',
  error: 'Atención',
  info: 'Aviso',
}

/**
 * Avisos flotantes del panel. Pensados para que papá/mamá vean al instante
 * "se guardó" sin buscar el mensaje arriba del formulario.
 */
export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++
    setToasts((current) => [...current.slice(-3), { id, tone, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, tone === 'error' ? 7000 : 4200)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-4 sm:items-end sm:pr-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg ${toneClass[toast.tone]}`}
          >
            <p className="text-xs font-bold uppercase tracking-wide">
              {toneLabel[toast.tone]}
            </p>
            <p className="mt-0.5 font-medium">{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useAdminToast(): ToastApi {
  const value = useContext(ToastContext)
  if (!value) {
    throw new Error('useAdminToast requiere AdminToastProvider.')
  }
  return value
}
