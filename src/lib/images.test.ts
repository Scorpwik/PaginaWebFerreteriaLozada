import { describe, expect, it } from 'vitest'
import {
  extensionFor,
  MAX_IMAGE_BYTES,
  storagePathFromUrl,
  validateImageFile,
} from './images'

const MB = 1024 * 1024

describe('validateImageFile', () => {
  it('acepta JPG, PNG, WebP y AVIF dentro del limite', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/avif']) {
      expect(validateImageFile({ name: 'a', type, size: 1 * MB })).toBeNull()
    }
  })

  it('acepta un archivo de exactamente 3 MB', () => {
    expect(
      validateImageFile({ name: 'a.jpg', type: 'image/jpeg', size: MAX_IMAGE_BYTES }),
    ).toBeNull()
  })

  it('rechaza mas de 3 MB e indica el nombre y el peso', () => {
    const message = validateImageFile({
      name: 'grande.jpg',
      type: 'image/jpeg',
      size: 3 * MB + 1,
    })
    expect(message).toContain('grande.jpg')
    expect(message).toContain('3 MB')
  })

  it('rechaza formatos que no son imagen web', () => {
    expect(
      validateImageFile({ name: 'x.pdf', type: 'application/pdf', size: 1000 }),
    ).toContain('formato no admitido')
    expect(
      validateImageFile({ name: 'x.svg', type: 'image/svg+xml', size: 1000 }),
    ).not.toBeNull()
    expect(validateImageFile({ name: 'x', type: '', size: 1000 })).not.toBeNull()
  })

  it('rechaza archivos vacios', () => {
    expect(
      validateImageFile({ name: 'v.png', type: 'image/png', size: 0 }),
    ).toContain('vacío')
  })
})

describe('extensionFor', () => {
  it('usa el tipo MIME y no el nombre del archivo', () => {
    expect(extensionFor('image/png')).toBe('png')
    expect(extensionFor('image/jpeg')).toBe('jpg')
    expect(extensionFor('application/x-msdownload')).toBe('jpg')
  })
})

describe('storagePathFromUrl', () => {
  const base = 'https://x.supabase.co/storage/v1/object/public/product-images'

  it('extrae la ruta dentro del bucket', () => {
    expect(storagePathFromUrl(`${base}/abc/123.jpg`, 'product-images')).toBe(
      'abc/123.jpg',
    )
  })

  it('ignora parametros de la URL', () => {
    expect(storagePathFromUrl(`${base}/abc/123.jpg?t=1`, 'product-images')).toBe(
      'abc/123.jpg',
    )
  })

  it('devuelve null si la URL no es del bucket', () => {
    expect(storagePathFromUrl('https://otro.com/foto.jpg', 'product-images')).toBeNull()
    expect(storagePathFromUrl(`${base}/`, 'product-images')).toBeNull()
  })
})
