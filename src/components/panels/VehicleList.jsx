// src/components/panels/VehicleList.jsx
import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { STATUS_CONFIG, getTimeSince } from '../../lib/vehicleConfig'

export default function VehicleList({ vehicles, loading, selectedVehicle, onSelect, sosAlerts }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase()
    const matchQ = !q || v.plate?.toLowerCase().includes(q) || v.owner?.full_name?.toLowerCase().includes(q) || v.current_route?.toLowerCase().includes(q)
    const matchF = filter === 'all' || v.status === filter || (filter === 'fleet' && v.subscription_tier === 'fleet')
    return matchQ && matchF
  })

  return (
    <aside style={{
      width: '230px', background: 'var(--panel)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', letterSpacing: '3px', color: 'var(--text-dim)', marginBottom: '8px' }}>VEHICLE REGISTRY</div>
        <div style={{ position: 'relative' }}>
          <Search size={11} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: '100%', background: 'rgba(0,212,255,0.04)', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px 8px 6px 26px', color: 'var(--text)', fontFamily: "'Share Tech Mono',monospace", fontSize: '10px', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: '3px', marginTop: '6px', flexWrap: 'wrap' }}>
          {['all','moving','sos','parked','fleet'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '2px 6px', border: `1px solid ${filter===f ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '2px', background: filter===f ? 'var(--accent-dim)' : 'transparent',
              color: filter===f ? 'var(--accent)' : 'var(--text-dim)',
              fontFamily: "'Share Tech Mono',monospace", fontSize: '7px', letterSpacing: '1px', cursor: 'pointer',
            }}>{f.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', letterSpacing: '2px' }}>LOADING...</div>
        ) : filtered.map(v => {
          const cfg = STATUS_CONFIG[v.status] || STATUS_CONFIG.offline
          const isSos = v.status === 'sos'
          const isSelected = selectedVehicle?.id === v.id
          return (
            <div key={v.id} onClick={() => onSelect(v)} style={{
              padding: '8px 10px',
              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
              borderLeft: `3px solid ${cfg.color}`,
              borderRadius: '4px', marginBottom: '4px', cursor: 'pointer',
              background: isSelected ? 'rgba(0,212,255,0.04)' : 'transparent',
              animation: isSos ? 'blink 0.9s infinite' : 'none',
              transition: 'all 0.12s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '2px' }}>{v.plate}</span>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', color: v.speed > 0 ? 'var(--accent)' : 'var(--text-dim)' }}>{v.speed > 0 ? `${Math.round(v.speed)}km/h` : '—'}</span>
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-mid)', marginTop: '2px' }}>{v.owner?.full_name || 'Unassigned'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }} />
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: '8px', color: cfg.color, letterSpacing: '1px' }}>{cfg.label}</span>
                <span style={{ fontSize: '8px', color: 'var(--text-dim)', marginLeft: 'auto' }}>{getTimeSince(v.last_seen)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
