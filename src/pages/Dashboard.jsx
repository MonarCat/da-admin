import React, { useState } from 'react'
import { useVehicles } from '../hooks/useVehicles.js'
import { useNotifications } from '../hooks/useNotifications.js'
import LiveMap      from '../components/map/LiveMap.jsx'
import VehicleList  from '../components/panels/VehicleList.jsx'
import SOSPanel     from '../components/panels/SOSPanel.jsx'
import CommandCenter from '../components/controls/CommandCenter.jsx'
import CommandLog   from '../components/panels/CommandLog.jsx'
import { Shield, Map, List, AlertTriangle, Radio, LogOut, Activity, Bell, CheckCircle, Cpu } from 'lucide-react'
import Verification from './Verification.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

const TABS = [
  { id:'map',    label:'LIVE MAP',  icon:<Map size={12}/>           },
  { id:'fleet',  label:'FLEET',     icon:<List size={12}/>          },
  { id:'sos',    label:'SOS',       icon:<AlertTriangle size={12}/> },
  { id:'inbox',  label:'INBOX',     icon:<Bell size={12}/>          },
  { id:'verify', label:'VERIFY',    icon:<CheckCircle size={12}/>   },
]

export default function Dashboard({ user, profile, session, onSignOut, isDemo = false }) {
  const [tab, setTab] = useState('map')
  const {
    vehicles, loading, networkStats,
    selectedVehicle, setSelectedVehicle,
    sosAlerts, commandLog,
    issueCommand, resolveSOS,
  } = useVehicles(isDemo)
  const { notifications, unread, markRead, markAllRead } = useNotifications(isDemo)

  const role      = profile?.role || 'admin'
  const initials  = (profile?.full_name || 'A')[0].toUpperCase()
  const sosCount  = sosAlerts.length

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)', overflow:'hidden', fontFamily:"'Exo 2',sans-serif" }}>

      {/* TOP BAR */}
      <header style={{ height:50, background:'var(--panel)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 16px', gap:12, flexShrink:0, zIndex:300 }}>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Shield size={16} style={{ color:'var(--accent)' }}/>
          <span style={{ fontFamily:"'Orbitron',sans-serif", fontSize:14, fontWeight:800, letterSpacing:4, color:'var(--accent)' }}>D.A</span>
          <span style={{ fontSize:8, letterSpacing:3, color:'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", paddingLeft:8, borderLeft:'1px solid var(--border)' }}>COMMAND</span>
          <span style={{ fontSize:7, padding:'2px 7px', background:'rgba(212,168,71,0.1)', border:'1px solid rgba(212,168,71,0.3)', borderRadius:2, color:'var(--gold)', fontFamily:"'Share Tech Mono',monospace", letterSpacing:2 }}>
            {role.toUpperCase().replace('_',' ')}
          </span>
        </div>

        {/* Nav tabs */}
        <nav style={{ display:'flex', gap:4, marginLeft:16 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:tab===t.id?'rgba(0,212,255,0.1)':'transparent', border:`1px solid ${tab===t.id?'rgba(0,212,255,0.3)':'transparent'}`, borderRadius:4, color:tab===t.id?'var(--accent)':'var(--tmid)', cursor:'pointer', fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:1, position:'relative' }}>
              {t.icon} {t.label}
              {t.id==='sos' && sosCount>0 && (
                <span style={{ position:'absolute', top:-4, right:-4, background:'var(--red)', color:'#fff', borderRadius:'50%', width:14, height:14, fontSize:8, display:'flex', alignItems:'center', justifyContent:'center', animation:'blink 0.8s infinite' }}>{sosCount}</span>
              )}
              {t.id==='inbox' && unread>0 && (
                <span style={{ position:'absolute', top:-4, right:-4, background:'var(--red)', color:'#fff', borderRadius:'50%', width:14, height:14, fontSize:8, display:'flex', alignItems:'center', justifyContent:'center', animation:'blink 0.8s infinite' }}>{unread}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Stats */}
        <div style={{ display:'flex', alignItems:'center', gap:16, marginLeft:'auto' }}>
          {[['NODES', networkStats.active, 'var(--accent)'], ['MOVING', networkStats.moving, 'var(--green)'], ['SOS', networkStats.sos, networkStats.sos>0?'var(--red)':'var(--tdim)']].map(([l,v,c])=>(
            <div key={l} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:14, fontWeight:700, color:c, lineHeight:1 }}>{v}</div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, letterSpacing:2, color:'var(--tdim)' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User */}
        <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:12, borderLeft:'1px solid var(--border)' }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(212,168,71,0.1)', border:'1px solid rgba(212,168,71,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--gold)' }}>{initials}</div>
          <span style={{ fontSize:10, color:'var(--tmid)', fontFamily:"'Share Tech Mono',monospace" }}>
            {profile?.full_name?.split(' ')[0] || 'ADMIN'}
          </span>
          <button onClick={onSignOut} style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', color:'var(--tdim)', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:9, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1 }}>
            <LogOut size={10}/> EXIT
          </button>
        </div>
      </header>

      {/* DEMO BANNER */}
      {isDemo && (
        <div style={{ background:'rgba(212,168,71,0.12)', borderBottom:'1px solid rgba(212,168,71,0.35)', padding:'5px 16px', display:'flex', alignItems:'center', gap:10, flexShrink:0, zIndex:200 }}>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:2, color:'var(--gold)' }}>⚠ DEMO MODE — 8 simulated vehicles · no live data · commands are mocked</span>
          <button onClick={onSignOut} style={{ marginLeft:'auto', background:'transparent', border:'1px solid rgba(212,168,71,0.4)', borderRadius:3, padding:'2px 8px', color:'var(--gold)', cursor:'pointer', fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:1 }}>EXIT DEMO</button>
        </div>
      )}

      {/* MAIN */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Left — vehicle list */}
        <VehicleList
          vehicles={vehicles}
          loading={loading}
          selectedVehicle={selectedVehicle}
          onSelect={setSelectedVehicle}
          sosAlerts={sosAlerts}
        />

        {/* Center */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
          {loading ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', border:'1px solid var(--border)', borderTop:'1px solid var(--accent)', animation:'spin 1s linear infinite' }}/>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:3, color:'var(--accent)' }}>LOADING FLEET...</span>
            </div>
          ) : (
            <>
              {tab === 'map' && (
                <LiveMap
                  vehicles={vehicles}
                  selectedVehicle={selectedVehicle}
                  onVehicleSelect={setSelectedVehicle}
                />
              )}
              {tab === 'fleet' && <FleetTable vehicles={vehicles} onSelect={setSelectedVehicle} />}
              {tab === 'sos'   && <SOSPanel alerts={sosAlerts} onResolve={resolveSOS} onSelect={v=>{setSelectedVehicle(v);setTab('map')}} />}
              {tab === 'inbox'  && <InboxPanel notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} />}
              {tab === 'verify' && <Verification vehicles={vehicles} isDemo={isDemo} />}
            </>
          )}

          {/* Empty state */}
          {!loading && vehicles.length === 0 && (
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', zIndex:10 }}>
              <Radio size={32} style={{ color:'rgba(0,212,255,0.2)', margin:'0 auto 14px', display:'block' }}/>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:3, color:'var(--tdim)', marginBottom:8 }}>NO VEHICLES ON NETWORK</div>
              <div style={{ fontSize:11, color:'var(--tdim)', opacity:0.6 }}>Vehicles will appear here when drivers register and connect</div>
            </div>
          )}
        </div>

        {/* Right — command panel */}
        <div style={{ width:280, background:'var(--panel)', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
          <CommandCenter vehicle={selectedVehicle} issueCommand={issueCommand} />
          <CommandLog commands={commandLog} />
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ height:24, background:'rgba(0,212,255,0.02)', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 14px', gap:20, flexShrink:0 }}>
        {['📡 MESH NETWORK', '🔒 E2E ENCRYPTED · TLS 1.3', '⚡ REALTIME'].map(t=>(
          <span key={t} style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:'var(--tdim)', letterSpacing:1 }}>{t}</span>
        ))}
        <span style={{ marginLeft:'auto', fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:'var(--accent)' }}>D.A COMMAND v0.1</span>
      </footer>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}

