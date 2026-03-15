import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  Shield, Radio, Zap, Lock, AlertTriangle, Volume2,
  Eye, CheckCircle, XCircle, ChevronDown, ChevronUp,
  RefreshCw, Target, Wifi, Cpu,
} from 'lucide-react'

const PHASE_ORDER = ['surveillance','mesh_broadcast','audio_alert','alarm','lockdown','engine_control','recovered']

const PHASE_META = {
  surveillance:   { label:'SURVEILLANCE',    color:'var(--accent)',  icon:<Eye size={11}/>           },
  mesh_broadcast: { label:'MESH BROADCAST',  color:'var(--purple)', icon:<Wifi size={11}/>          },
  audio_alert:    { label:'AUDIO ALERT',     color:'var(--yellow)', icon:<Volume2 size={11}/>       },
  alarm:          { label:'ALARM',           color:'var(--orange)', icon:<AlertTriangle size={11}/> },
  lockdown:       { label:'LOCKDOWN',        color:'#ff6b00',       icon:<Lock size={11}/>          },
  engine_control: { label:'ENGINE CONTROL',  color:'var(--red)',    icon:<Cpu size={11}/>           },
  recovered:      { label:'RECOVERED',       color:'var(--green)',  icon:<CheckCircle size={11}/>   },
}

const PHASE_COMMANDS = {
  surveillance:   ['ACTIVATE_TRACKING','MESH_SCAN','DASHCAM_REQUEST','LOCATE_TARGET'],
  mesh_broadcast: ['BROADCAST_NEARBY','ALERT_AUTHORITIES','BROADCAST_PLATE'],
  audio_alert:    ['AUDIO_STOLEN_WARNING','AUDIO_SIREN','PASSENGER_ANNOUNCE'],
  alarm:          ['ALARM_ACTIVATE','LIGHTS_FLASH','HORN_CONTINUOUS'],
  lockdown:       ['SAFE_STEER_INITIATE','HAZARDS_ON','LOCK_DOORS','LOCK_WINDOWS'],
  engine_control: ['ENGINE_THROTTLE_50','ENGINE_THROTTLE_25','ENGINE_CUT'],
  recovered:      ['DEACTIVATE_ALL','UNLOCK_VEHICLE','SEND_RECOVERY_REPORT'],
}

const THREAT_COLORS = { 1:'var(--accent)', 2:'var(--yellow)', 3:'var(--orange)', 4:'var(--red)', 5:'#ff0022' }

