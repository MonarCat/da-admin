import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const ADMIN_ROLES = ['admin', 'super_admin', 'government', 'fleet_manager']

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      if (s?.user) await hydrate(s.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)
      if (event === 'SIGNED_OUT') { setUser(null); setSession(null) }
      if (event === 'SIGNED_IN' && s?.user) await hydrate(s.user)
      if (event === 'TOKEN_REFRESHED') setSession(s)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function hydrate(u) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, org:organizations(name,type,license_tier)')
        .eq('id', u.id)
        .single()

      if (error || !profile) throw new Error('Profile not found')
      if (!profile.is_active) { await supabase.auth.signOut(); throw new Error('Account deactivated') }
      if (!ADMIN_ROLES.includes(profile.role)) {
        await supabase.auth.signOut()
        throw new Error(`Role '${profile.role}' does not have admin access`)
      }

      setUser({ ...u, profile })
    } catch (e) {
      console.warn('Auth hydration:', e.message)
      setUser(null)
    }
    setLoading(false)
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // Track login via API
    try {
      await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${data.session?.access_token}` }
      })
    } catch {}
    return data
  }

  // Demo mode — bypasses Supabase entirely
  function demo() {
    const demoUser = {
      id:    'demo-super-admin',
      email: 'demo@da-command.gov',
      profile: {
        full_name:       'Demo Operator',
        role:            'super_admin',
        clearance_level: 10,
        is_active:       true,
        org:             { name: 'D.A Command', type: 'government' },
        avatar_initials: 'D',
      }
    }
    setUser(demoUser)
    setSession({ access_token: 'demo-token', user: demoUser })
  }

  function signOut() {
    setUser(null)
    setSession(null)
    supabase.auth.signOut()
  }

  return { user, session, loading, signIn, demo, signOut }
}
