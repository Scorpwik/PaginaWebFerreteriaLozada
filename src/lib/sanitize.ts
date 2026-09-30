// React ya escapa todo lo que se renderiza como texto, asi que aqui no
// generamos HTML ni usamos dangerouslySetInnerHTML en ninguna parte.
// Estas funciones existen para normalizar la entrada antes de guardarla:
// quitar caracteres de control, colapsar espacios y cortar largos absurdos.

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/** Texto de una sola linea: sin saltos, sin caracteres de control. */
export function cleanSingleLine(input: string, maxLength = 200): string {
  return input
    .replace(CONTROL_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

/** Texto multilinea: conserva parrafos pero normaliza el resto. */
export function cleanMultiLine(input: string, maxLength = 4000): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(CONTROL_CHARS, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()
    .slice(0, maxLength)
}

/**
 * El nombre del cliente entra al PDF y al mensaje de WhatsApp, asi que se
 * limita a caracteres de nombre y se le quita cualquier cosa que pueda
 * parecer marcado o una URL.
 */
export function cleanClientName(input: string): string {
  return cleanSingleLine(input, 80)
    .replace(/[<>&"'`\\{}[\]|^~]/g, '')
    .replace(/https?:\/\/\S+/gi, '')
    .trim()
}
