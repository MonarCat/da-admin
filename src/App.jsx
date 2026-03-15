import React, { useState }  from 'react'
import { useAuth }           from './hooks/useAuth.js'
import Login                  from './pages/Login.jsx'
import AdminSignUp            from './pages/AdminSignUp.jsx'
import Dashboard              from './pages/Dashboard.jsx'
import ShadowMesh             from './pages/ShadowMesh.jsx'
 
export default function App() {
  const { user, session, profile, loading, isDemo, signIn, signOut, demo } = useAuth()
  const [page, setPage] = useState('login')
 
  // Hidden route — shadow ops
  const isShadowOps = window.location.pathname === '/shadow-ops'
  if (user && isShadowOps) return <ShadowMesh profile={profile} />
 
  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:14 }}>
      <div style={{ width:40, height:40, borderRadius:'50%', border:'1px solid var(--border)', borderTop:'1px solid var(--accent)', animation:'spin 1s linear infinite' }}/>
      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:4, color:'var(--accent)' }}>INITIALIZING...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
 
  if (!user) {
    if (page === 'signup') return <AdminSignUp onSuccess={()=>setPage('login')} onBack={()=>setPage('login')} />
    return <Login onLogin={signIn} onDemo={demo} onSignUp={()=>setPage('signup')} />
  }
 
  return <Dashboard user={user} session={session} profile={profile} isDemo={isDemo} onSignOut={signOut} />
}
