// src/pages/Login.jsx
import React, { useState } from 'react'
import { Shield, Eye, EyeOff, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (!profile || !['admin','super_admin','government','fleet_manager'].includes(profile.role)) {
        await supabase.auth.signOut()
        throw new Error('Insufficient clearance level for this terminal')
      }

      onLogin({ ...data.user, profile })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }} className="scanlines">

      {/* Background grid */}
      <div className="grid-bg" style={{ position: 'absolute', inset: 0 }} />

      {/* Radar rings */}
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          position: 'absolute',
          width: '600px', height: '600px',
          borderRadius: '50%',
          border: '1px solid rgba(0,212,255,0.05)',
          top: '50%', left: '50%',
          transform: `translate(-50%,-50%) scale(${1 + i * 0.5})`,
          animation: `ripple ${3 + i}s ease-out infinite`,
          animationDelay: `${i * 0.8}s`,
        }} />
      ))}

      {/* Login Card */}
      <div style={{
        width: '340px',
        background: 'var(--panel)',
        border: '1px solid var(--border2)',
        borderRadius: '8px',
        padding: '32px',
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 0 60px rgba(0,212,255,0.08)',
      }} className="animate-fade">

        {/* Corner decorations */}
        {[['0','0','right','down'], ['auto','0','left','down'], ['0','auto','right','up'], ['auto','auto','left','up']].map(([t,b,lr,ud], i) => (
          <div key={i} style={{
            position: 'absolute',
            top: t !== 'auto' ? 0 : undefined,
            bottom: b !== 'auto' ? 0 : undefined,
            [lr === 'right' ? 'right' : 'left']: 0,
            width: '16px', height: '16px',
            borderTop: ud === 'down' ? '1px solid var(--accent)' : undefined,
            borderBottom: ud === 'up' ? '1px solid var(--accent)' : undefined,
            borderRight: lr === 'right' ? '1px solid var(--accent)' : undefined,
            borderLeft: lr === 'left' ? '1px solid var(--accent)' : undefined,
          }} />
        ))}

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px', height: '52px',
            borderRadius: '50%',
            border: '1px solid rgba(0,212,255,0.3)',
            background: 'rgba(0,212,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 0 20px rgba(0,212,255,0.1)',
          }}>
            <Shield size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '20px', fontWeight: 800,
            letterSpacing: '6px', color: 'var(--accent)',
            textShadow: '0 0 20px rgba(0,212,255,0.4)',
          }}>
            D.A
          </div>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '8px', letterSpacing: '4px',
            color: 'var(--text-dim)', marginTop: '4px',
          }}>
            COMMAND CENTER
          </div>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '7px', letterSpacing: '2px',
            color: 'rgba(255,45,68,0.6)', marginTop: '6px',
          }}>
            ⚠ RESTRICTED ACCESS — AUTHORIZED PERSONNEL ONLY
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', letterSpacing: '2px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>
              OPERATOR ID
            </label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@agency.gov"
              required
              style={{
                width: '100%', background: 'rgba(0,212,255,0.04)',
                border: '1px solid var(--border2)', borderRadius: '4px',
                padding: '10px 12px', color: 'var(--text)',
                fontFamily: "'Share Tech Mono',monospace", fontSize: '12px',
                outline: 'none', letterSpacing: '1px',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border2)'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', letterSpacing: '2px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>
              ACCESS CODE
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{
                  width: '100%', background: 'rgba(0,212,255,0.04)',
                  border: '1px solid var(--border2)', borderRadius: '4px',
                  padding: '10px 36px 10px 12px', color: 'var(--text)',
                  fontFamily: "'Share Tech Mono',monospace", fontSize: '14px',
                  outline: 'none', letterSpacing: '4px',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: 'absolute', right: '10px', top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-dim)',
              }}>
                {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              marginBottom: '14px', padding: '8px 10px',
              background: 'rgba(255,45,68,0.08)',
              border: '1px solid rgba(255,45,68,0.3)',
              borderRadius: '4px', fontSize: '10px',
              color: 'var(--red)', fontFamily: "'Exo 2',sans-serif",
              display: 'flex', alignItems: 'center', gap: '6px',
            }} className="animate-slide-down">
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? 'rgba(0,212,255,0.05)' : 'rgba(0,212,255,0.1)',
              border: '1px solid rgba(0,212,255,0.4)',
              borderRadius: '4px',
              color: 'var(--accent)',
              fontFamily: "'Orbitron',sans-serif",
              fontSize: '12px', letterSpacing: '3px', fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s',
              boxShadow: '0 0 20px rgba(0,212,255,0.1)',
            }}
          >
            {loading ? <Loader size={14} style={{ animation: 'rotateRing 1s linear infinite' }} /> : <Shield size={14} />}
            {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
          </button>
        </form>

        <div style={{
          marginTop: '16px', textAlign: 'center',
          fontFamily: "'Share Tech Mono',monospace",
          fontSize: '8px', letterSpacing: '2px',
          color: 'var(--text-dim)',
        }}>
          ALL SESSIONS MONITORED AND LOGGED
        </div>
      </div>
    </div>
  )
}
