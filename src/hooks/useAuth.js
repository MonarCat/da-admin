import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { DEMO_VEHICLES, DEMO_ADMIN_PROFILE } from '../utils/vehicleOptions.js'
 
export function useAuth() {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo]   = useState(false)
 
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000)
 
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      clearTimeout(timeout)
      if (s?.user) { setSession(s); await hydrate(s.user) }
      setLoading(false)
    }).catch(() => { clearTimeout(timeout); setLoading(false) })
 
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        console.log('Auth event:', event)
        if (event === 'SIGNED_IN' && s?.user) { setSession(s); await hydrate(s.user) }
        if (event === 'SIGNED_OUT' && !isDemo) { setUser(null); setProfile(null); setSession(null) }
      }
    )
    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])
 
  async function hydrate(u) {
    try {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      if (p) { setUser(u); setProfile(p); return }
    } catch {}
    try {
      const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'User'
      const { data: newP } = await supabase.from('profiles')
        .upsert({ id:u.id, full_name:name, phone:u.user_metadata?.phone||null, role:'driver', is_active:true, clearance_level:1, avatar_initials:name[0].toUpperCase() }, { onConflict:'id' })
        .select().single()
      setUser(u); setProfile(newP || { id:u.id, full_name:name, role:'driver' })
    } catch { setUser(u); setProfile({ id:u.id, full_name:u.email?.split('@')[0], role:'driver' }) }
  }
 
  function demo() {
    setIsDemo(true); setLoading(false)
    setUser({ id:'demo-admin', email:'demo@da.command' })
    setProfile(DEMO_ADMIN_PROFILE)
  }
  function exitDemo() { setIsDemo(false); setUser(null); setProfile(null); setSession(null) }
 
  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error; return data
  }
 
  async function signOut() {
    if (isDemo) { exitDemo(); return }
    setUser(null); setProfile(null); setSession(null)
    await supabase.auth.signOut()
  }
 
  return { user, session, profile, loading, isDemo, isAuthenticated: !!user, signIn, signOut, demo }
}
