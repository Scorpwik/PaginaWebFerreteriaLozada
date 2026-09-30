import { Link } from 'react-router-dom'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'whatsapp'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

// brand-700 y no brand-600: el texto blanco sobre #F23005 no alcanza el
// contraste AA en tamano normal.
const variants: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
  secondary: 'bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950',
  outline:
    'border-2 border-ink-200 bg-white text-ink-900 hover:border-brand-600 hover:text-brand-700',
  ghost: 'text-ink-700 hover:bg-ink-50 hover:text-ink-900',
  whatsapp: 'bg-[#1c8c4c] text-white hover:bg-[#166b3b] active:bg-[#12572f]',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-[0.9375rem]',
  lg: 'px-6 py-3.5 text-base',
}

type CommonProps = {
  variant?: Variant
  size?: Size
  children: ReactNode
  className?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: CommonProps & ComponentProps<'button'>) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  )
}

export function ButtonAnchor({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: CommonProps & ComponentProps<'a'>) {
  return (
    <a
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </a>
  )
}
