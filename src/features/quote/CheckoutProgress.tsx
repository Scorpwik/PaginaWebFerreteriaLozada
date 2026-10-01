const STEPS = [
  { id: 1, label: 'Carrito' },
  { id: 2, label: 'Tu nombre' },
  { id: 3, label: 'WhatsApp' },
] as const

/**
 * Tres pasos del pedido. El proceso es corto; el indicador evita que se sienta
 * como un formulario largo.
 */
export function CheckoutProgress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol
      className="mt-6 mb-8 grid grid-cols-3 gap-2"
      aria-label="Pasos del pedido"
    >
      {STEPS.map((step, index) => {
        const state =
          step.id < current ? 'done' : step.id === current ? 'current' : 'todo'
        const circle =
          state === 'todo'
            ? 'border-ink-200 text-ink-400 bg-white'
            : 'border-brand-700 bg-brand-700 text-white'
        const labelClass =
          state === 'todo'
            ? 'text-ink-400'
            : state === 'current'
              ? 'text-brand-800 font-bold'
              : 'text-ink-700 font-semibold'

        return (
          <li key={step.id} className="relative flex flex-col items-center gap-2">
            {index < STEPS.length - 1 ? (
              <span
                className={`absolute top-4 left-[calc(50%+1.1rem)] h-0.5 w-[calc(100%-0.5rem)] rounded-full ${
                  step.id < current ? 'bg-brand-700' : 'bg-ink-200'
                }`}
                aria-hidden="true"
              />
            ) : null}
            <span
              className={`relative z-10 grid size-8 place-items-center rounded-full border-2 text-xs font-extrabold ${circle}`}
            >
              {step.id}
            </span>
            <span
              className={`text-center text-xs sm:text-sm ${labelClass}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
