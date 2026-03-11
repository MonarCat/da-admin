import { createClient } from '@supabase/supabase-js'

// Netlify's Supabase integration sets these exact names:
// VITE_SUPABASE_DATABASE_URL  = project URL
// VITE_SUPABASE_ANON_KEY      = anon/public key
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_DATABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = !!(SUPABASE_URL && SUPABASE_KEY)

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_KEY || 'placeholder-anon-key',
  {
    realtime: { params: { eventsPerSecond: 15 } },
    auth: { persistSession: true, autoRefreshToken: true }
  }
)
