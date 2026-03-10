// src/components/panels/SOSPanel.jsx
import React, { useState } from 'react'
import { AlertTriangle, CheckCircle, MapPin } from 'lucide-react'

export function SOSPanel({ alerts, onResolve, onSelect }) {
  const [resolveNote, setResolveNote] = useState({})

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', letterSpacing: '3px', color: 'var(--text-dim)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertTriangle size={11} style={{ color: 'var(--red)' }} />
        ACTIVE SOS EVENTS — {alerts.length} UNRESOLVED
      </div>
      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)', fontFamily: "'Share Tech Mono',monospace", fontSize: '10px' }}>
          <CheckCircle size={24} style={{ color: 'var(--green)', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
          ALL CLEAR — NO ACTIVE SOS
        </div>
      ) : alerts.map(sos => (
        <div key={sos.id} style={{
          marginBottom: '12px', padding: '14px',
          background: 'rgba(255,45,68,0.06)',
          border: '1px solid rgba(255,45,68,0.4)',
          borderRadius: '6px',
          animation: 'blink 1.2s infinite',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: '13px', color: '#fff', letterSpacing: '2px' }}>
                {sos.vehicle?.plate || sos.vehicle_id}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-mid)', marginTop: '3px' }}>
                {sos.vehicle?.make} {sos.vehicle?.model}
              </div>
              {sos.message && (
                <div style={{ marginTop: '6px', padding: '5px 8px', background: 'rgba(255,45,68,0.08)', borderRadius: '3px', fontSize: '10px', color: 'var(--text)', fontStyle: 'italic' }}>
                  "{sos.message}"
                </div>
              )}
            </div>
            <button onClick={() => onSelect(sos.vehicle)} style={{
              background: 'transparent', border: '1px solid rgba(0,212,255,0.3)',
              borderRadius: '4px', padding: '4px 8px',
              color: 'var(--accent)', cursor: 'pointer',
              fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', letterSpacing: '1px',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <MapPin size={10} /> LOCATE
            </button>
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '8px' }}>
            <MapPin size={10} style={{ color: 'var(--red)' }} />
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', color: 'var(--text-dim)' }}>
              {sos.lat?.toFixed(4)}, {sos.lng?.toFixed(4)}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'var(--text-dim)' }}>
              {new Date(sos.created_at).toLocaleTimeString('en-KE', { hour12: false })}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            <input
              value={resolveNote[sos.id] || ''}
              onChange={e => setResolveNote(p => ({ ...p, [sos.id]: e.target.value }))}
              placeholder="Response notes..."
              style={{
                flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: '4px', padding: '5px 8px',
                color: 'var(--text)', fontFamily: "'Exo 2',sans-serif", fontSize: '10px', outline: 'none',
              }}
            />
            <button onClick={() => onResolve(sos.id, resolveNote[sos.id] || 'Resolved')} style={{
              background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.3)',
              borderRadius: '4px', padding: '5px 10px',
              color: 'var(--green)', cursor: 'pointer',
              fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', letterSpacing: '1px',
            }}>
              RESOLVE
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── CommandLog ─────────────────────────────────────────────────
export function CommandLog({ commands }) {
  const STATUS_COLORS = {
    pending: 'var(--accent)', delivered: 'var(--green)',
    executed: 'var(--green)', failed: 'var(--red)',
    timeout: 'var(--orange)', acknowledged: 'var(--yellow)',
  }

  return (
    <div style={{
      height: '160px', borderTop: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{
        padding: '6px 12px',
        borderBottom: '1px solid var(--border)',
        fontFamily: "'Share Tech Mono',monospace",
        fontSize: '8px', letterSpacing: '3px', color: 'var(--text-dim)',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        COMMAND LOG
        {commands.some(c => c.status === 'pending') && (
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.2s infinite', boxShadow: '0 0 5px var(--accent)' }} />
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {commands.slice(0, 15).map(cmd => (
          <div key={cmd.id} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '3px 4px', borderRadius: '3px',
            fontSize: '9px',
            animation: cmd.status === 'pending' ? 'cmdPending 1.5s infinite' : 'none',
          }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: STATUS_COLORS[cmd.status] || 'var(--text-dim)', flexShrink: 0 }} />
            <span style={{ fontFamily: "'Share Tech Mono',monospace", color: 'var(--text-mid)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cmd.vehicle?.plate} · {cmd.command_type?.replace(/_/g,' ').toUpperCase()}
            </span>
            <span style={{ color: STATUS_COLORS[cmd.status], fontSize: '8px', flexShrink: 0 }}>
              {cmd.status?.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── NetworkStats ────────────────────────────────────────────────
export function NetworkStats({ stats, vehicles }) {
  const byStatus = vehicles.reduce((acc, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1; return acc
  }, {})

  const data = [
    { label: 'MOVING',  value: byStatus.moving || 0,  color: 'var(--green)', max: stats.total },
    { label: 'PARKED',  value: byStatus.parked || 0,  color: 'var(--yellow)', max: stats.total },
    { label: 'STALLED', value: byStatus.stalled || 0, color: 'var(--orange)', max: stats.total },
    { label: 'SOS',     value: byStatus.sos || 0,     color: 'var(--red)', max: stats.total },
    { label: 'OFFLINE', value: byStatus.offline || 0, color: 'var(--text-dim)', max: stats.total },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', letterSpacing: '3px', color: 'var(--text-dim)', marginBottom: '20px' }}>
        NETWORK INTELLIGENCE
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'TOTAL NODES', value: stats.total, color: 'var(--accent)' },
          { label: 'ACTIVE NOW', value: stats.active, color: 'var(--green)' },
          { label: 'MOVING', value: stats.moving, color: 'var(--green)' },
          { label: 'SOS ACTIVE', value: stats.sos, color: stats.sos > 0 ? 'var(--red)' : 'var(--text-dim)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--panel2)', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '14px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: '28px', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', letterSpacing: '2px', color: 'var(--text-dim)', marginTop: '6px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', letterSpacing: '3px', color: 'var(--text-dim)', marginBottom: '12px' }}>
        DISTRIBUTION BY STATUS
      </div>
      {data.map(d => (
        <div key={d.label} style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', color: d.color, letterSpacing: '1px' }}>{d.label}</span>
            <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: '14px', fontWeight: 700, color: d.color }}>{d.value}</span>
          </div>
          <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: d.color,
              width: d.max > 0 ? `${(d.value / d.max * 100)}%` : '0%',
              borderRadius: '2px',
              transition: 'width 1s ease',
              boxShadow: `0 0 6px ${d.color}`,
            }} />
          </div>
        </div>
      ))}

      <div style={{ marginTop: '24px', padding: '14px', background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: '6px' }}>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', letterSpacing: '3px', color: 'var(--text-dim)', marginBottom: '10px' }}>MESH HEALTH</div>
        {[
          { label: 'AVG MESH HOPS', value: stats.avg_mesh_hops },
          { label: 'PROTOCOL', value: 'BT / WIFI-P2P / LTE' },
          { label: 'ENCRYPTION', value: 'E2E · TLS 1.3' },
          { label: 'UPTIME', value: '98.7%' },
        ].map(m => (
          <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-mid)' }}>{m.label}</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '10px', color: 'var(--accent)' }}>{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── AuditPanel ──────────────────────────────────────────────────
export function AuditPanel() {
  return (
    <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', letterSpacing: '3px', color: 'var(--text-dim)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        AUDIT LOG — ALL ADMIN ACTIONS (IMMUTABLE)
      </div>
      <div style={{ padding: '20px', background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: '6px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'Share Tech Mono',monospace", fontSize: '10px' }}>
        Connect Supabase to view full audit trail.<br/>
        <span style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '6px', display: 'block' }}>
          Every command, login, and override is permanently logged with timestamp, user, IP, and target.
        </span>
      </div>
    </div>
  )
}

export default SOSPanel
