import type { ReactNode } from 'react'

/** Controles compartidos del panel, para no repetir clases en cada formulario. */

/**
 * Campo con ayuda. `hint` se ve siempre debajo; `tip` aparece al pasar el
 * raton o al enfocar (pensado para ejemplos que no hay que leer todo el rato).
 */
export function Field({
  label,
  htmlFor,
  hint,
  tip,
  error,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  tip?: string
  error?: string | null
  children: ReactNode
}) {
  return (
    <div className="group/field relative">
      <div className="mb-1.5 flex items-center gap-1.5">
        <label htmlFor={htmlFor} className="text-ink-800 text-sm font-semibold">
          {label}
        </label>
        {tip ? (
          <span className="relative inline-flex">
            <button
              type="button"
              tabIndex={-1}
              aria-label={`Ayuda: ${label}`}
              className="border-ink-300 text-ink-500 hover:border-brand-600 hover:text-brand-700 flex size-5 items-center justify-center rounded-full border text-[0.65rem] font-bold"
            >
              ?
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-[calc(100%+0.4rem)] left-1/2 z-20 w-64 -translate-x-1/2 rounded-lg bg-ink-900 px-3 py-2 text-left text-xs leading-relaxed font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/field:opacity-100 group-focus-within/field:opacity-100"
            >
              {tip}
            </span>
          </span>
        ) : null}
      </div>
      {children}
      {hint && !error ? (
        <p className="text-ink-500 mt-1 text-xs">{hint}</p>
      ) : null}
      {error ? (
        <p className="mt-1 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
    </div>
  )
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      {children}
    </p>
  )
}

export function FormSuccess({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
    >
      {children}
    </p>
  )
}

export function Checkbox({
  id,
  label,
  checked,
  onChange,
  tip,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  tip?: string
}) {
  return (
    <label
      htmlFor={id}
      title={tip}
      className="flex cursor-pointer items-center gap-2.5"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-brand-600 size-4.5"
      />
      <span className="text-ink-800 text-sm font-medium">{label}</span>
    </label>
  )
}

export function AdminCard({
  title,
  description,
  children,
  actions,
}: {
  title?: string
  description?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="border-ink-100 rounded-card border bg-white p-5">
      {title ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-ink-900 text-lg font-bold">{title}</h2>
            {description ? (
              <p className="text-ink-600 mt-1 text-sm">{description}</p>
            ) : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  )
}
