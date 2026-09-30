import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchQuerySchema } from '@/lib/validation'

type Props = {
  initialValue?: string
  size?: 'md' | 'lg'
  autoFocus?: boolean
  id?: string
}

/**
 * Buscador global. Navega a /catalogo?q=... para que el resultado sea una URL
 * compartible, en vez de guardar el termino en memoria.
 */
export function SearchBar({
  initialValue = '',
  size = 'md',
  autoFocus = false,
  id = 'buscador',
}: Props) {
  const [value, setValue] = useState(initialValue)
  const navigate = useNavigate()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const term = searchQuerySchema.parse(value)
    navigate(term ? `/catalogo?q=${encodeURIComponent(term)}` : '/catalogo')
  }

  const tall = size === 'lg'

  return (
    <form role="search" onSubmit={submit} className="w-full">
      <label htmlFor={id} className="sr-only">
        Buscar productos por nombre, código, medida o marca
      </label>
      <div className="relative">
        <SearchIcon
          className={`text-ink-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${tall ? 'size-6' : 'size-5'}`}
        />
        <input
          id={id}
          name="q"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Busca por nombre, código, medida o marca"
          className={`border-ink-200 placeholder:text-ink-400 focus:border-brand-600 w-full rounded-xl border-2 bg-white pl-12 pr-28 font-medium shadow-sm transition-colors focus:outline-none ${
            tall ? 'py-4 text-base' : 'py-3 text-[0.9375rem]'
          }`}
        />
        <button
          type="submit"
          className={`bg-brand-700 hover:bg-brand-800 absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg font-semibold text-white ${
            tall ? 'px-5 py-2.5 text-sm' : 'px-4 py-2 text-sm'
          }`}
        >
          Buscar
        </button>
      </div>
    </form>
  )
}

export function SearchIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}
