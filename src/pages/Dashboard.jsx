import React, { useState } from 'react'
import { Map, List, AlertTriangle, Activity, Eye, LogOut, Cpu } from 'lucide-react'
import LiveMap from '../components/map/LiveMap.jsx'
import VehicleList from '../components/panels/VehicleList.jsx'
import CommandCenter from '../components/controls/CommandCenter.jsx'
import CommandLog from '../components/panels/CommandLog.jsx'
import SOSPanel from '../components/panels/SOSPanel.jsx'
import { useVehicles } from '../hooks/useVehicles.js'
import { STATUS } from '../lib/data.js'

const VIEWS = [
  { id: 'map',   label: 'LIVE MAP',  icon: <Map size={13}/> },
  { id: 'fleet', label: 'FLEET',     icon: <List size={13}/> },
  { id: 'sos',   label: 'SOS',       icon: <AlertTriangle size={13}/> },
  { id: 'stats', label: 'NETWORK',   icon: <Activity size={13}/> },
]

export default function Dashboard({ user, onSignOut }) {
  const [view, setView] = useState('map')
  const { vehicles, selected, setSelected, sos, cmdLog, live, stats, issueCommand, resolveSos } = useVehicles()
  const role = user?.profile?.role || 'admin'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ─── Top Bar ────────────────────────────────── */}
      <header style={{ height: 48, background: 'var(--panel)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, flexShrink: 0, zIndex: 200 }}>

        {/* Logo */}
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 4, color: 'var(--accent)', textShadow: '0 0 14px rgba(0,212,255,0.4)' }}>D.A</div>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 3, color: 'var(--tdim)', paddingLeft: 10, borderLeft: '1px solid var(--border2)' }}>COMMAND CENTER</div>

        {/* Role badge */}
        <div style={{ fontSize: 7, padding: '2px 7px', background: role === 'government' ? 'rgba(176,96,255,0.1)' : role === 'super_admin' ? 'rgba(212,168,71,0.1)' : 'var(--adim)', border: `1px solid ${role === 'government' ? 'rgba(176,96,255,0.3)' : role === 'super_admin' ? 'rgba(212,168,71,0.3)' : 'rgba(0,212,255,0.3)'}`, borderRadius: 2, color: role === 'government' ? '#b060ff' : role === 'super_admin' ? 'var(--gold)' : 'var(--accent)', fontFamily: "'Share Tech Mono',monospace", letterSpacing: 2 }}>
          {role.replace('_',' ').toUpperCase()}
        </div>

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: live ? 'var(--green)' : 'var(--yellow)', boxShadow: `0 0 5px ${live ? 'var(--green)' : 'var(--yellow)'}`, animation: 'pulse 1.5s infinite' }}/>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: 'var(--tdim)' }}>{live ? 'LIVE' : 'DEMO'}</span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 2, marginLeft: 18, flex: 1 }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px',
              background: view === v.id ? 'var(--adim)' : 'transparent',
              border: `1px solid ${view === v.id ? 'rgba(0,212,255,0.3)' : 'transparent'}`,
              borderRadius: 4,
              color: view === v.id ? 'var(--accent)' : 'var(--tmid)',
              fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 1.5,
              transition: 'all 0.14s', position: 'relative',
            }}>
              {v.icon} {v.label}
              {v.id === 'sos' && sos.length > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--red)', color: '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Orbitron',sans-serif", animation: 'blink 0.8s infinite' }}>{sos.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 18, padding: '0 14px', borderLeft: '1px solid var(--border2)', borderRight: '1px solid var(--border2)' }}>
          {[
            { label: 'NODES',  val: stats.active,  col: 'var(--accent)' },
            { label: 'MOVING', val: stats.moving,  col: 'var(--green)' },
            { label: 'SOS',    val: stats.sos,     col: stats.sos > 0 ? 'var(--red)' : 'var(--tdim)', blink: stats.sos > 0 },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', animation: s.blink ? 'blink 0.9s infinite' : 'none' }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 700, color: s.col, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 7, color: 'var(--tdim)', letterSpacing: 2, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* User + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(212,168,71,0.1)', border: '1px solid rgba(212,168,71,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--gold)' }}>
            {user?.profile?.full_name?.[0] || 'A'}
          </div>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: 'var(--tmid)' }}>
            {user?.profile?.full_name?.split(' ')[0] || 'ADMIN'}
          </span>
          <button onClick={onSignOut} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', color: 'var(--tdim)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Share Tech Mono',monospace", fontSize: 9 }}>
            <LogOut size={11}/> EXIT
          </button>
        </div>
      </header>

      {/* ─── Main Body ──────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: vehicle list */}
        <VehicleList vehicles={vehicles} selected={selected} onSelect={setSelected} />

        {/* Center: active view */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {view === 'map' && <LiveMap vehicles={vehicles} selected={selected} onSelect={v => { setSelected(v); }} />}
          {view === 'fleet' && <FleetTable vehicles={vehicles} onSelect={v => { setSelected(v); setView('map') }} />}
          {view === 'sos' && <SOSPanel alerts={sos} onResolve={resolveSos} onLocate={v => { setSelected(v); setView('map') }} />}
          {view === 'stats' && <NetworkStats stats={stats} vehicles={vehicles} />}
        </div>

        {/* Right: command panel */}
        <div style={{ width: 280, background: 'var(--panel)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <Cpu size={11} style={{ color: 'var(--accent)' }}/>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--accent)' }}>COMMAND CENTER</span>
            {selected && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse 1.4s infinite' }}/>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
            <CommandCenter vehicle={selected} issueCommand={issueCommand} />
          </div>
          <CommandLog commands={cmdLog} />
        </div>
      </div>

      {/* ─── Footer ─────────────────────────────────── */}
      <footer style={{ height: 22, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 20, flexShrink: 0, background: 'rgba(0,212,255,0.015)' }}>
        {['🛰 MESH: BT/WIFI-P2P/LTE','🔐 E2E ENCRYPTED · TLS 1.3',`⚡ ${stats.active} ACTIVE NODES`].map(t => (
          <span key={t} style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: 'var(--tdim)', letterSpacing: 1 }}>{t}</span>
        ))}
        <span style={{ marginLeft: 'auto', fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: 'var(--accent)' }}>D.A COMMAND v1.0 — RESTRICTED</span>
      </footer>
    </div>
  )
}

