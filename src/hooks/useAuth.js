import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('Auth timeout — forcing loading to false')
      setLoading(false)
    }, 6000)

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      clearTimeout(timeout)
      if (s?.user) {
        setSession(s)
        await hydrate(s.user)
      }
      setLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        console.log('Auth event:', event)
        if (event === 'SIGNED_IN' && s?.user) {
          setSession(s)
          await hydrate(s.user)
        }
        if (event === 'SIGNED_OUT') {
          setUser(null); setProfile(null); setSession(null)
        }
      }
    )

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  async function hydrate(u) {
    // Go direct to Supabase — skip the broken /api/auth/me
    try {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single()

      if (p) { setUser(u); setProfile(p); return }
    } catch {}

    // Profile missing — create it
    try {
      const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'User'
      const { data: newP } = await supabase
        .from('profiles')
        .upsert({
          id: u.id,
          full_name: name,
          phone: u.user_metadata?.phone || null,
          role: 'driver',
          is_active: true,
          clearance_level: 1,
          avatar_initials: name[0].toUpperCase(),
        }, { onConflict: 'id' })
        .select()
        .single()
      setUser(u)
      setProfile(newP || { id: u.id, full_name: name, role: 'driver' })
    } catch {
      setUser(u)
      setProfile({ id: u.id, full_name: u.email?.split('@')[0], role: 'driver' })
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
    setLoading(false)
    setUser({ id: 'demo', email: 'demo@da.local' })
    setProfile({ id:'demo', full_name:'Demo Operator', role:'super_admin', clearance_level:10, is_active:true })
  }

  return { user, session, profile, loading, isAuthenticated: !!user, signIn, signOut, demo }
}
