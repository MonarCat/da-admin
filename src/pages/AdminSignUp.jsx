import React, { useState, useEffect } from 'react'
import { Shield, Eye, EyeOff, Loader, CheckCircle, User, Phone, Mail, Lock } from 'lucide-react'

export default function AdminSignUp({ onSuccess, onBackToLogin }) {
  const [step, setStep]     = useState(1) // 1=details, 2=done
  const [form, setForm]     = useState({ full_name:'', phone:'', email:'', password:'', confirm:'' })
  const [show, setShow]     = useState(false)
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')
  const [token, setToken]   = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  // Read invite token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    const e = params.get('email')
    if (t) setToken(t)
    if (e) {
      setInviteEmail(e)
      setForm(f => ({ ...f, email: decodeURIComponent(e) }))
    }
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) { setErr('Passwords do not match'); return }
    if (form.password.length < 8) { setErr('Password must be at least 8 characters'); return }
    setBusy(true); setErr('')

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:      form.email,
          password:   form.password,
          full_name:  form.full_name,
          phone:      form.phone,
          invite_token: token || undefined
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      setStep(2)
    } catch (err) {
      setErr(err.message)
    } finally {
      setBusy(false)
    }
  }

  const inp = (icon, key, type='text', placeholder='', locked=false) => (
    <div style={{ position:'relative' }}>
      <div style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--tdim)' }}>{icon}</div>
      <input type={type} value={form[key]} onChange={e => !locked && set(key, e.target.value)}
        placeholder={placeholder} required disabled={locked}
        style={{ width:'100%', background: locked?'rgba(0,212,255,0.02)':'rgba(0,212,255,0.04)', border:'1px solid var(--border2)', borderRadius:4, padding:'9px 10px 9px 32px', color: locked?'var(--tmid)':'var(--text)', fontFamily:"'Exo 2',sans-serif", fontSize:12, outline:'none', transition:'border-color 0.2s' }}
        onFocus={e => { if(!locked) e.target.style.borderColor='var(--accent)' }}
        onBlur={e => e.target.style.borderColor='var(--border2)'} />
    </div>
  )

  return (
    <div style={{ height:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}
      className="grid-bg scanlines">

      {[150,350,550].map((s,i) => (
        <div key={i} style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:`${s}px`, height:`${s}px`, borderRadius:'50%', border:'1px solid rgba(0,212,255,0.04)', animation:`ripple ${3+i}s ease-out infinite`, animationDelay:`${i}s`, pointerEvents:'none' }} />
      ))}

      <div style={{ width:380, background:'var(--panel)', border:'1px solid var(--border2)', borderRadius:8, padding:'30px 28px', position:'relative', zIndex:10, boxShadow:'0 0 50px rgba(0,212,255,0.06)' }} className="a-fade">

        {/* Corner brackets */}
        {['tl','tr','bl','br'].map(c=>(
          <div key={c} style={{ position:'absolute', width:14, height:14,
            top:c[0]==='t'?0:'auto', bottom:c[0]==='b'?0:'auto',
            left:c[1]==='l'?0:'auto', right:c[1]==='r'?0:'auto',
            borderTop:c[0]==='t'?'1px solid var(--accent)':undefined,
            borderBottom:c[0]==='b'?'1px solid var(--accent)':undefined,
            borderLeft:c[1]==='l'?'1px solid var(--accent)':undefined,
            borderRight:c[1]==='r'?'1px solid var(--accent)':undefined,
          }}/>
        ))}

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ width:48, height:48, borderRadius:'50%', border:'1px solid rgba(0,212,255,0.3)', background:'rgba(0,212,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', boxShadow:'0 0 20px rgba(0,212,255,0.1)' }}>
            <Shield size={22} style={{ color:'var(--accent)' }} />
          </div>
          <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:18, fontWeight:800, letterSpacing:5, color:'var(--accent)' }} className="a-glow">D.A</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:3, color:'var(--tdim)', marginTop:3 }}>
            {token ? 'INVITED REGISTRATION' : 'CREATE ACCOUNT'}
          </div>
          {token && (
            <div style={{ marginTop:8, padding:'3px 10px', border:'1px solid rgba(0,255,157,0.3)', borderRadius:2, background:'rgba(0,255,157,0.05)', display:'inline-block', fontSize:8, fontFamily:"'Share Tech Mono',monospace", color:'var(--green)', letterSpacing:2 }}>
              ✓ VALID INVITATION
            </div>
          )}
        </div>

        {step === 1 && (
          <form onSubmit={submit}>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <Label>FULL NAME</Label>
                {inp(<User size={11}/>, 'full_name', 'text', 'James Omondi')}
              </div>
              <div>
                <Label>PHONE</Label>
                {inp(<Phone size={11}/>, 'phone', 'tel', '+254 7XX XXX XXX')}
              </div>
              <div>
                <Label>EMAIL ADDRESS</Label>
                {inp(<Mail size={11}/>, 'email', 'email', 'you@agency.gov', !!inviteEmail)}
              </div>
              <div>
                <Label>PASSWORD <span style={{ color:'var(--tdim)' }}>(min 8 chars)</span></Label>
                <div style={{ position:'relative' }}>
                  <Lock size={11} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--tdim)' }}/>
                  <input type={show?'text':'password'} value={form.password} onChange={e=>set('password',e.target.value)} placeholder="••••••••••••" required
                    style={{ width:'100%', background:'rgba(0,212,255,0.04)', border:'1px solid var(--border2)', borderRadius:4, padding:'9px 32px 9px 32px', color:'var(--text)', fontFamily:"'Share Tech Mono',monospace", fontSize:13, letterSpacing:3, outline:'none' }}
                    onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='var(--border2)'} />
                  <button type="button" onClick={()=>setShow(!show)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--tdim)' }}>
                    {show?<EyeOff size={13}/>:<Eye size={13}/>}
                  </button>
                </div>
              </div>
              <div>
                <Label>CONFIRM PASSWORD</Label>
                <div style={{ position:'relative' }}>
                  <Lock size={11} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--tdim)' }}/>
                  <input type="password" value={form.confirm} onChange={e=>set('confirm',e.target.value)} placeholder="••••••••••••" required
                    style={{ width:'100%', background:'rgba(0,212,255,0.04)', border:`1px solid ${form.confirm&&form.confirm!==form.password?'var(--red)':'var(--border2)'}`, borderRadius:4, padding:'9px 10px 9px 32px', color:'var(--text)', fontFamily:"'Share Tech Mono',monospace", fontSize:13, letterSpacing:3, outline:'none' }}
                    onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='var(--border2)'} />
                </div>
              </div>
            </div>

            {err && (
              <div style={{ marginTop:10, padding:'7px 10px', background:'var(--rdim)', border:'1px solid rgba(255,45,68,0.35)', borderRadius:4, fontSize:10, color:'var(--red)', fontFamily:"'Exo 2',sans-serif" }} className="a-down">⚠ {err}</div>
            )}

            <button type="submit" disabled={busy} style={{ width:'100%', marginTop:16, padding:11, background:busy?'rgba(0,212,255,0.04)':'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.4)', borderRadius:4, color:'var(--accent)', fontFamily:"'Orbitron',sans-serif", fontSize:10, letterSpacing:3, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {busy?<Loader size={13} className="a-spin"/>:<Shield size={13}/>}
              {busy?'CREATING ACCOUNT...':'CREATE ACCOUNT'}
            </button>

            <div style={{ textAlign:'center', marginTop:12 }}>
              <button type="button" onClick={onBackToLogin} style={{ background:'transparent', border:'none', color:'var(--tdim)', fontSize:9, fontFamily:"'Share Tech Mono',monospace", letterSpacing:2, textDecoration:'underline' }}>
                BACK TO LOGIN
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div style={{ textAlign:'center', padding:'16px 0' }} className="a-fade">
            <CheckCircle size={36} style={{ color:'var(--green)', margin:'0 auto 14px', display:'block' }}/>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:13, letterSpacing:3, color:'var(--green)', marginBottom:8 }}>ACCOUNT CREATED</div>
            <div style={{ fontSize:11, color:'var(--tmid)', marginBottom:18, lineHeight:1.7 }}>
              Welcome to D.A, {form.full_name.split(' ')[0]}.<br/>Your account is active.
              {!token && <><br/><span style={{ color:'var(--tdim)', fontSize:10 }}>An admin will assign your clearance level.</span></>}
            </div>
            <button onClick={onBackToLogin} style={{ padding:'10px 22px', background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.4)', borderRadius:4, color:'var(--accent)', fontFamily:"'Orbitron',sans-serif", fontSize:10, letterSpacing:3 }}>
              PROCEED TO LOGIN
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, letterSpacing:2, color:'var(--tdim)', marginBottom:4 }}>{children}</div>
}
