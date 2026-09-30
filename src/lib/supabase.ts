import { createClient } from '@supabase/supabase-js'
import { env } from './env'
import type { Database } from './types.database'

// Unico cliente de la app y unica clave que llega al navegador.
// La service role key jamas se importa aqui: vive en los secrets de las
// Edge Functions y solo se usa del lado servidor.
export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
)

export const functionsUrl = `${env.supabaseUrl}/functions/v1`
