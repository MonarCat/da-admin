import React, { useState, useEffect, useCallback } from 'react'
import { Users, UserPlus, Shield, Mail, Phone, Building, Search, ChevronDown, CheckCircle, XCircle, Clock, Loader, Send, AlertTriangle } from 'lucide-react'

const ROLES = ['driver','fleet_manager','admin','government','super_admin']
const ROLE_COLOR = {
  driver:        'var(--tmid)',
  fleet_manager: 'var(--accent)',
  admin:         'var(--yellow)',
  government:    'var(--purple)',
  super_admin:   'var(--gold)',
}
const ROLE_LABEL = {
  driver:        'DRIVER',
  fleet_manager: 'FLEET MGR',
  admin:         'ADMIN',
  government:    'GOV',
  super_admin:   'SUPER ADMIN',
}

export default function UserManagement({ currentUser, session }) {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [tab, setTab]           = useState('users') // users | invite
  const [selected, setSelected] = useState(null)
  const [editRole, setEditRole] = useState(null)
  const [busy, setBusy]         = useState(null)
  const [msg, setMsg]           = useState(null)

  const [invite, setInvite] = useState({ email:'', role:'driver', note:'' })
  const [inviteResult, setInviteResult] = useState(null)

  const authHeader = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {}

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/users', { headers: authHeader })
      const data = await res.json()
      if (res.ok) setUsers(data.users || [])
    } finally { setLoading(false) }
  }, [session])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u => {
    const m = !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.badge_number?.includes(search)
    const f = filter === 'all' || u.role === filter
    return m && f
  })

  async function updateUser(userId, updates) {
    setBusy(userId)
    try {
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u))
      if (selected?.id === userId) setSelected(u => ({ ...u, ...updates }))
      flash('success', `User updated successfully`)
    } catch (e) { flash('error', e.message) }
    finally { setBusy(null); setEditRole(null) }
  }

  async function deactivateUser(userId) {
    if (!window.confirm('Deactivate this user? They will lose all access.')) return
    setBusy(userId)
    try {
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE', headers: authHeader
      })
      if (!res.ok) throw new Error('Failed to deactivate')
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u))
      flash('success', 'User deactivated')
      setSelected(null)
    } catch (e) { flash('error', e.message) }
    finally { setBusy(null) }
  }

  async function sendInvite(e) {
    e.preventDefault()
    setBusy('invite')
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(invite)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInviteResult(data)
      setInvite({ email:'', role:'driver', note:'' })
    } catch (e) { flash('error', e.message) }
    finally { setBusy(null) }
  }

  function flash(type, text) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const myRole = currentUser?.profile?.role || 'driver'
  const isSuper = ['super_admin','government'].includes(myRole)
  const isAdmin = ['admin','super_admin','government'].includes(myRole)

  const stats = {
    total:  users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => ['admin','super_admin','government'].includes(u.role)).length,
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <Users size={14} style={{ color:'var(--accent)' }}/>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:3, color:'var(--accent)' }}>USER MANAGEMENT</span>
          <span style={{ marginLeft:'auto', fontSize:8, fontFamily:"'Share Tech Mono',monospace", color:'var(--tdim)', padding:'2px 7px', border:'1px solid var(--border)', borderRadius:2 }}>
            {stats.active}/{stats.total} ACTIVE
          </span>
        </div>

        {/* Stat pills */}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {[
            { l:'TOTAL',  v:stats.total,  c:'var(--accent)' },
            { l:'ACTIVE', v:stats.active, c:'var(--green)' },
            { l:'ADMINS', v:stats.admins, c:'var(--gold)' },
          ].map(s=>(
            <div key={s.l} style={{ flex:1, textAlign:'center', padding:'6px 4px', background:'rgba(0,212,255,0.03)', border:'1px solid var(--border)', borderRadius:4 }}>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:16, fontWeight:700, color:s.c, lineHeight:1 }}>{s.v}</div>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:7, color:'var(--tdim)', marginTop:2, letterSpacing:1 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:10 }}>
          {['users','invite'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'5px', border:`1px solid ${tab===t?'rgba(0,212,255,0.3)':'var(--border)'}`, borderRadius:4, background:tab===t?'var(--adim)':'transparent', color:tab===t?'var(--accent)':'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:2 }}>
              {t==='users'?'👥 ROSTER':'✉ INVITE'}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <>
            <div style={{ position:'relative', marginBottom:8 }}>
              <Search size={11} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--tdim)' }}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="name / email / badge..."
                style={{ width:'100%', background:'rgba(0,212,255,0.03)', border:'1px solid var(--border)', borderRadius:4, padding:'6px 8px 6px 26px', color:'var(--text)', fontFamily:"'Share Tech Mono',monospace", fontSize:10, outline:'none' }} />
            </div>
            <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
              {['all',...ROLES].map(r=>(
                <button key={r} onClick={()=>setFilter(r)} style={{ padding:'2px 6px', fontSize:7, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, border:`1px solid ${filter===r?'var(--accent)':'var(--border)'}`, borderRadius:2, background:filter===r?'var(--adim)':'transparent', color:filter===r?'var(--accent)':'var(--tdim)' }}>
                  {r.replace('_',' ').toUpperCase()}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {msg && (
        <div style={{ margin:'6px 10px 0', padding:'7px 10px', borderRadius:4, border:`1px solid ${msg.type==='success'?'rgba(0,255,157,0.4)':'rgba(255,45,68,0.4)'}`, background:msg.type==='success'?'rgba(0,255,157,0.06)':'rgba(255,45,68,0.06)', fontSize:10, color:msg.type==='success'?'var(--green)':'var(--red)', fontFamily:"'Exo 2',sans-serif" }} className="a-down">
          {msg.type==='success'?'✓':'✗'} {msg.text}
        </div>
      )}

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto' }}>

        {/* ── USERS TAB ─────────────────────────────────────── */}
        {tab === 'users' && (
          loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40, gap:8 }}>
              <Loader size={14} className="a-spin" style={{ color:'var(--accent)' }}/>
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'var(--tdim)', letterSpacing:2 }}>LOADING ROSTER...</span>
            </div>
          ) : filtered.map(u => (
            <UserRow key={u.id} u={u} selected={selected?.id === u.id}
              onSelect={() => setSelected(selected?.id===u.id ? null : u)}
              onUpdateRole={role => updateUser(u.id, { role })}
              onToggleActive={() => u.is_active ? deactivateUser(u.id) : updateUser(u.id,{is_active:true})}
              editRole={editRole===u.id} setEditRole={v=>setEditRole(v?u.id:null)}
              busy={busy===u.id} myRole={myRole} isSuper={isSuper} isAdmin={isAdmin}
            />
          ))
        )}

        {/* ── INVITE TAB ────────────────────────────────────── */}
        {tab === 'invite' && (
          <div style={{ padding:'14px 14px' }}>
            {inviteResult ? (
              <div className="a-fade">
                <div style={{ padding:14, background:'rgba(0,255,157,0.06)', border:'1px solid rgba(0,255,157,0.3)', borderRadius:6, marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <CheckCircle size={14} style={{ color:'var(--green)' }}/>
                    <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:2, color:'var(--green)' }}>INVITATION CREATED</span>
                  </div>
                  <div style={{ fontSize:10, color:'var(--tmid)', marginBottom:8 }}>Share this URL with {inviteResult.invitation.email}:</div>
                  <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:4, padding:'8px 10px', fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:'var(--accent)', wordBreak:'break-all', letterSpacing:0.5 }}>
                    {inviteResult.invite_url}
                  </div>
                  <div style={{ marginTop:8, fontSize:9, color:'var(--tdim)' }}>
                    Expires in 7 days. Role assigned: <span style={{ color:ROLE_COLOR[inviteResult.invitation.role] }}>{inviteResult.invitation.role.replace('_',' ').toUpperCase()}</span>
                  </div>
                </div>
                <button onClick={()=>setInviteResult(null)} style={{ width:'100%', padding:9, background:'rgba(0,212,255,0.08)', border:'1px solid rgba(0,212,255,0.3)', borderRadius:4, color:'var(--accent)', fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:2 }}>
                  SEND ANOTHER
                </button>
              </div>
            ) : (
              <form onSubmit={sendInvite}>
                <InvLabel>EMAIL ADDRESS</InvLabel>
                <input type="email" value={invite.email} onChange={e=>setInvite(p=>({...p,email:e.target.value}))} placeholder="user@organization.com" required
                  style={{ width:'100%', marginBottom:10, background:'rgba(0,212,255,0.04)', border:'1px solid var(--border)', borderRadius:4, padding:'9px 10px', color:'var(--text)', fontFamily:"'Exo 2',sans-serif", fontSize:11, outline:'none' }} />

                <InvLabel>ASSIGN ROLE</InvLabel>
                <select value={invite.role} onChange={e=>setInvite(p=>({...p,role:e.target.value}))}
                  style={{ width:'100%', marginBottom:10, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:4, padding:'9px 10px', color:'var(--text)', fontFamily:"'Share Tech Mono',monospace", fontSize:10, outline:'none' }}>
                  {ROLES.filter(r => {
                    if (!isSuper && ['government','super_admin'].includes(r)) return false
                    if (myRole === 'fleet_manager' && ['admin'].includes(r)) return false
                    return true
                  }).map(r => (
                    <option key={r} value={r}>{r.replace('_',' ').toUpperCase()}</option>
                  ))}
                </select>

                <InvLabel>NOTE (OPTIONAL)</InvLabel>
                <textarea value={invite.note} onChange={e=>setInvite(p=>({...p,note:e.target.value}))}
                  placeholder="e.g. Traffic Enforcement Unit, Nairobi West" rows={2}
                  style={{ width:'100%', marginBottom:14, background:'rgba(0,212,255,0.04)', border:'1px solid var(--border)', borderRadius:4, padding:'8px 10px', color:'var(--text)', fontFamily:"'Exo 2',sans-serif", fontSize:11, outline:'none', resize:'none' }} />

                <button type="submit" disabled={busy==='invite'} style={{ width:'100%', padding:11, background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.35)', borderRadius:4, color:'var(--accent)', fontFamily:"'Orbitron',sans-serif", fontSize:9, letterSpacing:3, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  {busy==='invite'?<Loader size={12} className="a-spin"/>:<Send size={12}/>}
                  {busy==='invite'?'SENDING...':'SEND INVITATION'}
                </button>

                <div style={{ marginTop:10, padding:'8px 10px', background:'rgba(0,212,255,0.03)', border:'1px solid var(--border)', borderRadius:4, fontSize:9, color:'var(--tdim)', fontFamily:"'Exo 2',sans-serif", lineHeight:1.6 }}>
                  The invite link expires in 7 days. The user will be auto-assigned the selected role on sign up.
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function UserRow({ u, selected, onSelect, onUpdateRole, onToggleActive, editRole, setEditRole, busy, myRole, isSuper, isAdmin }) {
  return (
    <div style={{ borderBottom:'1px solid var(--border)', cursor:'pointer' }} onClick={onSelect}>
      <div style={{ padding:'9px 12px', display:'flex', alignItems:'center', gap:8, background:selected?'rgba(0,212,255,0.03)':'transparent' }}>
        {/* Avatar */}
        <div style={{ width:30, height:30, borderRadius:'50%', background:`${ROLE_COLOR[u.role]}18`, border:`1px solid ${ROLE_COLOR[u.role]}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:ROLE_COLOR[u.role], fontFamily:"'Rajdhani',sans-serif", fontWeight:700, flexShrink:0 }}>
          {u.avatar_initials || u.full_name?.[0] || '?'}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, color:u.is_active?'#fff':'var(--tdim)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.full_name || 'Unnamed'}</div>
          <div style={{ fontSize:9, color:'var(--tdim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email || u.phone}</div>
        </div>
        <div>
          <span style={{ fontSize:7, padding:'2px 5px', border:`1px solid ${ROLE_COLOR[u.role]}40`, borderRadius:2, color:ROLE_COLOR[u.role], fontFamily:"'Share Tech Mono',monospace", letterSpacing:1 }}>
            {ROLE_LABEL[u.role] || u.role?.toUpperCase()}
          </span>
        </div>
        <div style={{ width:6, height:6, borderRadius:'50%', background:u.is_active?'var(--green)':'var(--tdim)', flexShrink:0 }}/>
      </div>

      {/* Expanded row */}
      {selected && (
        <div style={{ padding:'10px 12px 12px', background:'rgba(0,212,255,0.02)', borderTop:'1px solid var(--border)' }} className="a-down" onClick={e=>e.stopPropagation()}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
            {[
              ['DEPARTMENT', u.department || '—'],
              ['BADGE', u.badge_number || '—'],
              ['CLEARANCE', `LEVEL ${u.clearance_level || 1}`],
              ['LOGIN COUNT', u.login_count || 0],
              ['LAST LOGIN', u.last_login ? new Date(u.last_login).toLocaleDateString('en-KE') : 'Never'],
              ['STATUS', u.is_active ? 'ACTIVE' : 'INACTIVE'],
            ].map(([l,v])=>(
              <div key={l}>
                <div style={{ fontSize:7, color:'var(--tdim)', fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, marginBottom:1 }}>{l}</div>
                <div style={{ fontSize:10, color:'var(--text)' }}>{v}</div>
              </div>
            ))}
          </div>

          {isAdmin && u.id !== 'YOUR-OWN-ID' && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {isSuper && (
                <div style={{ position:'relative' }}>
                  <button onClick={()=>setEditRole(!editRole)} style={{ padding:'4px 8px', background:'rgba(212,168,71,0.08)', border:'1px solid rgba(212,168,71,0.3)', borderRadius:4, color:'var(--gold)', fontSize:8, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, display:'flex', alignItems:'center', gap:4 }}>
                    <Shield size={10}/> CHANGE ROLE <ChevronDown size={9}/>
                  </button>
                  {editRole && (
                    <div style={{ position:'absolute', bottom:'calc(100% + 4px)', left:0, background:'var(--panel2)', border:'1px solid var(--border2)', borderRadius:4, overflow:'hidden', zIndex:50, minWidth:130 }} className="a-down">
                      {ROLES.map(r=>(
                        <button key={r} onClick={()=>onUpdateRole(r)} style={{ width:'100%', padding:'6px 10px', background:u.role===r?'var(--adim)':'transparent', border:'none', borderBottom:'1px solid var(--border)', color:ROLE_COLOR[r], fontSize:9, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, textAlign:'left' }}>
                          {busy?<Loader size={9} className="a-spin"/>:''} {r.replace('_',' ').toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={onToggleActive} disabled={!!busy} style={{ padding:'4px 8px', background:u.is_active?'rgba(255,45,68,0.08)':'rgba(0,255,157,0.08)', border:`1px solid ${u.is_active?'rgba(255,45,68,0.3)':'rgba(0,255,157,0.3)'}`, borderRadius:4, color:u.is_active?'var(--red)':'var(--green)', fontSize:8, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, display:'flex', alignItems:'center', gap:4 }}>
                {busy?<Loader size={9} className="a-spin"/>:(u.is_active?<XCircle size={10}/>:<CheckCircle size={10}/>)}
                {u.is_active?'DEACTIVATE':'REACTIVATE'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InvLabel({ children }) {
  return <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:2, color:'var(--tdim)', marginBottom:5 }}>{children}</div>
}
