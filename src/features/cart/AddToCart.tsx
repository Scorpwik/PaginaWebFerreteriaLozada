import { useEffect, useState } from 'react'
import { Button, ButtonLink } from '@/components/Button'
import { useCart } from './CartProvider'
import { MAX_QUANTITY, MIN_QUANTITY, normalizeQuantity } from './cart'
import { canAddToCart } from '@/lib/domain'
import { formatMoney, variantLabel } from '@/lib/format'
import { pickPrimaryImage } from '@/lib/domain'
import type { ProductDetail, Variant } from '@/lib/domain'

export function AddToCart({
  product,
  variant,
}: {
  product: ProductDetail
  variant: Variant
}) {
  const { add } = useCart()
  const [quantity, setQuantity] = useState('1')
  const [added, setAdded] = useState(false)

  // Cambiar de variante reinicia la cantidad y el aviso.
  useEffect(() => {
    setQuantity('1')
    setAdded(false)
  }, [variant.id])

  useEffect(() => {
    if (!added) return
    const timer = window.setTimeout(() => setAdded(false), 4000)
    return () => window.clearTimeout(timer)
  }, [added])

  if (!canAddToCart(variant)) return null

  const parsed = Number(quantity.replace(',', '.'))
  const valid = Number.isFinite(parsed) && parsed >= MIN_QUANTITY
  const effective = valid ? normalizeQuantity(parsed) : 1

  const step = (delta: number) => {
    const next = normalizeQuantity((valid ? effective : 1) + delta)
    setQuantity(String(next))
  }

  const submit = () => {
    add({
      variantId: variant.id,
      productId: product.id,
      productOriginId: product.origin_id,
      productName: product.name,
      variantLabel: variantLabel(variant) || null,
      saleUnit: variant.sale_unit,
      unitPrice: variant.price,
      quantity: effective,
      imageUrl: pickPrimaryImage(
        product.images.filter(
          (image) => image.variant_id === variant.id || image.variant_id === null,
        ),
      ),
    })
    setAdded(true)
  }

  return (
    <div className="border-ink-100 rounded-card mt-7 border p-5">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label
            htmlFor="cantidad"
            className="text-ink-900 mb-2 block text-sm font-bold"
          >
            Cantidad
            {variant.sale_unit ? (
              <span className="text-ink-500 ml-1 font-medium">
                ({variant.sale_unit})
              </span>
            ) : null}
          </label>

          <div className="border-ink-200 flex w-fit items-stretch overflow-hidden rounded-lg border-2">
            <button
              type="button"
              onClick={() => step(-1)}
              className="text-ink-700 hover:bg-ink-50 px-4 text-lg font-bold"
              aria-label="Quitar uno"
            >
              −
            </button>
            <input
              id="cantidad"
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              onBlur={() => setQuantity(String(effective))}
              aria-describedby="cantidad-ayuda"
              className="border-ink-200 w-20 border-x-2 py-3 text-center font-bold focus:outline-none"
            />
            <button
              type="button"
              onClick={() => step(1)}
              className="text-ink-700 hover:bg-ink-50 px-4 text-lg font-bold"
              aria-label="Añadir uno"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-ink-500 text-xs font-semibold uppercase tracking-wide">
            Subtotal
          </p>
          <p className="text-ink-900 text-xl font-extrabold">
            {formatMoney(variant.price * effective)}
          </p>
        </div>
      </div>

      <p id="cantidad-ayuda" className="text-ink-500 mt-2 text-xs">
        Puedes usar decimales (por ejemplo 2,5). Máximo{' '}
        {MAX_QUANTITY.toLocaleString('es-EC')}.
      </p>

      <Button onClick={submit} size="lg" className="mt-4 w-full">
        Añadir al carrito
      </Button>

      {added ? (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
        >
          Se añadió a tu carrito.
          <ButtonLink to="/carrito" variant="outline" size="sm">
            Ver carrito
          </ButtonLink>
        </div>
      ) : null}
    </div>
  )
}
