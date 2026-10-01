import { useEffect, useState } from 'react'
import { Button, ButtonAnchor } from '@/components/Button'
import { WhatsAppIcon } from '@/features/whatsapp/WhatsAppButton'
import { quoteMessage, whatsappUrl } from '@/features/whatsapp/buildMessage'
import { useSettings } from '@/features/settings/SettingsProvider'
import { useCart } from '@/features/cart/CartProvider'
import { quotePdfFile } from '@/data/orders'
import type { QuoteResult } from '@/data/orders'
import { formatDate, formatMoney, formatPrice } from '@/lib/format'

/**
 * Primero se ofrece guardar o compartir el PDF y solo despues se abre
 * WhatsApp: si el orden fuera el contrario, el usuario sale del sitio y
 * pierde el archivo.
 */
export function QuoteResultPanel({ result }: { result: QuoteResult }) {
  const settings = useSettings()
  const { clear } = useCart()
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'done'>('idle')
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  // El carrito ya cumplio: la cotizacion existe en la base.
  useEffect(() => {
    clear()
  }, [clear])

  useEffect(() => {
    const file = quotePdfFile(result)
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [result])

  const message = quoteMessage({
    clientName: result.client_name,
    quoteNumber: result.quote_number,
    lines: result.lines.map((line) => ({
      productName: line.product_name,
      variantLabel: line.variant_label,
      quantity: line.quantity,
      unitPrice: line.unit_price,
      subtotal: line.subtotal,
    })),
    total: result.total,
    pdfUrl: result.pdf_url,
  })

  const canShareFile = () => {
    if (typeof navigator === 'undefined' || !navigator.canShare) return false
    try {
      return navigator.canShare({ files: [quotePdfFile(result)] })
    } catch {
      return false
    }
  }

  const share = async () => {
    setShareState('sharing')
    try {
      await navigator.share({
        files: [quotePdfFile(result)],
        title: `Cotización ${result.quote_number}`,
      })
      setShareState('done')
    } catch {
      // El usuario canceló el diálogo del sistema: no es un error.
      setShareState('idle')
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-card border border-emerald-200 bg-emerald-50 p-5 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">
          Cotización generada
        </p>
        <p className="mt-1 text-2xl font-extrabold text-emerald-900">
          {result.quote_number}
        </p>
        <p className="mt-1 text-sm text-emerald-800">
          Válida hasta el {formatDate(result.valid_until)}
        </p>
      </div>

      <div className="border-ink-100 rounded-card mt-5 border">
        <ul className="divide-ink-100 divide-y">
          {result.lines.map((line, index) => (
            <li key={index} className="flex gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-ink-900 font-semibold">{line.product_name}</p>
                {line.variant_label ? (
                  <p className="text-ink-600 text-xs">{line.variant_label}</p>
                ) : null}
                <p className="text-ink-500 mt-0.5 text-xs">
                  {/* formatPrice y no formatMoney: el precio unitario puede
                      tener 4 decimales. */}
                  {line.quantity} x {formatPrice(line.unit_price)}
                </p>
              </div>
              <p className="text-ink-900 shrink-0 font-bold">
                {formatMoney(line.subtotal)}
              </p>
            </li>
          ))}
        </ul>

        <div className="border-ink-100 flex items-center justify-between border-t px-4 py-3">
          <p className="text-ink-900 font-bold">Total</p>
          <p className="text-ink-900 text-lg font-extrabold">
            {formatMoney(result.total)}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <p className="text-ink-700 text-sm font-semibold">
          1. Guarda tu cotización
        </p>

        {canShareFile() ? (
          <Button
            onClick={() => void share()}
            variant="outline"
            size="lg"
            className="w-full"
            disabled={shareState === 'sharing'}
          >
            {shareState === 'done' ? 'PDF compartido' : 'Compartir PDF'}
          </Button>
        ) : null}

        {objectUrl ? (
          <ButtonAnchor
            href={objectUrl}
            download={`Cotizacion-${result.quote_number}.pdf`}
            variant="outline"
            size="lg"
            className="w-full"
          >
            Descargar PDF
          </ButtonAnchor>
        ) : null}

        <p className="text-ink-700 pt-2 text-sm font-semibold">
          2. Envíanos el pedido
        </p>

        <ButtonAnchor
          href={whatsappUrl(settings.whatsappNumber, message)}
          target="_blank"
          rel="noopener noreferrer"
          variant="whatsapp"
          size="lg"
          className="min-h-12 w-full text-base"
        >
          <WhatsAppIcon />
          Enviar pedido por WhatsApp
        </ButtonAnchor>

        <p className="text-ink-500 text-center text-xs leading-relaxed">
          Te responderemos confirmando disponibilidad y coordinando la entrega.
          Los precios son referenciales por {settings.quoteValidityDays} días.
        </p>
      </div>
    </div>
  )
}
