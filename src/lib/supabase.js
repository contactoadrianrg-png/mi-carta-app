import { createClient } from '@supabase/supabase-js'

// Strip whitespace and any non-printable-ASCII characters that break HTTP headers
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  ?.replace(/[^\x20-\x7E]/g, '')
  .trim()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
