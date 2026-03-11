import React, { useState, useCallback } from 'react'
import {
  Power, Zap, Shield, CheckCircle, Navigation, Activity,
  Lock, Unlock, Bluetooth, BluetoothOff, Music, MicOff,
  Volume2, VolumeX, Siren, MapPin, Eye, EyeOff, Radio,
  MessageSquare, AlertTriangle, Loader, Cpu, Gauge,
  Thermometer, Battery
} from 'lucide-react'
import { STATUS, timeSince } from '../../lib/data.js'

// All command groups with metadata
const GROUPS = [
  {
    id: 'engine', label: 'ENGINE CONTROL', color: '#ff2d44', clearance: 'ALPHA',
    icon: <Power size={11}/>,
    cmds: [
      { type: 'stop_engine',          label: 'STOP ENGINE',      icon: <Power size={13}/>,       danger: true,  desc: 'Cut ignition remotely' },
      { type: 'start_engine',         label: 'START ENGINE',     icon: <Zap size={13}/>,         danger: true,  desc: 'Remote start ignition' },
      { type: 'immobilize',           label: 'IMMOBILIZE',       icon: <Shield size={13}/>,      danger: true,  desc: 'Full vehicle lockdown' },
      { type: 'release_immobilize',   label: 'RELEASE LOCK',     icon: <CheckCircle size={13}/>, danger: false, desc: 'Release immobilize' },
    ]
  },
  {
    id: 'autopilot', label: 'AUTOPILOT', color: '#b060ff', clearance: 'BETA',
    icon: <Navigation size={11}/>,
    cmds: [
      { type: 'activate_autopilot',   label: 'ENGAGE AUTOPILOT', icon: <Navigation size={13}/>, danger: true,  desc: 'Autonomous mode' },
      { type: 'deactivate_autopilot', label: 'DISENGAGE',        icon: <Activity size={13}/>,   danger: false, desc: 'Return manual control' },
    ]
  },
  {
    id: 'access', label: 'ACCESS CONTROL', color: '#ff8c00', clearance: 'GAMMA',
    icon: <Lock size={11}/>,
    cmds: [
      { type: 'lock_doors',   label: 'LOCK ALL DOORS',  icon: <Lock size={13}/>,   danger: false, desc: 'Lock all doors remotely' },
      { type: 'unlock_doors', label: 'UNLOCK DOORS',    icon: <Unlock size={13}/>, danger: true,  desc: 'Unlock — use with caution' },
    ]
  },
  {
    id: 'bluetooth', label: 'BLUETOOTH OVERRIDE', color: '#00d4ff', clearance: 'DELTA',
    icon: <Bluetooth size={11}/>,
    cmds: [
      { type: 'force_bluetooth',      label: 'FORCE CONNECT BT',  icon: <Bluetooth size={13}/>,    danger: false, desc: 'Override BT to admin device' },
      { type: 'disconnect_bluetooth', label: 'DISCONNECT ALL BT', icon: <BluetoothOff size={13}/>, danger: false, desc: 'Sever all BT connections' },
    ]
  },
  {
    id: 'media', label: 'MEDIA CONTROL', color: '#00ff9d', clearance: 'EPSILON',
    icon: <Music size={11}/>,
    cmds: [
      { type: 'play_music',  label: 'PLAY AUDIO',  icon: <Music size={13}/>,   danger: false, desc: 'Broadcast audio to vehicle',  input: { key: 'track',   label: 'Track name / URL', type: 'text' } },
      { type: 'stop_music',  label: 'STOP AUDIO',  icon: <MicOff size={13}/>,  danger: false, desc: 'Cut all vehicle audio' },
      { type: 'set_volume',  label: 'SET VOLUME',  icon: <Volume2 size={13}/>, danger: false, desc: 'Override speaker volume 0–100', input: { key: 'volume',  label: 'Level (0-100)',    type: 'number' } },
    ]
  },
  {
    id: 'alarm', label: 'ALARM SYSTEM', color: '#ff2d44', clearance: 'ALPHA',
    icon: <Siren size={11}/>,
    cmds: [
      { type: 'activate_alarm',   label: 'TRIGGER ALARM',  icon: <Siren size={13}/>,   danger: false, desc: 'Horn + hazard lights' },
      { type: 'deactivate_alarm', label: 'SILENCE ALARM',  icon: <VolumeX size={13}/>, danger: false, desc: 'Deactivate alarm system' },
    ]
  },
  {
    id: 'track', label: 'SURVEILLANCE', color: '#00d4ff', clearance: 'GAMMA',
    icon: <Eye size={11}/>,
    cmds: [
      { type: 'request_location', label: 'FORCE PING',        icon: <MapPin size={13}/>, danger: false, desc: 'Request immediate GPS' },
      { type: 'enable_tracking',  label: 'ENABLE TRACKING',   icon: <Eye size={13}/>,    danger: false, desc: 'Continuous location tracking' },
      { type: 'disable_tracking', label: 'DISABLE TRACKING',  icon: <EyeOff size={13}/>, danger: true,  desc: 'Suspend tracking (auth required)' },
    ]
  },
  {
    id: 'comms', label: 'COMMUNICATIONS', color: '#00ff9d', clearance: 'EPSILON',
    icon: <Radio size={11}/>,
    cmds: [
      { type: 'broadcast_message', label: 'BROADCAST MSG',  icon: <MessageSquare size={13}/>, danger: false, desc: 'Push text to vehicle display', input: { key: 'message', label: 'Message text', type: 'text' } },
      { type: 'sos_response',      label: 'OPEN SOS COMMS', icon: <Radio size={13}/>,         danger: false, desc: 'Emergency comm channel' },
    ]
  },
]

