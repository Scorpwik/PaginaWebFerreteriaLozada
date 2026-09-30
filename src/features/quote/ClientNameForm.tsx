import { useState } from 'react'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/States'
import { clientNameSchema } from '@/lib/validation'

/**
 * Lo unico que se le pide al cliente. El telefono llega solo por WhatsApp,
 * asi que no se pide nada mas.
 */
export function ClientNameForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (name: string) => void
  submitting: boolean
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const result = clientNameSchema.safeParse(value)

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Revisa tu nombre.')
      return
    }

    setError(null)
    onSubmit(result.data)
  }

  return (
    <form onSubmit={submit} noValidate>
      <label
        htmlFor="nombre-cliente"
        className="text-ink-900 block text-sm font-bold"
      >
        ¿A nombre de quién va la cotización?
      </label>
      <p className="text-ink-600 mt-1 text-sm">
        Solo tu nombre. El resto lo coordinamos por WhatsApp.
      </p>

      <input
        id="nombre-cliente"
        name="nombre"
        type="text"
        autoComplete="name"
        enterKeyHint="done"
        maxLength={80}
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          if (error) setError(null)
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'nombre-error' : undefined}
        placeholder="Ej. Luis Guaman"
        className={`mt-3 w-full rounded-xl border-2 px-4 py-3.5 text-base font-medium focus:outline-none ${
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-ink-200 focus:border-brand-600'
        }`}
      />

      {error ? (
        <p id="nombre-error" role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={submitting} className="mt-5 w-full">
        {submitting ? (
          <>
            <Spinner label="Generando cotización" />
            Generando cotización…
          </>
        ) : (
          'Generar cotización'
        )}
      </Button>
    </form>
  )
}
