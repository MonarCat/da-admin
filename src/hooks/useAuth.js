import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useAuth() {
  const [user, setUser]     = useState(null)
  const [loading, setLoad]  = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await hydrate(session.user)
      setLoad(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (e, session) => {
      if (e === 'SIGNED_OUT') setUser(null)
      if (e === 'SIGNED_IN' && session?.user) await hydrate(session.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function hydrate(u) {
    try {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      if (p && ['admin','super_admin','government','fleet_manager'].includes(p.role)) {
        setUser({ ...u, profile: p }); return
      }
      await supabase.auth.signOut()
    } catch {}
    setUser(null)
    setLoad(false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  function demo() {
    setUser({ id:'demo', email:'demo@da.gov', profile:{ full_name:'Demo Operator', role:'super_admin', organization:'D.A Command' } })
  }

  function signOut() { setUser(null); supabase.auth.signOut() }

  return { user, loading, signIn, demo, signOut }
}
