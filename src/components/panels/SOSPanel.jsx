import React, { useState } from 'react'
import { AlertTriangle, CheckCircle, MapPin } from 'lucide-react'

export default function SOSPanel({ alerts, onResolve, onLocate }) {
  const [notes, setNotes] = useState({})

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--tdim)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={11} style={{ color: 'var(--red)' }}/>
        SOS EVENTS — {alerts.length} UNRESOLVED
      </div>

      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <CheckCircle size={26} style={{ color: 'var(--green)', margin: '0 auto 12px', display: 'block' }}/>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: 'var(--tdim)', letterSpacing: 2 }}>ALL CLEAR — NO ACTIVE SOS</div>
        </div>
      ) : alerts.map(s => (
        <div key={s.id} style={{ marginBottom: 12, padding: 13, background: 'var(--rdim)', border: '1px solid rgba(255,45,68,0.4)', borderRadius: 6, animation: 'blink 1.2s ease-in-out infinite' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, color: '#fff', letterSpacing: 2 }}>
                {s.vehicle?.plate || s.plate || s.id}
              </div>
              <div style={{ fontSize: 10, color: 'var(--tmid)', marginTop: 3 }}>
                {s.vehicle?.make} {s.vehicle?.model} · {s.owner?.name || s.vehicle?.owner}
              </div>
              {s.msg && (
                <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(255,45,68,0.1)', borderRadius: 3, fontSize: 10, color: 'var(--text)', fontStyle: 'italic' }}>
                  "{s.msg || s.message}"
                </div>
              )}
            </div>
            {onLocate && (
              <button onClick={() => onLocate(s)} style={{ background: 'transparent', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 4, padding: '4px 8px', color: 'var(--accent)', fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={9}/> MAP
              </button>
            )}
          </div>

          {(s.lat || s.lng) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
              <MapPin size={9} style={{ color: 'var(--red)' }}/>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: 'var(--tdim)' }}>
                {Number(s.lat).toFixed(4)}, {Number(s.lng).toFixed(4)}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--tdim)' }}>
                {new Date(s.created_at || Date.now()).toLocaleTimeString('en-KE', { hour12: false })}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <input value={notes[s.id] || ''} onChange={e => setNotes(p => ({ ...p, [s.id]: e.target.value }))}
              placeholder="Response notes..."
              style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '5px 8px', color: 'var(--text)', fontFamily: "'Exo 2',sans-serif", fontSize: 10, outline: 'none' }} />
            <button onClick={() => onResolve(s.id, notes[s.id] || 'Resolved')} style={{ background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.35)', borderRadius: 4, padding: '5px 10px', color: 'var(--green)', fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 1 }}>
              RESOLVE
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