// ── Fleet table view ─────────────────────────────────────────
function FleetTable({ vehicles, onSelect }) {
  const cols = ['PLATE','OWNER','MAKE/MODEL','STATUS','SPEED','FUEL','ROUTE','LAST SEEN']
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--tdim)', marginBottom: 12 }}>
        FLEET REGISTRY — {vehicles.length} VEHICLES
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {cols.map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 2, color: 'var(--tdim)', fontWeight: 400 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {vehicles.map(v => {
            const s = STATUS[v.status] || STATUS.offline
            return (
              <tr key={v.id} onClick={() => onSelect(v)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(0,212,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <td style={{ padding:'8px 10px', fontFamily:"'Rajdhani',sans-serif", fontSize:13, fontWeight:700, color:'#fff', letterSpacing:2 }}>{v.plate}</td>
                <td style={{ padding:'8px 10px', color:'var(--tmid)' }}>{v.owner?.name || '—'}</td>
                <td style={{ padding:'8px 10px', color:'var(--tmid)' }}>{v.make} {v.model}</td>
                <td style={{ padding:'8px 10px' }}><span style={{ color:s.color, fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:1 }}>{s.label}</span></td>
                <td style={{ padding:'8px 10px', fontFamily:"'Share Tech Mono',monospace", color:'var(--accent)' }}>{v.speed > 0 ? `${Math.round(v.speed)} km/h` : '—'}</td>
                <td style={{ padding:'8px 10px', fontFamily:"'Share Tech Mono',monospace", color:v.fuel < 15 ? 'var(--red)' : 'var(--tmid)' }}>{v.fuel != null ? `${v.fuel}%` : '—'}</td>
                <td style={{ padding:'8px 10px', color:'var(--tmid)', fontSize:10 }}>{v.route || '—'}</td>
                <td style={{ padding:'8px 10px', fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'var(--tdim)' }}>{v.seen ? new Date(v.seen).toLocaleTimeString('en-KE',{hour12:false}) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Network stats view ───────────────────────────────────────
function NetworkStats({ stats, vehicles }) {
  const byStatus = vehicles.reduce((a, v) => { a[v.status] = (a[v.status] || 0) + 1; return a }, {})
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--tdim)', marginBottom: 18 }}>NETWORK INTELLIGENCE</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 22 }}>
        {[
          { label: 'TOTAL',  val: stats.total,  col: 'var(--accent)' },
          { label: 'ACTIVE', val: stats.active, col: 'var(--green)' },
          { label: 'MOVING', val: stats.moving, col: 'var(--green)' },
          { label: 'SOS',    val: stats.sos,    col: stats.sos > 0 ? 'var(--red)' : 'var(--tdim)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--panel2)', border:'1px solid var(--border)', borderRadius:6, padding:14, textAlign:'center' }}>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:28, fontWeight:700, color:s.col, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:2, color:'var(--tdim)', marginTop:5 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:3, color:'var(--tdim)', marginBottom:12 }}>DISTRIBUTION</div>
      {Object.entries(STATUS).map(([k, v]) => (
        <div key={k} style={{ marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:v.color, letterSpacing:1 }}>{v.label}</span>
            <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:13, fontWeight:700, color:v.color }}>{byStatus[k] || 0}</span>
          </div>
          <div style={{ height:3, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', background:v.color, width:stats.total>0?`${((byStatus[k]||0)/stats.total*100)}%`:'0%', borderRadius:2, transition:'width 1s ease', boxShadow:`0 0 6px ${v.color}` }}/>
          </div>
        </div>
      ))}
      <div style={{ marginTop:22, padding:14, background:'var(--panel2)', border:'1px solid var(--border)', borderRadius:6 }}>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:3, color:'var(--tdim)', marginBottom:10 }}>MESH HEALTH</div>
        {[['PROTOCOL','BT / WIFI-P2P / LTE'],['ENCRYPTION','E2E · TLS 1.3'],['UPTIME','98.7%'],['COVERAGE','NAIROBI METRO']].map(([l,v]) => (
          <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:10, color:'var(--tmid)' }}>{l}</span>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'var(--accent)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