async function apiCall(path, method = 'GET', body = null) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`/api/shadow-mesh${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json
}

export default function ShadowMesh({ profile }) {
  const [pursuits, setPursuits]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [expanded, setExpanded]       = useState(null)
  const [activateOpen, setActivateOpen] = useState(false)

  // Activate form state
  const [form, setForm]               = useState({ plate:'', reason:'', caseRef:'', threat:1 })
  const [activating, setActivating]   = useState(false)
  const [activateError, setActivateError] = useState(null)

  // Per-pursuit command state
  const [cmdBusy, setCmdBusy]         = useState({})
  const [cmdFeedback, setCmdFeedback] = useState({})
  const [suspendBusy, setSuspendBusy] = useState({})

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await apiCall('/active')
      setPursuits(data.pursuits || [])
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function activate() {
    if (!form.plate || !form.reason) return
    setActivating(true); setActivateError(null)
    try {
      await apiCall('/activate', 'POST', {
        target_plate:   form.plate.toUpperCase().trim(),
        reason:         form.reason,
        case_reference: form.caseRef || null,
        threat_level:   Number(form.threat),
      })
      setForm({ plate:'', reason:'', caseRef:'', threat:1 })
      setActivateOpen(false)
      await load()
    } catch(e) {
      setActivateError(e.message)
    } finally {
      setActivating(false)
    }
  }

  async function issueCommand(pursuit, command) {
    const key = `${pursuit.id}:${command}`
    setCmdBusy(b => ({...b, [key]: true}))
    setCmdFeedback(f => ({...f, [key]: null}))
    try {
      await apiCall('/command', 'POST', { pursuit_id: pursuit.id, command })
      setCmdFeedback(f => ({...f, [key]: { ok:true, msg: command }}))
      await load()
    } catch(e) {
      setCmdFeedback(f => ({...f, [key]: { ok:false, msg: e.message }}))
    } finally {
      setCmdBusy(b => ({...b, [key]: false}))
    }
  }

  async function suspendPursuit(pursuitId) {
    setSuspendBusy(b => ({...b, [pursuitId]: true}))
    try {
      await apiCall('/suspend', 'POST', { pursuit_id: pursuitId, reason: 'Manually suspended' })
      await load()
    } catch(e) {
      setError(e.message)
    } finally {
      setSuspendBusy(b => ({...b, [pursuitId]: false}))
    }
  }

  const mono = "'Share Tech Mono',monospace"
  const orbitron = "'Orbitron',sans-serif"

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)', overflow:'hidden', fontFamily:"'Exo 2',sans-serif" }}>

      {/* TOP BAR */}
      <header style={{ height:50, background:'var(--panel)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 16px', gap:12, flexShrink:0, zIndex:300 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Shield size={16} style={{ color:'var(--red)' }}/>
          <span style={{ fontFamily:orbitron, fontSize:13, fontWeight:800, letterSpacing:4, color:'var(--red)' }}>SHADOW MESH</span>
          <span style={{ fontSize:7, padding:'2px 7px', background:'rgba(255,45,68,0.1)', border:'1px solid rgba(255,45,68,0.3)', borderRadius:2, color:'var(--red)', fontFamily:mono, letterSpacing:2 }}>SUPER ADMIN</span>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontFamily:mono, fontSize:9, color:'var(--tdim)' }}>
            {(profile?.full_name || 'OPERATOR').toUpperCase()}
          </span>
          <button onClick={load} disabled={loading}
            style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:4, padding:'4px 10px', color:'var(--accent)', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontFamily:mono, fontSize:9, letterSpacing:1 }}>
            <RefreshCw size={10} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/> REFRESH
          </button>
          <button onClick={()=>{ setActivateOpen(o=>!o); setActivateError(null) }}
            style={{ background:activateOpen?'rgba(255,45,68,0.12)':'transparent', border:'1px solid rgba(255,45,68,0.4)', borderRadius:4, padding:'4px 10px', color:'var(--red)', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontFamily:mono, fontSize:9, letterSpacing:1 }}>
            <Target size={10}/> ACTIVATE PURSUIT
          </button>
        </div>
      </header>

      {/* ACTIVATE PANEL */}
      {activateOpen && (
        <div style={{ background:'rgba(255,45,68,0.06)', borderBottom:'1px solid rgba(255,45,68,0.25)', padding:'12px 16px', flexShrink:0, display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
          {[
            { label:'TARGET PLATE', key:'plate',   placeholder:'KXX 000X', width:120 },
            { label:'REASON',       key:'reason',  placeholder:'Stolen vehicle report', width:240 },
            { label:'CASE REF',     key:'caseRef', placeholder:'Optional', width:140 },
          ].map(({ label, key, placeholder, width }) => (
            <div key={key}>
              <div style={{ fontFamily:mono, fontSize:7, color:'var(--tdim)', letterSpacing:2, marginBottom:4 }}>{label}</div>
              <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:key==='plate'?e.target.value.toUpperCase():e.target.value}))}
                placeholder={placeholder}
                style={{ width, background:'var(--panel2)', border:'1px solid var(--border)', borderRadius:3, padding:'5px 8px', color:'var(--text)', fontFamily:mono, fontSize:10, outline:'none' }}/>
            </div>
          ))}
          <div>
            <div style={{ fontFamily:mono, fontSize:7, color:'var(--tdim)', letterSpacing:2, marginBottom:4 }}>THREAT LEVEL</div>
            <select value={form.threat} onChange={e=>setForm(f=>({...f,threat:e.target.value}))}
              style={{ background:'var(--panel2)', border:'1px solid var(--border)', borderRadius:3, padding:'5px 8px', color:THREAT_COLORS[form.threat]||'var(--text)', fontFamily:mono, fontSize:10, outline:'none' }}>
              {[1,2,3,4,5].map(n=><option key={n} value={n}>LEVEL {n}</option>)}
            </select>
          </div>
          <button onClick={activate} disabled={activating || !form.plate || !form.reason}
            style={{ background:'rgba(255,45,68,0.15)', border:'1px solid rgba(255,45,68,0.5)', borderRadius:4, padding:'7px 16px', color:'var(--red)', cursor:'pointer', fontFamily:mono, fontSize:9, letterSpacing:1, opacity:(!form.plate||!form.reason)?0.4:1 }}>
            {activating ? 'ACTIVATING...' : 'CONFIRM ACTIVATE'}
          </button>
          {activateError && <span style={{ fontFamily:mono, fontSize:9, color:'var(--red)' }}>{activateError}</span>}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{ flex:1, overflowY:'auto', padding:16 }}>

        {/* Error */}
        {error && (
          <div style={{ padding:'10px 14px', background:'rgba(255,45,68,0.08)', border:'1px solid rgba(255,45,68,0.3)', borderRadius:4, fontFamily:mono, fontSize:10, color:'var(--red)', marginBottom:12 }}>
            ⚠ {error}
          </div>
        )}

        {/* Loading */}
        {loading && !pursuits.length && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:40 }}>
            <div style={{ width:20, height:20, borderRadius:'50%', border:'1px solid var(--border)', borderTop:'1px solid var(--red)', animation:'spin 1s linear infinite' }}/>
            <span style={{ fontFamily:mono, fontSize:9, letterSpacing:3, color:'var(--red)' }}>LOADING PURSUITS...</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !pursuits.length && !error && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:60 }}>
            <Radio size={32} style={{ color:'rgba(255,45,68,0.2)' }}/>
            <div style={{ fontFamily:mono, fontSize:10, letterSpacing:3, color:'var(--tdim)' }}>NO ACTIVE PURSUITS</div>
            <div style={{ fontSize:11, color:'var(--tdim)', opacity:0.6 }}>Activate a pursuit using the button above</div>
          </div>
        )}

        {/* Pursuits */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {pursuits.map(pursuit => {
            const phase = PHASE_META[pursuit.current_phase] || PHASE_META.surveillance
            const isExpanded = expanded === pursuit.id
            const phaseIdx = PHASE_ORDER.indexOf(pursuit.current_phase)

            return (
              <div key={pursuit.id}
                style={{ background:'var(--panel)', border:`1px solid ${pursuit.status==='active'?'rgba(255,45,68,0.3)':'var(--border)'}`, borderRadius:4, overflow:'hidden' }}>

                {/* Pursuit header */}
                <div onClick={()=>setExpanded(isExpanded ? null : pursuit.id)}
                  style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>

                  {/* Threat badge */}
                  <div style={{ width:28, height:28, borderRadius:'50%', background:`rgba(255,45,68,0.1)`, border:`1px solid ${THREAT_COLORS[pursuit.threat_level]||'var(--red)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:orbitron, fontSize:11, fontWeight:800, color:THREAT_COLORS[pursuit.threat_level]||'var(--red)', flexShrink:0 }}>
                    {pursuit.threat_level}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                      <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:16, fontWeight:700, color:'#fff', letterSpacing:2 }}>{pursuit.target_plate}</span>
                      {pursuit.vehicle && (
                        <span style={{ fontFamily:mono, fontSize:9, color:'var(--tmid)' }}>
                          {pursuit.vehicle.make} {pursuit.vehicle.model}
                        </span>
                      )}
                      <span style={{ marginLeft:'auto', padding:'2px 7px', background:pursuit.status==='active'?'rgba(255,45,68,0.1)':'rgba(255,255,255,0.04)', border:`1px solid ${pursuit.status==='active'?'rgba(255,45,68,0.4)':'var(--border)'}`, borderRadius:2, fontFamily:mono, fontSize:7, color:pursuit.status==='active'?'var(--red)':'var(--tdim)', letterSpacing:2 }}>
                        {(pursuit.status||'active').toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontFamily:mono, fontSize:9, color:'var(--tdim)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {pursuit.reason}
                      {pursuit.case_reference && <span style={{ marginLeft:10, color:'var(--tmid)' }}>REF: {pursuit.case_reference}</span>}
                    </div>
                  </div>

                  {/* Phase indicator */}
                  <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 8px', background:`rgba(0,0,0,0.3)`, border:`1px solid ${phase.color}33`, borderRadius:3 }}>
                    <span style={{ color:phase.color }}>{phase.icon}</span>
                    <span style={{ fontFamily:mono, fontSize:8, color:phase.color, letterSpacing:1 }}>{phase.label}</span>
                  </div>

                  {isExpanded ? <ChevronUp size={14} style={{ color:'var(--tdim)', flexShrink:0 }}/> : <ChevronDown size={14} style={{ color:'var(--tdim)', flexShrink:0 }}/>}
                </div>

                {/* Phase progress bar */}
                <div style={{ height:2, background:'var(--border)', display:'flex' }}>
                  {PHASE_ORDER.map((p, i) => (
                    <div key={p} style={{ flex:1, background: i <= phaseIdx ? (PHASE_META[p]?.color||'var(--accent)') : 'transparent', opacity: i <= phaseIdx ? 1 : 0.15, borderRight:'1px solid var(--bg)' }}/>
                  ))}
                </div>

                {/* Expanded: command panels */}
                {isExpanded && (
                  <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:14 }}>

                    {/* Commands by phase — show recovered only when pursuit is in recovered phase */}
                    {PHASE_ORDER.filter(p => p !== 'recovered' || pursuit.current_phase === 'recovered').map(ph => {
                      const pmeta = PHASE_META[ph]
                      const cmds  = PHASE_COMMANDS[ph]
                      const phIdx = PHASE_ORDER.indexOf(ph)
                      const isCurrentOrPast = phIdx <= phaseIdx
                      const isAccessible    = phIdx <= phaseIdx + 1

                      return (
                        <div key={ph} style={{ opacity: isAccessible ? 1 : 0.35 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                            <span style={{ color: pmeta.color }}>{pmeta.icon}</span>
                            <span style={{ fontFamily:mono, fontSize:8, color: pmeta.color, letterSpacing:2 }}>{pmeta.label}</span>
                            {isCurrentOrPast && phIdx < phaseIdx && (
                              <span style={{ marginLeft:4, fontFamily:mono, fontSize:7, color:'var(--tdim)' }}>✓ COMPLETED</span>
                            )}
                          </div>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                            {cmds.map(cmd => {
                              const key = `${pursuit.id}:${cmd}`
                              const busy = cmdBusy[key]
                              const fb   = cmdFeedback[key]
                              const issued = pursuit.commands?.some(c => c.command === cmd)
                              return (
                                <button key={cmd}
                                  onClick={() => isAccessible && !busy && issueCommand(pursuit, cmd)}
                                  disabled={!isAccessible || busy}
                                  style={{
                                    background: issued ? `${pmeta.color}18` : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${issued ? pmeta.color+'55' : 'var(--border)'}`,
                                    borderRadius:3, padding:'4px 9px', color: issued ? pmeta.color : 'var(--tmid)',
                                    fontFamily:mono, fontSize:8, letterSpacing:1, cursor:isAccessible?'pointer':'not-allowed',
                                    opacity: !isAccessible ? 0.4 : 1,
                                    position:'relative',
                                  }}>
                                  {busy ? '...' : cmd.replace(/_/g,' ')}
                                  {fb?.ok && <span style={{ marginLeft:5, color:'var(--green)' }}>✓</span>}
                                  {fb && !fb.ok && <span style={{ marginLeft:5, color:'var(--red)', fontSize:7 }} title={fb.msg}>✗</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}

                    {/* Suspend button */}
                    {pursuit.status === 'active' && (
                      <div style={{ marginTop:4, paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
                        <button onClick={()=>suspendPursuit(pursuit.id)} disabled={suspendBusy[pursuit.id]}
                          style={{ background:'transparent', border:'1px solid rgba(255,200,44,0.4)', borderRadius:3, padding:'4px 12px', color:'var(--yellow)', fontFamily:mono, fontSize:8, letterSpacing:1, cursor:'pointer' }}>
                          {suspendBusy[pursuit.id] ? 'SUSPENDING...' : 'SUSPEND PURSUIT'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ height:24, background:'rgba(255,45,68,0.02)', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 14px', gap:20, flexShrink:0 }}>
        {['🔴 SHADOW OPS ACTIVE', '🔒 SUPER ADMIN CHANNEL', '⚡ ENCRYPTED'].map(t=>(
          <span key={t} style={{ fontFamily:mono, fontSize:8, color:'var(--tdim)', letterSpacing:1 }}>{t}</span>
        ))}
        <span style={{ marginLeft:'auto', fontFamily:mono, fontSize:8, color:'var(--red)' }}>SHADOW MESH v0.1</span>
      </footer>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
