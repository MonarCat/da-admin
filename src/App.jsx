// src/App.jsx
import React, { useState, useEffect } from 'react'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import { supabase, isSupabaseConfigured } from './lib/supabase'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

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

  if (!isSupabaseConfigured) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
        fontFamily: "'Share Tech Mono', monospace",
        color: 'var(--accent)',
        padding: '24px',
      }}>
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ fontSize: '14px', letterSpacing: '4px', marginBottom: '24px', color: 'var(--danger, #ff4444)' }}>
            MISSING CONFIGURATION
          </h1>
          <p style={{ fontSize: '11px', letterSpacing: '2px', lineHeight: '1.8', marginBottom: '24px', opacity: 0.8 }}>
            Supabase environment variables are not set.
          </p>
          <div style={{
            background: 'var(--bg-2, #111)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '16px',
            textAlign: 'left',
            fontSize: '10px',
            letterSpacing: '1px',
            lineHeight: '2',
          }}>
            <div style={{ color: 'var(--muted, #888)', marginBottom: '8px' }}># Add to your .env file:</div>
            <div>VITE_SUPABASE_URL=https://your-project-id.supabase.co</div>
            <div>VITE_SUPABASE_ANON_KEY=your-anon-key-here</div>
          </div>
          <p style={{ fontSize: '10px', letterSpacing: '2px', marginTop: '16px', opacity: 0.6 }}>
            Get these from: Supabase Dashboard › Project Settings › API
          </p>
        </div>
      </div>
    )
  }

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