function FleetTable({ vehicles, onSelect }) {
  if (vehicles.length === 0) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
      <List size={28} style={{ color:'rgba(255,255,255,0.1)' }}/>
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:3, color:'var(--tdim)' }}>NO FLEET DATA</div>
    </div>
  )

  return (
    <div style={{ flex:1, overflowY:'auto', padding:16 }}>
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:3, color:'var(--tdim)', marginBottom:12 }}>
        FLEET REGISTRY — {vehicles.length} VEHICLE{vehicles.length!==1?'S':''}
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
        <thead>
          <tr style={{ borderBottom:'1px solid var(--border)' }}>
            {['PLATE','OWNER','MAKE/MODEL','STATUS','SPEED','FUEL','VERIFIED'].map(h=>(
              <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:2, color:'var(--tdim)', fontWeight:400 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehicles.map(v => {
            const sc = { moving:'var(--green)', parked:'var(--yellow)', sos:'var(--red)', offline:'var(--tdim)' }
            const vc = { verified:'var(--green)', pending:'var(--yellow)', rejected:'var(--red)', flagged:'#ff9500' }
            return (
              <tr key={v.id} onClick={()=>onSelect(v)} style={{ borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(0,212,255,0.03)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{ padding:'8px 10px', fontFamily:"'Rajdhani',sans-serif", fontSize:13, fontWeight:700, color:'#fff', letterSpacing:2 }}>{v.plate}</td>
                <td style={{ padding:'8px 10px', color:'var(--tmid)' }}>{v.owner?.full_name || '—'}</td>
                <td style={{ padding:'8px 10px', color:'var(--tmid)' }}>{v.make} {v.model}</td>
                <td style={{ padding:'8px 10px' }}><span style={{ color:sc[v.status]||'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", fontSize:9 }}>{(v.status||'—').toUpperCase()}</span></td>
                <td style={{ padding:'8px 10px', fontFamily:"'Share Tech Mono',monospace", color:'var(--accent)' }}>{v.speed>0?`${Math.round(v.speed)} km/h`:'—'}</td>
                <td style={{ padding:'8px 10px', fontFamily:"'Share Tech Mono',monospace", color:v.fuel_level<15?'var(--red)':'var(--tmid)' }}>{v.fuel_level!=null?`${v.fuel_level}%`:'—'}</td>
                <td style={{ padding:'8px 10px' }}><span style={{ color:vc[v.verification_status]||'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", fontSize:9 }}>{(v.verification_status||'pending').toUpperCase()}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function InboxPanel({ notifications, onMarkRead, onMarkAllRead }) {
  const unreadCount = notifications.filter(n => !n.read).length

  if (notifications.length === 0) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
      <Bell size={28} style={{ color:'rgba(255,255,255,0.1)' }}/>
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:3, color:'var(--tdim)' }}>NO NOTIFICATIONS</div>
    </div>
  )

  return (
    <div style={{ flex:1, overflowY:'auto', padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:3, color:'var(--tdim)' }}>
          INBOX — {notifications.length} NOTIFICATION{notifications.length!==1?'S':''}{unreadCount>0?` · ${unreadCount} UNREAD`:''}
        </div>
        {unreadCount > 0 && (
          <button onClick={onMarkAllRead} style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:3, padding:'3px 8px', color:'var(--tmid)', cursor:'pointer', fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:1 }}>
            MARK ALL READ
          </button>
        )}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {notifications.map(n => (
          <div key={n.id} onClick={() => !n.read && onMarkRead(n.id)}
            style={{ padding:12, background:n.read?'transparent':'rgba(0,212,255,0.04)', border:`1px solid ${n.read?'var(--border)':'rgba(0,212,255,0.2)'}`, borderRadius:4, cursor:n.read?'default':'pointer' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:4 }}>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:1, color:n.read?'var(--tmid)':'var(--accent)', fontWeight:n.read?400:700 }}>{n.title}</span>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:'var(--tdim)', whiteSpace:'nowrap', flexShrink:0 }}>
                {new Date(n.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
              </span>
            </div>
            <div style={{ fontSize:11, color:'var(--tmid)', marginBottom:n.vehicle||n.from_user?6:0 }}>{n.body}</div>
            {(n.vehicle || n.from_user) && (
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                {n.from_user && (
                  <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:'var(--tdim)' }}>
                    👤 {n.from_user.full_name} · {n.from_user.phone}
                  </span>
                )}
                {n.vehicle && (
                  <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, color:'var(--tdim)' }}>
                    🚗 {n.vehicle.plate} · {n.vehicle.year} {n.vehicle.make} {n.vehicle.model} · {(n.vehicle.registration_category||'').toUpperCase()}
                  </span>
                )}
              </div>
            )}
            {!n.read && (
              <div style={{ marginTop:4, width:6, height:6, borderRadius:'50%', background:'var(--accent)' }}/>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
