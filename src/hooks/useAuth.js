import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      if (s?.user) await hydrate(s.user, s.access_token)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)
      if (event === 'SIGNED_OUT')  { setUser(null); setProfile(null) }
      if (event === 'SIGNED_IN' && s?.user) await hydrate(s.user, s.access_token)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function hydrate(u, token) {
    // Layer 1 — try the API function
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(u)
        setProfile(data.profile)
        return
      }
    } catch {}

    // Layer 2 — query Supabase directly
    try {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single()

      if (p) {
        setUser(u)
        setProfile(p)
        return
      }

      // Layer 3 — profile missing, create it on the fly
      const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'User'
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: u.id,
          full_name: name,
          phone: u.user_metadata?.phone || null,
          role: 'driver',
          is_active: true,
          clearance_level: 1,
          avatar_initials: name[0].toUpperCase(),
        })
        .select()
        .single()

      setUser(u)
      setProfile(newProfile || { id: u.id, full_name: name, role: 'driver' })

    } catch (e) {
      console.warn('Auth hydration failed:', e.message)
      // Layer 4 — let them in with bare minimum, admin can fix later
      setUser(u)
      setProfile({ id: u.id, full_name: u.email, role: 'driver' })
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    setUser(null); setProfile(null); setSession(null)
    await supabase.auth.signOut()
  }

  function demo() {
    setUser({ id: 'demo', email: 'demo@da.local' })
    setProfile({
      id: 'demo',
      full_name: 'Demo Operator',
      role: 'super_admin',
      clearance_level: 10,
      is_active: true,
    })
  }

  return {
    user, session, profile, loading,
    isAuthenticated: !!user,
    signIn, signOut, demo,
  }
}
