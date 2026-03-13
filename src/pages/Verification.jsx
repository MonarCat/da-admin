import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  CheckCircle, XCircle, AlertTriangle, Eye,
  Clock, User, Car, Phone, ChevronDown, ChevronUp, Search
} from 'lucide-react'

const STATUS_CONFIG = {
  pending:      { color:'#ffd700', label:'PENDING',      icon:<Clock size={11}/>       },
  verified:     { color:'#00ff9d', label:'VERIFIED',     icon:<CheckCircle size={11}/> },
  rejected:     { color:'#ff2d44', label:'REJECTED',     icon:<XCircle size={11}/>    },
  flagged:      { color:'#ff9500', label:'FLAGGED',      icon:<AlertTriangle size={11}/> },
  under_review: { color:'#00d4ff', label:'UNDER REVIEW', icon:<Eye size={11}/>         },
}

const CAT_LABELS = {
  private:'Private', government:'Government', diplomat:'Diplomat',
  police:'Police', military:'KDF', psv:'PSV',
  ngo:'NGO', foreign:'Foreign', commercial:'Commercial',
}

export default function Verification({ vehicles, isDemo, onVehicleUpdated }) {
  const [expanded, setExpanded]   = useState(null)
  const [action, setAction]       = useState({})   // vehicleId → selected action
  const [notes, setNotes]         = useState({})    // vehicleId → note text
  const [busy, setBusy]           = useState({})
  const [feedback, setFeedback]   = useState({})
  const [filter, setFilter]       = useState('pending')
  const [search, setSearch]       = useState('')

  const filtered = vehicles
    .filter(v => filter === 'all' || (v.verification_status||'pending') === filter)
    .filter(v => !search || v.plate?.toLowerCase().includes(search.toLowerCase())
      || v.owner?.full_name?.toLowerCase().includes(search.toLowerCase()))

  async function submitVerification(vehicle) {
    const act  = action[vehicle.id]
    if (!act) return
    setBusy(b => ({...b, [vehicle.id]: true}))
    setFeedback(f => ({...f, [vehicle.id]: null}))

    try {
      if (isDemo) {
        await new Promise(r => setTimeout(r, 800))
        setFeedback(f => ({...f, [vehicle.id]: { ok:true, msg:`Demo: ${vehicle.plate} marked ${act}` }}))
        if (onVehicleUpdated) onVehicleUpdated(vehicle.id, act)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/verify-vehicle', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          action:     act,
          note:       notes[vehicle.id] || null,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      setFeedback(f => ({...f, [vehicle.id]: { ok:true, msg:`${vehicle.plate} → ${act.toUpperCase()}` }}))
      if (onVehicleUpdated) onVehicleUpdated(vehicle.id, act)
      setExpanded(null)

    } catch(e) {
      setFeedback(f => ({...f, [vehicle.id]: { ok:false, msg: e.message }}))
    } finally {
      setBusy(b => ({...b, [vehicle.id]: false}))
    }
  }

  return (
    <div style={{ flex:1, overflowY:'auto', padding:16, fontFamily:"'Exo 2',sans-serif" }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:11, letterSpacing:3, color:'var(--accent)' }}>
            VEHICLE VERIFICATION
          </div>
          <div style={{ fontSize:10, color:'var(--tdim)', marginTop:2 }}>
            Review registrations · approve or flag vehicles
          </div>
        </div>

        {/* Search */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ position:'relative' }}>
            <Search size={11} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--tdim)' }}/>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search plate or name..."
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:6, padding:'7px 12px 7px 28px', color:'#fff', fontSize:11, fontFamily:"'Exo 2',sans-serif", outline:'none', width:200 }}
            />
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, flexWrap:'wrap' }}>
        {['pending','under_review','verified','flagged','rejected','all'].map(f => {
          const cfg = STATUS_CONFIG[f] || { color:'var(--tdim)', label:'ALL' }
          const count = f === 'all' ? vehicles.length
            : vehicles.filter(v => (v.verification_status||'pending') === f).length
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:'5px 12px', borderRadius:4, cursor:'pointer', fontSize:9,
              fontFamily:"'Share Tech Mono',monospace", letterSpacing:1,
              background: filter===f ? `${cfg.color}18` : 'transparent',
              border: `1px solid ${filter===f ? cfg.color : 'var(--border)'}`,
              color: filter===f ? cfg.color : 'var(--tdim)',
              display:'flex', alignItems:'center', gap:5,
            }}>
              {f === 'all' ? 'ALL' : cfg.label}
              <span style={{ background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'0 5px', fontSize:9 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Vehicle cards */}
      {filtered.length === 0 ? (
        <div style={{ padding:'40px 0', textAlign:'center' }}>
          <Car size={28} style={{ color:'rgba(255,255,255,0.08)', margin:'0 auto 12px', display:'block' }}/>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:3, color:'var(--tdim)' }}>
            {filter === 'pending' ? 'NO PENDING VEHICLES' : `NO ${filter.toUpperCase()} VEHICLES`}
          </div>
        </div>
      ) : filtered.map(vehicle => {
        const st     = vehicle.verification_status || 'pending'
        const cfg    = STATUS_CONFIG[st] || STATUS_CONFIG.pending
        const isOpen = expanded === vehicle.id
        const fb     = feedback[vehicle.id]

        return (
          <div key={vehicle.id} style={{
            marginBottom:8, borderRadius:8,
            border: `1px solid ${isOpen ? 'rgba(0,212,255,0.2)' : 'var(--border)'}`,
            background: isOpen ? 'rgba(0,212,255,0.02)' : 'var(--panel)',
            overflow:'hidden', transition:'all 0.15s',
          }}>

            {/* Card header — always visible */}
            <div
              onClick={() => setExpanded(isOpen ? null : vehicle.id)}
              style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
            >
              {/* Status dot */}
              <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.color, boxShadow:`0 0 6px ${cfg.color}`, flexShrink:0 }}/>

              {/* Plate */}
              <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:16, fontWeight:700, letterSpacing:2, color:'#fff', minWidth:110 }}>
                {vehicle.plate}
              </div>

              {/* Make/model */}
              <div style={{ fontSize:11, color:'var(--tmid)', flex:1 }}>
                {[vehicle.year, vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(' · ')}
              </div>

              {/* Category badge */}
              <div style={{ fontSize:9, padding:'2px 8px', borderRadius:3, background:'rgba(255,255,255,0.05)', color:'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, flexShrink:0 }}>
                {CAT_LABELS[vehicle.registration_category] || vehicle.registration_category || 'PRIVATE'}
              </div>

              {/* Status badge */}
              <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:9, color:cfg.color, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, flexShrink:0 }}>
                {cfg.icon} {cfg.label}
              </div>

              {/* Owner name */}
              <div style={{ fontSize:11, color:'var(--tdim)', minWidth:100, textAlign:'right', display:'flex', alignItems:'center', gap:5 }}>
                <User size={10}/> {vehicle.owner?.full_name || '—'}
              </div>

              {isOpen ? <ChevronUp size={14} style={{color:'var(--tdim)'}}/>
                      : <ChevronDown size={14} style={{color:'var(--tdim)'}}/>}
            </div>

            {/* Expanded detail + action panel */}
            {isOpen && (
              <div style={{ borderTop:'1px solid var(--border)', padding:16 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

                  {/* Owner details */}
                  <div style={{ padding:12, background:'rgba(255,255,255,0.02)', borderRadius:6, border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:9, letterSpacing:2, color:'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", marginBottom:10 }}>OWNER</div>
                    <Detail icon={<User size={11}/>}   label="Name"  value={vehicle.owner?.full_name || '—'} />
                    <Detail icon={<Phone size={11}/>}  label="Phone" value={vehicle.owner?.phone    || 'Not provided'} />
                    <Detail icon={null}                label="Role"  value={(vehicle.owner?.role || 'driver').toUpperCase()} />
                  </div>

                  {/* Vehicle details */}
                  <div style={{ padding:12, background:'rgba(255,255,255,0.02)', borderRadius:6, border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:9, letterSpacing:2, color:'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", marginBottom:10 }}>VEHICLE</div>
                    <Detail label="Plate"    value={vehicle.plate} highlight />
                    <Detail label="Category" value={CAT_LABELS[vehicle.registration_category] || '—'} />
                    <Detail label="Make"     value={[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—'} />
                    <Detail label="Year"     value={vehicle.year?.toString() || '—'} />
                    <Detail label="Color"    value={vehicle.color || '—'} />
                    <Detail label="Format"   value={vehicle.plate_format_valid ? '✓ Valid format' : '⚠ Unvalidated'} color={vehicle.plate_format_valid ? '#00ff9d' : '#ffd700'} />
                  </div>
                </div>

                {/* Action selector */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:9, letterSpacing:2, color:'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", marginBottom:8 }}>DECISION</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {[
                      { id:'verified',     label:'✅ Verify',       color:'#00ff9d' },
                      { id:'under_review', label:'🔍 Under Review', color:'#00d4ff' },
                      { id:'flagged',      label:'⚠️ Flag',         color:'#ff9500' },
                      { id:'rejected',     label:'❌ Reject',       color:'#ff2d44' },
                    ].map(opt => (
                      <button key={opt.id}
                        onClick={() => setAction(a => ({...a, [vehicle.id]: opt.id}))}
                        style={{
                          padding:'7px 14px', borderRadius:5, cursor:'pointer',
                          fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:1,
                          background: action[vehicle.id]===opt.id ? `${opt.color}20` : 'transparent',
                          border: `1px solid ${action[vehicle.id]===opt.id ? opt.color : 'var(--border)'}`,
                          color: action[vehicle.id]===opt.id ? opt.color : 'var(--tdim)',
                          transition:'all 0.15s',
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:9, letterSpacing:2, color:'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", marginBottom:6 }}>NOTE (optional — sent to driver)</div>
                  <textarea
                    value={notes[vehicle.id] || ''}
                    onChange={e => setNotes(n => ({...n, [vehicle.id]: e.target.value}))}
                    placeholder="e.g. Plate format mismatch with category. Please re-register with correct category."
                    rows={2}
                    style={{ width:'100%', background:'rgba(0,212,255,0.03)', border:'1px solid var(--border)', borderRadius:6, padding:'9px 12px', color:'#fff', fontFamily:"'Exo 2',sans-serif", fontSize:12, resize:'vertical', outline:'none', boxSizing:'border-box' }}
                  />
                </div>

                {/* Feedback */}
                {fb && (
                  <div style={{ marginBottom:10, padding:'8px 12px', borderRadius:6, background: fb.ok ? 'rgba(0,255,157,0.08)' : 'rgba(255,45,68,0.08)', border:`1px solid ${fb.ok ? 'rgba(0,255,157,0.2)' : 'rgba(255,45,68,0.2)'}`, fontSize:11, color: fb.ok ? '#00ff9d' : '#ff2d44' }}>
                    {fb.msg}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={() => submitVerification(vehicle)}
                  disabled={!action[vehicle.id] || busy[vehicle.id]}
                  style={{
                    padding:'9px 20px', borderRadius:6, cursor: action[vehicle.id] ? 'pointer' : 'not-allowed',
                    background: action[vehicle.id] ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${action[vehicle.id] ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`,
                    color: action[vehicle.id] ? 'var(--accent)' : 'var(--tdim)',
                    fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:2,
                    transition:'all 0.15s',
                  }}
                >
                  {busy[vehicle.id] ? 'SUBMITTING...' : 'SUBMIT DECISION →'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Detail({ icon, label, value, highlight, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
      {icon && <span style={{ color:'var(--tdim)', flexShrink:0 }}>{icon}</span>}
      <span style={{ fontSize:9, color:'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", minWidth:55 }}>{label}</span>
      <span style={{ fontSize:11, color: color || (highlight ? '#fff' : 'var(--tmid)'), fontWeight: highlight ? 700 : 400, letterSpacing: highlight ? 1 : 0, fontFamily: highlight ? "'Rajdhani',sans-serif" : 'inherit' }}>
        {value}
      </span>
    </div>
  )
}
