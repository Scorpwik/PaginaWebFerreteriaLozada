import type { ReactNode } from 'react'

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-ink-100 animate-pulse rounded-lg ${className}`}
      aria-hidden="true"
    />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="border-ink-100 rounded-card overflow-hidden border bg-white">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="border-ink-200 rounded-card border border-dashed px-6 py-14 text-center">
      <p className="text-ink-900 text-lg font-semibold">{title}</p>
      {description ? (
        <p className="text-ink-600 mx-auto mt-2 max-w-md text-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: Error
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="rounded-card border border-red-200 bg-red-50 px-6 py-8 text-center"
    >
      <p className="font-semibold text-red-900">Algo no cargó bien</p>
      <p className="mt-2 text-sm text-red-800">
        Revisa tu conexión e inténtalo otra vez.
      </p>
      <p className="mt-1 text-xs text-red-700/80">{error.message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-900 px-4 py-2 text-sm font-semibold text-white hover:bg-red-950"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  )
}

export function Spinner({ label = 'Cargando' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status">
      <span
        className="border-ink-300 border-t-brand-600 size-4 animate-spin rounded-full border-2"
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
