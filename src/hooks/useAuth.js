import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const TIMEOUT_MS = 5000 // give up after 5 seconds

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Hard timeout — ALWAYS resolve loading after 5s no matter what
    const timeout = setTimeout(() => {
      console.warn('Auth timeout — forcing loading to false')
      setLoading(false)
    }, TIMEOUT_MS)

    supabase.auth.getSession().then(async ({ data: { session: s }, error }) => {
      clearTimeout(timeout)
      if (error || !s?.user) {
        setLoading(false)
        return
      }
      setSession(s)
      await hydrate(s.user, s.access_token)
      setLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_OUT')  { setUser(null); setProfile(null); setSession(null) }
      if (event === 'SIGNED_IN' && s?.user) {
        setSession(s)
        await hydrate(s.user, s.access_token)
      }
    })

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  async function hydrate(u, token) {
    // Layer 1 — try API
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3000)
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json()
        setUser(u)
        setProfile(data.profile)
        return
      }
    } catch {}

    // Layer 2 — direct Supabase query
    try {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single()

      if (p) { setUser(u); setProfile(p); return }
    } catch {}

    // Layer 3 — bare minimum, never block
    setUser(u)
    setProfile({ id: u.id, full_name: u.email?.split('@')[0] ?? 'User', role: 'driver' })
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
    setProfile({ id: 'demo', full_name: 'Demo Operator', role: 'super_admin', clearance_level: 10, is_active: true })
    setLoading(false)
  }

  return { user, session, profile, loading, isAuthenticated: !!user, signIn, signOut, demo }
}
