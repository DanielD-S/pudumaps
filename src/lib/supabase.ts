import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
if (!url || !key) console.warn('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
export const supabase = createClient(url, key)
