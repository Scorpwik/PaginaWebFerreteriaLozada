/**
 * Reglas de las imagenes que suben los administradores. Son funciones puras
 * para poder probarlas sin navegador ni Supabase.
 */

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024

/** Tipo MIME permitido -> extension con la que se guarda en el bucket. */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export type ImageCandidate = { name: string; type: string; size: number }

/**
 * Devuelve el motivo del rechazo, o null si el archivo sirve. El mensaje
 * incluye el nombre porque se pueden subir varios a la vez.
 */
export function validateImageFile(file: ImageCandidate): string | null {
  if (!(file.type in IMAGE_EXTENSIONS)) {
    return `${file.name}: formato no admitido. Usa JPG, PNG, WebP o AVIF.`
  }
  if (file.size <= 0) {
    return `${file.name}: el archivo está vacío.`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return `${file.name}: pesa ${mb} MB y el máximo es 3 MB. Redúcela antes de subirla.`
  }
  return null
}

/**
 * La extension sale del tipo MIME validado, no del nombre: un archivo llamado
 * "foto.exe" con tipo image/png no debe quedar guardado como .exe.
 */
export function extensionFor(type: string): string {
  return IMAGE_EXTENSIONS[type] ?? 'jpg'
}

/** Ruta del objeto dentro del bucket a partir de su URL publica. */
export function storagePathFromUrl(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`
  const index = url.indexOf(marker)
  if (index < 0) return null
  const raw = url.slice(index + marker.length).split('?')[0]
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}
