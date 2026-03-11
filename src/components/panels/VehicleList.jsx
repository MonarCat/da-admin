import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { STATUS, timeSince } from '../../lib/data.js'

const FILTERS = ['all','moving','sos','parked','stalled','fleet','offline']

export default function VehicleList({ vehicles, selected, onSelect }) {
  const [q, setQ]   = useState('')
  const [f, setF]   = useState('all')

  const list = vehicles.filter(v => {
    const match = !q || v.plate?.toLowerCase().includes(q.toLowerCase()) ||
      v.owner?.name?.toLowerCase().includes(q.toLowerCase()) ||
      v.route?.toLowerCase().includes(q.toLowerCase())
    const filt = f === 'all' || v.status === f || (f === 'fleet' && v.tier === 'fleet') || (f === 'fleet' && v.tier === 'government')
    return match && filt
  })

  return (
    <aside style={{
      width: 224, background: 'var(--panel)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 11px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 3, color: 'var(--tdim)', marginBottom: 8 }}>
          VEHICLE REGISTRY
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--tdim)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="plate / owner / route..."
            style={{ width: '100%', background: 'rgba(0,212,255,0.04)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 8px 6px 26px', color: 'var(--text)', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 7, flexWrap: 'wrap' }}>
          {FILTERS.map(fi => (
            <button key={fi} onClick={() => setF(fi)} style={{
              padding: '2px 5px', fontSize: 7, letterSpacing: 1,
              fontFamily: "'Share Tech Mono',monospace",
              border: `1px solid ${f === fi ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 2,
              background: f === fi ? 'var(--adim)' : 'transparent',
              color: f === fi ? 'var(--accent)' : 'var(--tdim)',
            }}>{fi.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '5px 6px' }}>
        {list.map(v => {
          const s   = STATUS[v.status] || STATUS.offline
          const sel = selected?.id === v.id
          const sos = v.status === 'sos'
          return (
            <div key={v.id} onClick={() => onSelect(v)} style={{
              padding: '8px 9px', marginBottom: 4, borderRadius: 4, cursor: 'pointer',
              border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
              borderLeft: `3px solid ${s.color}`,
              background: sel ? 'rgba(0,212,255,0.04)' : 'transparent',
              transition: 'all 0.12s',
              animation: sos ? 'blink 1s ease-in-out infinite' : 'none',
            }}
              onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(0,212,255,0.03)' }}
              onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 2 }}>{v.plate}</span>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: v.speed > 0 ? 'var(--accent)' : 'var(--tdim)' }}>
                  {v.speed > 0 ? `${Math.round(v.speed)}km/h` : '—'}
                </span>
              </div>

              <div style={{ fontSize: 9, color: 'var(--tmid)', marginTop: 2 }}>
                {v.owner?.name || 'Unassigned'}
              </div>

              {sos && v.msg && (
                <div style={{ fontSize: 8, color: 'var(--red)', marginTop: 3, padding: '2px 5px', background: 'var(--rdim)', borderRadius: 2 }}>
                  ⚠ {v.msg}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, boxShadow: `0 0 4px ${s.color}` }} />
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: s.color, letterSpacing: 1 }}>{s.label}</span>
                <span style={{ fontSize: 8, color: 'var(--tdim)', marginLeft: 'auto' }}>{timeSince(v.seen)}</span>
              </div>
            </div>
          )
        })}

        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 10px', fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: 'var(--tdim)', letterSpacing: 2 }}>
            NO VEHICLES MATCH
          </div>
        )}
      </div>
    </aside>
  )
}