export default function CommandCenter({ vehicle, issueCommand }) {
  const [open, setOpen]       = useState('engine')
  const [inputs, setInputs]   = useState({})
  const [busy, setBusy]       = useState(null)
  const [result, setResult]   = useState(null)
  const [confirm, setConfirm] = useState(null)

  const run = useCallback(async (cmd) => {
    if (cmd.danger) { setConfirm(cmd); return }
    await exec(cmd)
  }, [vehicle, inputs, issueCommand])

  async function exec(cmd) {
    setBusy(cmd.type); setResult(null); setConfirm(null)
    const payload = {}
    if (cmd.input?.key && inputs[cmd.type]) {
      payload[cmd.input.key] = cmd.input.type === 'number' ? Number(inputs[cmd.type]) : inputs[cmd.type]
    }
    try {
      const r = await issueCommand(vehicle.id, cmd.type, payload)
      setResult({ ok: true, msg: r.message })
    } catch (e) {
      setResult({ ok: false, msg: e.message })
    } finally {
      setBusy(null)
      setTimeout(() => setResult(null), 4000)
    }
  }

  if (!vehicle) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tdim)', animation: 'spin 8s linear infinite' }}>
        <Cpu size={20}/>
      </div>
      <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--tdim)', textAlign: 'center' }}>SELECT A VEHICLE<br/>TO ACCESS CONTROLS</span>
    </div>
  )

  const sc = STATUS[vehicle.status] || STATUS.offline

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>

      {/* Vehicle identity */}
      <div style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--panel2) 0%, var(--bg2) 100%)', flexShrink: 0 }}>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 3, color: 'var(--tdim)', marginBottom: 6 }}>ACTIVE TARGET</div>
        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 4, textShadow: '0 0 16px rgba(255,255,255,0.12)' }}>{vehicle.plate}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color, boxShadow: `0 0 6px ${sc.color}`, animation: vehicle.status === 'sos' ? 'blink 0.7s infinite' : 'none' }}/>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: sc.color, letterSpacing: 2 }}>{sc.label}</span>
          <span style={{ fontSize: 10, color: 'var(--tmid)' }}>· {vehicle.make} {vehicle.model} · {vehicle.owner?.name || '—'}</span>
        </div>

        {/* Mini metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, marginTop: 10 }}>
          {[
            { icon: <Gauge size={9}/>,       label: 'SPEED',  val: `${Math.round(vehicle.speed || 0)}`, unit: 'km/h', col: 'var(--accent)' },
            { icon: <Battery size={9}/>,     label: 'FUEL',   val: `${vehicle.fuel || 0}`,              unit: '%',    col: vehicle.fuel < 15 ? 'var(--red)' : 'var(--green)' },
            { icon: <Power size={9}/>,       label: 'ENGINE', val: vehicle.engine ? 'ON' : 'OFF',                     col: vehicle.engine ? 'var(--green)' : 'var(--tdim)' },
            { icon: <Bluetooth size={9}/>,   label: 'BT',     val: vehicle.bt ? 'LIVE' : 'OFF',                       col: vehicle.bt ? 'var(--accent)' : 'var(--tdim)' },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(0,212,255,0.03)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--tdim)', marginBottom: 2 }}>
                {m.icon}
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 7, letterSpacing: 1 }}>{m.label}</span>
              </div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 700, color: m.col, lineHeight: 1 }}>
                {m.val}{m.unit && <span style={{ fontSize: 8, color: 'var(--tdim)', marginLeft: 1 }}>{m.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Command result toast */}
      {result && (
        <div style={{ margin: '8px 10px 0', padding: '8px 10px', borderRadius: 4, border: `1px solid ${result.ok ? 'rgba(0,255,157,0.4)' : 'rgba(255,45,68,0.4)'}`, background: result.ok ? 'rgba(0,255,157,0.06)' : 'rgba(255,45,68,0.06)', fontSize: 10, color: result.ok ? 'var(--green)' : 'var(--red)', fontFamily: "'Exo 2',sans-serif", display: 'flex', alignItems: 'center', gap: 6 }} className="a-down">
          {result.ok ? '✓' : '✗'} {result.msg}
        </div>
      )}

      {/* Confirm dialog overlay */}
      {confirm && (
        <ConfirmDialog cmd={confirm} onConfirm={() => exec(confirm)} onCancel={() => setConfirm(null)} />
      )}

      {/* Command groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {GROUPS.map(g => (
          <Group key={g.id} g={g} isOpen={open === g.id} onToggle={() => setOpen(open === g.id ? null : g.id)}
            onRun={run} busy={busy} inputs={inputs} setInputs={setInputs} />
        ))}
      </div>
    </div>
  )
}

function Group({ g, isOpen, onToggle, onRun, busy, inputs, setInputs }) {
  return (
    <div style={{ marginBottom: 5, border: `1px solid ${isOpen ? g.color + '28' : 'var(--border)'}`, borderRadius: 5, overflow: 'hidden', transition: 'border-color 0.18s' }}>
      <button onClick={onToggle} style={{ width: '100%', padding: '8px 11px', background: isOpen ? `${g.color}07` : 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: 7, transition: 'background 0.15s' }}>
        <span style={{ color: g.color }}>{g.icon}</span>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 2, color: isOpen ? g.color : 'var(--tmid)', flex: 1, textAlign: 'left', transition: 'color 0.15s' }}>{g.label}</span>
        <span style={{ fontSize: 7, letterSpacing: 1, padding: '1px 5px', border: `1px solid ${g.color}35`, borderRadius: 2, color: g.color, fontFamily: "'Share Tech Mono',monospace" }}>{g.clearance}</span>
        <span style={{ color: 'var(--tdim)', fontSize: 10, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
      </button>

      {isOpen && (
        <div style={{ padding: '6px 8px', borderTop: `1px solid ${g.color}18` }}>
          {g.cmds.map(cmd => (
            <div key={cmd.type} style={{ marginBottom: 4 }}>
              {cmd.input && (
                <input value={inputs[cmd.type] || ''} onChange={e => setInputs(p => ({ ...p, [cmd.type]: e.target.value }))}
                  placeholder={cmd.input.label} type={cmd.input.type}
                  style={{ width: '100%', background: 'rgba(0,212,255,0.04)', border: '1px solid var(--border2)', borderBottom: 'none', borderRadius: '4px 4px 0 0', padding: '5px 8px', color: 'var(--text)', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, outline: 'none' }} />
              )}
              <button onClick={() => onRun(cmd)} disabled={busy === cmd.type}
                style={{
                  width: '100%', padding: '7px 9px',
                  borderRadius: cmd.input ? '0 0 4px 4px' : '4px',
                  border: `1px solid ${cmd.danger ? 'rgba(255,45,68,0.4)' : `${g.color}28`}`,
                  background: cmd.danger ? 'rgba(255,45,68,0.06)' : `${g.color}06`,
                  color: cmd.danger ? 'var(--red)' : g.color,
                  display: 'flex', alignItems: 'center', gap: 7,
                  transition: 'all 0.13s', opacity: busy === cmd.type ? 0.6 : 1,
                  fontFamily: "'Exo 2',sans-serif",
                }}
                onMouseEnter={e => { if (!cmd.danger) { e.currentTarget.style.background=`${g.color}12`; e.currentTarget.style.boxShadow=`0 0 10px ${g.color}18` } }}
                onMouseLeave={e => { if (!cmd.danger) { e.currentTarget.style.background=`${g.color}06`; e.currentTarget.style.boxShadow='none' } }}>
                {busy === cmd.type ? <Loader size={12} className="a-spin"/> : cmd.icon}
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>{cmd.label}</div>
                  <div style={{ fontSize: 8, color: 'var(--tdim)', marginTop: 1 }}>{cmd.desc}</div>
                </div>
                {cmd.danger && <AlertTriangle size={10} style={{ color: 'var(--red)', opacity: 0.6 }}/>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfirmDialog({ cmd, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('')
  const OK = 'CONFIRM'
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,7,13,0.93)', backdropFilter: 'blur(4px)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} className="a-fade">
      <div style={{ width: '100%', background: 'var(--panel2)', border: '1px solid rgba(255,45,68,0.5)', borderRadius: 7, padding: 18, boxShadow: '0 0 40px rgba(255,45,68,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
          <AlertTriangle size={17} style={{ color: 'var(--red)' }} className="a-blink"/>
          <div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: 2, color: 'var(--red)', fontWeight: 700 }}>DANGEROUS OPERATION</div>
            <div style={{ fontSize: 9, color: 'var(--tmid)', marginTop: 2 }}>{cmd.label}</div>
          </div>
        </div>
        <div style={{ padding: '6px 9px', background: 'rgba(255,45,68,0.06)', border: '1px solid rgba(255,45,68,0.2)', borderRadius: 3, fontSize: 9, fontFamily: "'Share Tech Mono',monospace", color: 'var(--text)', marginBottom: 10 }}>
          Type <span style={{ color: 'var(--red)' }}>CONFIRM</span> to authorize
        </div>
        <input autoFocus value={typed} onChange={e => setTyped(e.target.value.toUpperCase())}
          placeholder="Type CONFIRM..." style={{ width: '100%', background: 'var(--bg)', border: `1px solid ${typed===OK?'var(--green)':'var(--border2)'}`, borderRadius: 4, padding: '8px 10px', color: typed===OK?'var(--green)':'var(--text)', fontFamily: "'Share Tech Mono',monospace", fontSize: 12, letterSpacing: 3, outline: 'none', marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 7 }}>
          <button onClick={onConfirm} disabled={typed!==OK} style={{ flex: 1, padding: 8, background: typed===OK?'rgba(255,45,68,0.15)':'rgba(255,45,68,0.04)', border:`1px solid ${typed===OK?'var(--red)':'rgba(255,45,68,0.2)'}`, borderRadius: 4, color:typed===OK?'var(--red)':'var(--tdim)', fontFamily:"'Rajdhani',sans-serif", fontSize:11, letterSpacing:2, fontWeight:700 }}>EXECUTE</button>
          <button onClick={onCancel} style={{ flex:1, padding:8, background:'transparent', border:'1px solid var(--border2)', borderRadius:4, color:'var(--tdim)', fontFamily:"'Rajdhani',sans-serif", fontSize:11, letterSpacing:2 }}>ABORT</button>
        </div>
      </div>
    </div>
  )
}
