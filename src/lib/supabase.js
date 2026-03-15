import { createClient } from '@supabase/supabase-js'
 
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://wklhcmaodxatavuoduhd.supabase.co'
 
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbGhjbWFvZHhhdGF2dW9kdWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjE4NDUsImV4cCI6MjA4ODczNzg0NX0.pogMuYADzouPL9VXXy11TWbmTC-VpG5RAIv-QD7KKNM'
 
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: { params: { eventsPerSecond: 10 } },
})
