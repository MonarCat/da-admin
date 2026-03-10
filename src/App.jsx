// src/App.jsx
import React, { useState, useEffect } from 'react'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import { supabase } from './lib/supabase'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setUser({ ...session.user, profile })
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') setUser(null)
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setUser({ ...session.user, profile })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '10px', letterSpacing: '4px', color: 'var(--accent)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px',
            borderRadius: '50%',
            border: '1px solid var(--border)',
            borderTop: '1px solid var(--accent)',
            animation: 'rotateRing 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          INITIALIZING D.A COMMAND...
        </div>
      </div>
    )
  }

  return user ? (
    <AdminDashboard user={user} />
  ) : (
    <Login onLogin={setUser} />
  )
}
