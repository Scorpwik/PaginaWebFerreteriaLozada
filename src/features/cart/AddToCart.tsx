import { useEffect, useRef, useState } from 'react'
import { Button, ButtonLink } from '@/components/Button'
import { useCart } from './CartProvider'
import { MAX_QUANTITY, normalizeQuantity } from './cart'
import { QuantityField } from './QuantityField'
import { canAddToCart } from '@/lib/domain'
import { formatMoney, variantLabel } from '@/lib/format'
import { pickPrimaryImage } from '@/lib/domain'
import { useIsDesktop } from '@/animation/useIsDesktop'
import type { ProductDetail, Variant } from '@/lib/domain'

export function AddToCart({
  product,
  variant,
}: {
  product: ProductDetail
  variant: Variant
}) {
  const { add } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()
  const [showSticky, setShowSticky] = useState(false)

  // Cambiar de variante reinicia la cantidad y el aviso.
  useEffect(() => {
    setQuantity(1)
    setAdded(false)
  }, [variant.id])

  useEffect(() => {
    if (!added) return
    const timer = window.setTimeout(() => setAdded(false), 4000)
    return () => window.clearTimeout(timer)
  }, [added])

  useEffect(() => {
    const node = boxRef.current
    if (!isDesktop || !node) {
      setShowSticky(false)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowSticky(!entry.isIntersecting)
      },
      { threshold: 0.2 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [isDesktop])

  if (!canAddToCart(variant)) return null

  const effective = normalizeQuantity(quantity)

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

  const addLabel = added ? 'Añadido al carrito' : 'Añadir al carrito'

  return (
    <>
      <div
        ref={boxRef}
        className="border-brand-200 rounded-card mt-7 border-2 bg-brand-50/40 p-5"
      >
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

            <QuantityField
              id="cantidad"
              value={quantity}
              onChange={setQuantity}
              aria-describedby="cantidad-ayuda"
            />
          </div>

          <div className="flex-1">
            <p className="text-ink-500 text-xs font-semibold uppercase tracking-wide">
              Subtotal
            </p>
            <p
              key={`${variant.id}-${effective}`}
              className="price-swap text-ink-900 text-xl font-extrabold"
            >
              {formatMoney(variant.price * effective)}
            </p>
          </div>
        </div>

        <p id="cantidad-ayuda" className="text-ink-500 mt-2 text-xs">
          Solo números enteros. Mínimo 1 · Máximo{' '}
          {MAX_QUANTITY.toLocaleString('es-EC')}.
        </p>

        <Button onClick={submit} size="lg" className="mt-4 min-h-12 w-full text-base">
          {addLabel}
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

      {showSticky ? (
        <div
          className="border-ink-100 fixed inset-x-0 bottom-0 z-30 hidden border-t bg-white/95 px-6 py-3 shadow-[0_-8px_24px_-12px_rgb(38_38_38/0.25)] backdrop-blur lg:block"
          role="region"
          aria-label="Añadir al carrito"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-ink-900 truncate text-sm font-bold">{product.name}</p>
              <p className="text-ink-600 truncate text-xs">
                {variantLabel(variant) || variant.sale_unit || 'Unidad'} ·{' '}
                {formatMoney(variant.price * effective)}
              </p>
            </div>
            {added ? (
              <ButtonLink to="/carrito" size="lg" className="shrink-0">
                Ver carrito
              </ButtonLink>
            ) : (
              <Button onClick={submit} size="lg" className="shrink-0 min-w-[14rem]">
                Añadir al carrito
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
