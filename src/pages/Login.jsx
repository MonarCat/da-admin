import React, { useState } from 'react'
import { Shield, Eye, EyeOff, Loader } from 'lucide-react'

export default function Login({ onLogin, onDemo }) {
  const [email, setEmail]   = useState('')
  const [pw, setPw]         = useState('')
  const [show, setShow]     = useState(false)
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('')
    try { await onLogin(email, pw) }
    catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const inp = {
    background: 'rgba(0,212,255,0.04)', border: '1px solid var(--border2)',
    borderRadius: '4px', padding: '10px 12px', color: 'var(--text)',
    fontFamily: "'Share Tech Mono',monospace", fontSize: '12px',
    outline: 'none', width: '100%', transition: 'border-color 0.2s',
  }

  return (
    <div style={{ height:'100vh', width:'100vw', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}
      className="grid-bg scanlines">

      {[200,400,600,800].map((s,i) => (
        <div key={i} style={{
          position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          width:`${s}px`, height:`${s}px`, borderRadius:'50%',
          border:'1px solid rgba(0,212,255,0.04)',
          animation:`ripple ${3+i}s ease-out infinite`, animationDelay:`${i*0.8}s`,
          pointerEvents:'none',
        }} />
      ))}

      <div style={{ width:'350px', background:'var(--panel)', border:'1px solid var(--border2)', borderRadius:'8px', padding:'34px 30px', position:'relative', zIndex:10, boxShadow:'0 0 60px rgba(0,212,255,0.07)' }} className="a-fade">

        {/* Corner brackets */}
        {[{t:0,l:0},{t:0,r:0},{b:0,l:0},{b:0,r:0}].map((s,i)=>(
          <div key={i} style={{ position:'absolute', width:'16px', height:'16px', ...s,
            borderTop: s.t===0?'1px solid var(--accent)':undefined,
            borderBottom: s.b===0?'1px solid var(--accent)':undefined,
            borderLeft: s.l===0?'1px solid var(--accent)':undefined,
            borderRight: s.r===0?'1px solid var(--accent)':undefined,
          }}/>
        ))}

        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ width:'54px', height:'54px', borderRadius:'50%', border:'1px solid rgba(0,212,255,0.3)', background:'rgba(0,212,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', boxShadow:'0 0 24px rgba(0,212,255,0.1)' }}>
            <Shield size={24} style={{ color:'var(--accent)' }} />
          </div>
          <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:'22px', fontWeight:800, letterSpacing:'6px', color:'var(--accent)' }} className="a-glow">D.A</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'8px', letterSpacing:'4px', color:'var(--tdim)', marginTop:'4px' }}>COMMAND CENTER</div>
          <div style={{ marginTop:'8px', display:'inline-block', padding:'2px 10px', border:'1px solid rgba(255,45,68,0.25)', borderRadius:'2px', fontFamily:"'Share Tech Mono',monospace", fontSize:'7px', letterSpacing:'2px', color:'rgba(255,45,68,0.55)' }}>⚠ RESTRICTED ACCESS</div>
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom:'13px' }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'8px', letterSpacing:'2px', color:'var(--tdim)', marginBottom:'5px' }}>OPERATOR ID</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="operator@agency.gov" required style={inp}
              onFocus={e=>e.target.style.borderColor='var(--accent)'}
              onBlur={e=>e.target.style.borderColor='var(--border2)'} />
          </div>

          <div style={{ marginBottom:'20px' }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:'8px', letterSpacing:'2px', color:'var(--tdim)', marginBottom:'5px' }}>ACCESS CODE</div>
            <div style={{ position:'relative' }}>
              <input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••••••" required
                style={{ ...inp, paddingRight:'36px', letterSpacing:'4px' }}
                onFocus={e=>e.target.style.borderColor='var(--accent)'}
                onBlur={e=>e.target.style.borderColor='var(--border2)'} />
              <button type="button" onClick={()=>setShow(!show)} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--tdim)' }}>
                {show ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </div>

          {err && (
            <div style={{ marginBottom:'14px', padding:'8px 12px', background:'var(--rdim)', border:'1px solid rgba(255,45,68,0.35)', borderRadius:'4px', fontSize:'10px', color:'var(--red)', fontFamily:"'Exo 2',sans-serif" }} className="a-down">⚠ {err}</div>
          )}

          <button type="submit" disabled={busy} style={{ width:'100%', padding:'11px', background:busy?'rgba(0,212,255,0.04)':'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.4)', borderRadius:'4px', color:'var(--accent)', fontFamily:"'Orbitron',sans-serif", fontSize:'11px', letterSpacing:'3px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', transition:'all 0.18s', boxShadow:'0 0 20px rgba(0,212,255,0.08)' }}>
            {busy ? <Loader size={13} className="a-spin"/> : <Shield size={13}/>}
            {busy ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:'14px' }}>
          <button onClick={onDemo} style={{ background:'transparent', border:'none', color:'var(--tdim)', fontSize:'9px', fontFamily:"'Share Tech Mono',monospace", letterSpacing:'2px', textDecoration:'underline' }}>
            ENTER DEMO MODE
          </button>
        </div>
        <div style={{ textAlign:'center', marginTop:'8px', fontFamily:"'Share Tech Mono',monospace", fontSize:'7px', letterSpacing:'2px', color:'var(--tdim)' }}>ALL SESSIONS LOGGED</div>
      </div>
    </div>
  )
}
