import type { Area } from 'react-easy-crop'

/**
 * Recorta la imagen en un canvas y la exporta como JPEG. Se usa despues del
 * editor visual (react-easy-crop) para subir solo el trozo elegido.
 */

export type CropPreset =
  | 'product'
  | 'heroDesktop'
  | 'heroMobile'
  | 'gallery'
  | 'logo'
  | 'og'
  | 'promo'
  /** @deprecated usar heroDesktop */
  | 'hero'

export type CropPresetConfig = {
  id: CropPreset
  label: string
  /** Ancho / alto del recorte. */
  aspect: number
  /** Lado mayor del JPEG de salida, en pixeles. */
  maxEdge: number
  hint: string
  /** Medida recomendada para recortar fuera del sitio (Photoshop, etc.). */
  recommend: string
}

export const CROP_PRESETS: Record<CropPreset, CropPresetConfig> = {
  product: {
    id: 'product',
    label: 'Producto (cuadrada)',
    aspect: 1,
    maxEdge: 1200,
    hint: 'Así se ve en las tarjetas del catálogo.',
    recommend: '1200 × 1200 px (cuadrada)',
  },
  heroDesktop: {
    id: 'heroDesktop',
    label: 'Portada computador',
    aspect: 21 / 9,
    maxEdge: 1920,
    hint: 'Panorámica ancha. Solo se usa en pantallas grandes.',
    recommend: '1920 × 820 px (aprox. 21:9)',
  },
  heroMobile: {
    id: 'heroMobile',
    label: 'Portada celular',
    aspect: 4 / 5,
    maxEdge: 1200,
    hint: 'Más alta que ancha. Solo se usa en el celular.',
    recommend: '1080 × 1350 px (4:5)',
  },
  // Alias: formularios viejos que aún pasen "hero".
  hero: {
    id: 'hero',
    label: 'Portada computador',
    aspect: 21 / 9,
    maxEdge: 1920,
    hint: 'Panorámica ancha. Solo se usa en pantallas grandes.',
    recommend: '1920 × 820 px (aprox. 21:9)',
  },
  gallery: {
    id: 'gallery',
    label: 'Foto del local (galería)',
    aspect: 16 / 10,
    maxEdge: 1600,
    hint: 'Horizontal, para el carrusel de Nosotros. Recorta el local o el mostrador.',
    recommend: '1600 × 1000 px (16:10 horizontal)',
  },
  logo: {
    id: 'logo',
    label: 'Logo',
    aspect: 1,
    maxEdge: 800,
    hint: 'Cuadrada, para el encabezado del sitio.',
    recommend: '800 × 800 px (cuadrada, fondo transparente o blanco)',
  },
  og: {
    id: 'og',
    label: 'Al compartir (redes)',
    aspect: 1.91,
    maxEdge: 1200,
    hint: 'Así se ve la miniatura al compartir el enlace por WhatsApp.',
    recommend: '1200 × 630 px',
  },
  promo: {
    id: 'promo',
    label: 'Combo / promoción',
    aspect: 4 / 5,
    maxEdge: 1400,
    hint: 'Vertical, como se ve en la tarjeta del Home y en el celular en el local.',
    recommend: '1080 × 1350 px (4:5)',
  },
}

/** Guía corta para el admin: medidas al recortar fuera del sitio. */
export const IMAGE_SIZE_GUIDE = [
  { use: 'Portada (computador)', size: '1920 × 820 px', format: 'JPG o WebP' },
  { use: 'Portada (celular)', size: '1080 × 1350 px', format: 'JPG o WebP' },
  { use: 'Fotos Nosotros (carrusel)', size: '1600 × 1000 px', format: 'JPG o WebP' },
  { use: 'Producto / catálogo', size: '1200 × 1200 px', format: 'JPG o WebP' },
  { use: 'Combo / promoción', size: '1080 × 1350 px', format: 'JPG o WebP' },
  { use: 'Logo', size: '800 × 800 px', format: 'PNG o WebP' },
  { use: 'Compartir en redes', size: '1200 × 630 px', format: 'JPG' },
] as const

/** Tamaño maximo del archivo ORIGINAL al abrir el editor (antes de comprimir). */
export const MAX_SOURCE_BYTES = 12 * 1024 * 1024

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () =>
      reject(new Error('No se pudo leer la imagen.')),
    )
    image.src = src
  })
}

function drawCrop(
  image: HTMLImageElement,
  area: Area,
  maxEdge: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(area.width, area.height))
  const width = Math.max(1, Math.round(area.width * scale))
  const height = Math.max(1, Math.round(area.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Tu navegador no puede recortar imágenes.')

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    width,
    height,
  )
  return canvas
}

/** Previa ligera (PNG data URL) para los marcos de celular/computador. */
export async function cropToPreviewUrl(
  imageSrc: string,
  area: Area,
): Promise<string> {
  const image = await loadImage(imageSrc)
  return drawCrop(image, area, 640).toDataURL('image/jpeg', 0.7)
}

/**
 * Recorte final a JPEG. Si pesa de mas, baja la calidad hasta caber en
 * maxBytes (o falla con mensaje claro).
 */
export async function cropToJpeg(
  imageSrc: string,
  area: Area,
  maxEdge: number,
  maxBytes: number,
): Promise<File> {
  const image = await loadImage(imageSrc)
  const canvas = drawCrop(image, area, maxEdge)

  for (const quality of [0.88, 0.78, 0.68, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (!blob) throw new Error('No se pudo generar la imagen recortada.')
    if (blob.size <= maxBytes) {
      return new File([blob], `recorte-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      })
    }
  }

  throw new Error(
    'La imagen recortada sigue pesando más de 3 MB. Elige un recorte más pequeño o una foto de menor resolución.',
  )
}

/** Crea una URL temporal para previsualizar el archivo elegido. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('No se pudo leer el archivo.'))
    })
    reader.addEventListener('error', () =>
      reject(new Error('No se pudo leer el archivo.')),
    )
    reader.readAsDataURL(file)
  })
}

/** Valida el archivo ORIGINAL que se abre en el editor (mas permisivo). */
export function validateSourceImage(file: {
  name: string
  type: string
  size: number
}): string | null {
  const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  if (!ok.includes(file.type)) {
    return `${file.name}: formato no admitido. Usa JPG, PNG, WebP o AVIF.`
  }
  if (file.size <= 0) return `${file.name}: el archivo está vacío.`
  if (file.size > MAX_SOURCE_BYTES) {
    return `${file.name}: pesa demasiado (máximo 12 MB para editar).`
  }
  return null
}
