/**
 * Redespliega la Edge Function create-quote en Supabase.
 * Requiere SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens, o `supabase login`).
 *
 * Uso (PowerShell, desde la raíz del repo):
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
 *   node scripts/deploy-create-quote.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRef = 'qepfvvfuhbthzmwbfvos'
const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error(
    'Falta SUPABASE_ACCESS_TOKEN. Crea uno en https://supabase.com/dashboard/account/tokens\n' +
      'o ejecuta: npx supabase login',
  )
  process.exit(1)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fnDir = join(root, 'supabase', 'functions', 'create-quote')

const files = ['index.ts', 'pdf.ts'].map((name) => ({
  name,
  content: readFileSync(join(fnDir, name), 'utf8'),
}))

const body = {
  entrypoint_path: 'index.ts',
  verify_jwt: true,
  files,
}

const url = `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=create-quote`
const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
})

const text = await res.text()
if (!res.ok) {
  console.error('Deploy falló:', res.status, text)
  process.exit(1)
}

console.log('Deploy OK:', text)
console.log(
  'Prueba: genera una cotización NUEVA y descarga el PDF (los viejos no cambian).',
)
