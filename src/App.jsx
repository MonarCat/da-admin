import React, { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth.js'
import Login from './pages/Login.jsx'
import AdminSignUp from './pages/AdminSignUp.jsx'
import Dashboard from './pages/Dashboard.jsx'

export default function App() {
  const { user, session, loading, signIn, demo, signOut } = useAuth()
  const [page, setPage] = useState('login') // login | signup
  const [loadingTooLong, setLoadingTooLong] = useState(false)

  useEffect(() => {
    if (!loading) {
      setLoadingTooLong(false)
      return
    }
    const t = setTimeout(() => setLoadingTooLong(true), 4000)
    return () => clearTimeout(t)
  }, [loading])

  // Check URL for /signup route
  const path = window.location.pathname
  if (!loading && !user && path.startsWith('/signup') && page !== 'signup') {
    setPage('signup')
  }

  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:14 }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'1px solid var(--border)', borderTop:'1px solid var(--accent)', animation:'spin 1s linear infinite' }}/>
      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:4, color:'var(--accent)' }}>INITIALIZING...</span>
      {loadingTooLong && (
        <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:2, color:'var(--muted)', marginTop:8 }}>
          Taking longer than usual… please wait
        </span>
      )}
    </div>
  )

  if (!user) {
    if (page === 'signup') return (
      <AdminSignUp onSuccess={() => setPage('login')} onBackToLogin={() => setPage('login')} />
    )
    return (
      <Login
        onLogin={signIn}
        onDemo={demo}
        onSignUp={() => setPage('signup')}
      />
    )
  }

  return <Dashboard user={user} session={session} onSignOut={signOut} />
}
