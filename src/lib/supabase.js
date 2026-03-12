jsimport { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_DATABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug — remove after confirming it works
console.log('[supabase] URL:', SUPABASE_URL)
console.log('[supabase] KEY:', SUPABASE_KEY ? SUPABASE_KEY.slice(0, 20) + '...' : 'MISSING')

if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder')) {
  console.error('❌ VITE_SUPABASE_DATABASE_URL is not set. Check Netlify env vars.')
}

export const isConfigured = !!(
  SUPABASE_URL &&
  SUPABASE_KEY &&
  !SUPABASE_URL.includes('placeholder')
)

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
)
```
