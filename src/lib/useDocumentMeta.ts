import { useEffect } from 'react'

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  )
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = url
}

export type DocumentMeta = {
  title: string
  description?: string
  image?: string
  noIndex?: boolean
}

/** SEO por pagina sin traer una libreria de head management. */
export function useDocumentMeta({
  title,
  description,
  image,
  noIndex = false,
}: DocumentMeta) {
  useEffect(() => {
    document.title = title
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:type', 'website')
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title)

    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
      setMeta('name', 'twitter:description', description)
    }

    if (image) {
      setMeta('property', 'og:image', image)
      setMeta('name', 'twitter:image', image)
    }

    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow')
    setMeta('property', 'og:url', window.location.href)
    setCanonical(window.location.origin + window.location.pathname)
  }, [title, description, image, noIndex])
}

/**
 * Datos estructurados de negocio local. Se inyecta una sola vez y se limpia
 * al desmontar para no duplicar el bloque entre navegaciones.
 */
export function useStructuredData(data: object | null) {
  useEffect(() => {
    if (!data) return

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(data)
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [data])
}
