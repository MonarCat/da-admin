import React, { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { Cpu, Play, ChevronDown, ChevronRight } from 'lucide-react'

const SKILLS = [
  { id:'da-fleet-summary',          label:'Fleet Summary',          desc:'Overall status of all vehicles on the network' },
  { id:'da-sos-check',              label:'Active SOS',             desc:'All vehicles currently broadcasting SOS' },
  { id:'da-locate',                 label:'Locate Vehicle',         desc:'Find a specific vehicle by plate number', params:[{key:'plate',placeholder:'e.g. KCA 001X'}] },
  { id:'da-pending-verifications',  label:'Pending Verifications',  desc:'Vehicles awaiting admin approval' },
]

export default function AgentPanel({ profile, isDemo }) {
  const [selected, setSelected]   = useState(null)
  const [paramVals, setParamVals] = useState({})
  const [result, setResult]       = useState(null)
  const [running, setRunning]     = useState(false)
  const [error, setError]         = useState(null)

  async function runSkill() {
    if (!selected) return
    setRunning(true)
    setResult(null)
    setError(null)

    if (isDemo) {
      await new Promise(r => setTimeout(r, 1200))
      setResult({
        skill: selected.id,
        status: 'completed',
        output: {
          summary: { total:8, moving:3, parked:3, sos:1, stalled:1, pending:2, verified:6 },
          narrative: '⚠️ 1 SOS alert active · 3 moving · 3 parked · 2 awaiting verification'
        }
      })
      setRunning(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${session?.access_token}` },
        body: JSON.stringify({ skill: selected.id, params: paramVals }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ flex:1, overflowY:'auto', padding:16, fontFamily:"'Exo 2',sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <Cpu size={14} style={{ color:'var(--accent)' }}/>
          <span style={{ fontFamily:"'Orbitron',sans-serif", fontSize:11, letterSpacing:3, color:'var(--accent)' }}>AI AGENT</span>
          <span style={{ fontSize:8, padding:'2px 6px', background:'rgba(0,212,255,0.08)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:3, color:'var(--accent)', fontFamily:"'Share Tech Mono',monospace", letterSpacing:1 }}>BETA</span>
        </div>
        <div style={{ fontSize:10, color:'var(--tdim)' }}>Run autonomous D.A intelligence skills</div>
      </div>

      {/* Skill selector */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:9, letterSpacing:2, color:'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", marginBottom:8 }}>SELECT SKILL</div>
        {SKILLS.map(skill => (
          <div key={skill.id}
            onClick={() => { setSelected(skill); setParamVals({}); setResult(null); setError(null) }}
            style={{
              padding:'10px 14px', marginBottom:4, borderRadius:6, cursor:'pointer',
              background: selected?.id===skill.id ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${selected?.id===skill.id ? 'rgba(0,212,255,0.3)' : 'var(--border)'}`,
              transition:'all 0.15s',
            }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {selected?.id===skill.id
                ? <ChevronDown size={11} style={{color:'var(--accent)'}}/>
                : <ChevronRight size={11} style={{color:'var(--tdim)'}}/>}
              <span style={{ fontSize:12, color: selected?.id===skill.id ? '#fff' : 'var(--tmid)', fontWeight:600 }}>{skill.label}</span>
            </div>
            <div style={{ fontSize:10, color:'var(--tdim)', marginTop:3, paddingLeft:19 }}>{skill.desc}</div>
          </div>
        ))}
      </div>

      {/* Params */}
      {selected?.params?.length > 0 && (
        <div style={{ marginBottom:14 }}>
          {selected.params.map(p => (
            <div key={p.key} style={{ marginBottom:8 }}>
              <div style={{ fontSize:9, letterSpacing:2, color:'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", marginBottom:5 }}>{p.key.toUpperCase()}</div>
              <input
                value={paramVals[p.key]||''}
                onChange={e => setParamVals(prev => ({...prev, [p.key]: e.target.value}))}
                placeholder={p.placeholder}
                style={{ width:'100%', background:'rgba(0,212,255,0.03)', border:'1px solid var(--border)', borderRadius:6, padding:'9px 12px', color:'#fff', fontFamily:"'Exo 2',sans-serif", fontSize:12, outline:'none', boxSizing:'border-box' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Run button */}
      <button
        onClick={runSkill}
        disabled={!selected || running}
        style={{
          width:'100%', padding:'10px', borderRadius:6, cursor: selected?'pointer':'not-allowed',
          background: selected ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${selected ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`,
          color: selected ? 'var(--accent)' : 'var(--tdim)',
          fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:2,
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          marginBottom:16,
        }}>
        {running
          ? <><span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>⟳</span> RUNNING...</>
          : <><Play size={11}/> RUN SKILL</>}
      </button>

      {/* Error */}
      {error && (
        <div style={{ padding:'10px 14px', borderRadius:6, background:'rgba(255,45,68,0.08)', border:'1px solid rgba(255,45,68,0.2)', fontSize:11, color:'#ff2d44', marginBottom:12 }}>
          ⚠ {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ padding:14, borderRadius:6, background:'rgba(0,255,157,0.04)', border:'1px solid rgba(0,255,157,0.15)' }}>
          <div style={{ fontSize:9, letterSpacing:2, color:'#00ff9d', fontFamily:"'Share Tech Mono',monospace", marginBottom:10 }}>RESULT — {result.status?.toUpperCase()}</div>

          {result.output?.narrative && (
            <div style={{ fontSize:13, color:'#fff', marginBottom:12, lineHeight:1.6, fontWeight:500 }}>
              {result.output.narrative}
            </div>
          )}

          {result.output?.summary && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
              {Object.entries(result.output.summary)
                .filter(([k]) => !['generated_at'].includes(k))
                .map(([k, v]) => (
                  <div key={k} style={{ padding:'8px', background:'rgba(255,255,255,0.03)', borderRadius:5, textAlign:'center' }}>
                    <div style={{ fontSize:16, fontWeight:700, color: k==='sos'&&v>0 ? '#ff2d44' : '#fff', fontFamily:"'Orbitron',sans-serif" }}>{v}</div>
                    <div style={{ fontSize:8, color:'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, marginTop:2 }}>{k.toUpperCase()}</div>
                  </div>
                ))}
            </div>
          )}

          {result.output?.vehicle && (
            <div style={{ fontSize:11, color:'var(--tmid)' }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#fff', fontFamily:"'Rajdhani',sans-serif", letterSpacing:2, marginBottom:6 }}>{result.output.vehicle.plate}</div>
              <div>Status: <span style={{color:'var(--accent)'}}>{result.output.vehicle.vehicle_status}</span></div>
              <div>Speed: {result.output.vehicle.speed || 0} km/h</div>
              {result.output.maps_url && <a href={result.output.maps_url} target="_blank" rel="noreferrer" style={{color:'var(--accent)', fontSize:10}}>📍 Open in Maps →</a>}
            </div>
          )}

          {result.output?.vehicles?.length > 0 && !result.output.vehicle && (
            <div>
              {result.output.vehicles.slice(0,5).map((v,i) => (
                <div key={i} style={{ padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:11, color:'var(--tmid)', display:'flex', gap:10 }}>
                  <span style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, color:'#fff', letterSpacing:1, minWidth:100 }}>{v.plate}</span>
                  <span>{v.make} {v.model}</span>
                  <span style={{marginLeft:'auto', color:'var(--tdim)', fontSize:10}}>{v.owner?.full_name}</span>
                </div>
              ))}
              {result.output.vehicles.length > 5 && <div style={{fontSize:10, color:'var(--tdim)', marginTop:6}}>+{result.output.vehicles.length - 5} more</div>}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
