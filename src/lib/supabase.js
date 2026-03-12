import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wklhcmaodxatavuoduhd.supabase.co'  // ← your real URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbGhjbWFvZHhhdGF2dW9kdWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjE4NDUsImV4cCI6MjA4ODczNzg0NX0.pogMuYADzouPL9VXXy11TWbmTC-VpG5RAIv-QD7KKNM'                      // ← your real anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
})

export const isConfigured = true
