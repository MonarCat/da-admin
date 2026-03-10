// src/components/controls/VehicleCommandCenter.jsx
// The core admin control panel — issue commands to any vehicle
// Government-grade UI for high-stakes operations

import React, { useState } from 'react'
import {
  Power, Zap, Lock, Unlock, Bluetooth, BluetoothOff,
  Music, MicOff, Volume2, VolumeX, Siren, Navigation,
  MapPin, Radio, MessageSquare, Eye, EyeOff, Shield,
  AlertTriangle, CheckCircle, XCircle, Loader, ChevronDown,
  Activity, Cpu, Thermometer, Gauge, Wifi, Battery
} from 'lucide-react'
import { useCommandIssuance } from '../../hooks/useAdminVehicles'
import { STATUS_CONFIG } from '../../lib/vehicleConfig'

const COMMAND_GROUPS = [
  {
    id: 'engine',
    label: 'ENGINE CONTROL',
    color: 'var(--red)',
    icon: <Power size={12} />,
    clearance: 'ALPHA',
    commands: [
      { type: 'stop_engine',    label: 'STOP ENGINE',     icon: <Power size={14}/>,    danger: true,  desc: 'Cuts ignition remotely' },
      { type: 'start_engine',   label: 'START ENGINE',    icon: <Zap size={14}/>,      danger: true,  desc: 'Remote start ignition' },
      { type: 'immobilize',     label: 'IMMOBILIZE',      icon: <Shield size={14}/>,   danger: true,  desc: 'Full vehicle lockdown' },
      { type: 'release_immobilize', label: 'RELEASE',     icon: <CheckCircle size={14}/>, danger: false, desc: 'Release immobilize' },
    ]
  },
  {
    id: 'autopilot',
    label: 'AUTOPILOT',
    color: 'var(--purple)',
    icon: <Navigation size={12} />,
    clearance: 'BETA',
    commands: [
      { type: 'activate_autopilot',   label: 'ENGAGE AUTOPILOT', icon: <Navigation size={14}/>, danger: true,  desc: 'Engage autonomous mode' },
      { type: 'deactivate_autopilot', label: 'DISENGAGE',        icon: <Activity size={14}/>,   danger: false, desc: 'Return manual control' },
    ]
  },
  {
    id: 'access',
    label: 'ACCESS CONTROL',
    color: 'var(--orange)',
    icon: <Lock size={12} />,
    clearance: 'GAMMA',
    commands: [
      { type: 'lock_doors',   label: 'LOCK ALL DOORS',   icon: <Lock size={14}/>,   danger: false, desc: 'Lock all doors remotely' },
      { type: 'unlock_doors', label: 'UNLOCK DOORS',     icon: <Unlock size={14}/>, danger: true,  desc: 'Unlock — use with caution' },
    ]
  },
  {
    id: 'bluetooth',
    label: 'BLUETOOTH OVERRIDE',
    color: 'var(--accent)',
    icon: <Bluetooth size={12} />,
    clearance: 'DELTA',
    commands: [
      { type: 'force_bluetooth',     label: 'FORCE CONNECT BT',   icon: <Bluetooth size={14}/>,    danger: false, desc: 'Override BT to admin device' },
      { type: 'disconnect_bluetooth',label: 'DISCONNECT BT',       icon: <BluetoothOff size={14}/>, danger: false, desc: 'Sever all BT connections' },
    ]
  },
  {
    id: 'media',
    label: 'MEDIA CONTROL',
    color: 'var(--green)',
    icon: <Music size={12} />,
    clearance: 'EPSILON',
    commands: [
      { type: 'play_music',  label: 'PLAY AUDIO',    icon: <Music size={14}/>,    danger: false, desc: 'Broadcast audio to vehicle', hasPayload: true, payloadLabel: 'Track/URL', payloadKey: 'track' },
      { type: 'stop_music',  label: 'STOP AUDIO',    icon: <MicOff size={14}/>,   danger: false, desc: 'Cut all vehicle audio' },
      { type: 'set_volume',  label: 'SET VOLUME',    icon: <Volume2 size={14}/>,  danger: false, desc: 'Override speaker volume', hasPayload: true, payloadLabel: 'Level 0-100', payloadKey: 'volume', payloadType: 'number' },
    ]
  },
  {
    id: 'alarm',
    label: 'ALARM SYSTEM',
    color: 'var(--red)',
    icon: <Siren size={12} />,
    clearance: 'ALPHA',
    commands: [
      { type: 'activate_alarm',   label: 'TRIGGER ALARM',   icon: <Siren size={14}/>,  danger: false, desc: 'Activate horn + lights' },
      { type: 'deactivate_alarm', label: 'SILENCE ALARM',   icon: <VolumeX size={14}/>,danger: false, desc: 'Deactivate alarm system' },
    ]
  },
  {
    id: 'tracking',
    label: 'SURVEILLANCE',
    color: 'var(--accent)',
    icon: <Eye size={12} />,
    clearance: 'GAMMA',
    commands: [
      { type: 'request_location',  label: 'FORCE PING',       icon: <MapPin size={14}/>,  danger: false, desc: 'Request immediate GPS report' },
      { type: 'enable_tracking',   label: 'ENABLE TRACKING',  icon: <Eye size={14}/>,     danger: false, desc: 'Activate continuous tracking' },
      { type: 'disable_tracking',  label: 'DISABLE TRACKING', icon: <EyeOff size={14}/>,  danger: true,  desc: 'Suspend tracking (requires clearance)' },
    ]
  },
  {
    id: 'comms',
    label: 'COMMUNICATIONS',
    color: 'var(--green)',
    icon: <Radio size={12} />,
    clearance: 'EPSILON',
    commands: [
      { type: 'broadcast_message', label: 'BROADCAST MSG',  icon: <MessageSquare size={14}/>, danger: false, desc: 'Push message to vehicle display', hasPayload: true, payloadLabel: 'Message text', payloadKey: 'message' },
      { type: 'sos_response',      label: 'SOS RESPONSE',   icon: <Radio size={14}/>,         danger: false, desc: 'Open emergency comm channel' },
    ]
  },
]

export default function VehicleCommandCenter({ vehicle, issueCommand }) {
  const { pendingCommand, commandResult, confirmDialog, requestCommand, confirmCommand, cancelConfirm }
    = useCommandIssuance(issueCommand)

  const [expandedGroup, setExpandedGroup] = useState('engine')
  const [payloadInputs, setPayloadInputs] = useState({})

  if (!vehicle) return <EmptyState />

  const cfg = STATUS_CONFIG[vehicle.status] || STATUS_CONFIG.offline

  const handleCommand = (cmd, group) => {
    const payload = {}
    if (cmd.hasPayload && cmd.payloadKey) {
      const val = payloadInputs[cmd.type]
      if (val) payload[cmd.payloadKey] = cmd.payloadType === 'number' ? Number(val) : val
    }
    requestCommand(vehicle.id, cmd.type, payload, cmd.label, cmd.danger)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* ── Vehicle Identity Header ── */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(135deg, var(--panel2) 0%, var(--bg2) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Corner accent */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: '60px', height: '60px',
          borderLeft: '1px solid var(--border2)',
          borderBottom: '1px solid var(--border2)',
          background: 'rgba(0,212,255,0.02)',
        }} />

        <div style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '8px', letterSpacing: '3px', color: 'var(--text-dim)',
          marginBottom: '8px',
        }}>
          ACTIVE TARGET
        </div>

        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '22px', fontWeight: 700,
          color: '#fff', letterSpacing: '4px',
          textShadow: '0 0 20px rgba(255,255,255,0.15)',
        }}>
          {vehicle.plate}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
          <StatusDot status={vehicle.status} config={cfg} />
          <span style={{ fontSize: '11px', color: 'var(--text-mid)' }}>
            {vehicle.make} {vehicle.model} · {vehicle.owner?.full_name || 'Unknown'}
          </span>
        </div>

        {/* Live metrics strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          gap: '6px', marginTop: '12px',
        }}>
          <MiniMetric icon={<Gauge size={9}/>} label="SPEED" value={`${Math.round(vehicle.speed || 0)}`} unit="km/h" color="var(--accent)" />
          <MiniMetric icon={<Battery size={9}/>} label="FUEL" value={`${vehicle.fuel_level || 0}`} unit="%" color={vehicle.fuel_level < 15 ? 'var(--red)' : 'var(--green)'} />
          <MiniMetric icon={<Cpu size={9}/>} label="ENGINE" value={vehicle.engine_on ? 'ON' : 'OFF'} color={vehicle.engine_on ? 'var(--green)' : 'var(--text-dim)'} />
          <MiniMetric icon={<Bluetooth size={9}/>} label="BT" value={vehicle.bluetooth_active ? 'LIVE' : 'OFF'} color={vehicle.bluetooth_active ? 'var(--accent)' : 'var(--text-dim)'} />
        </div>
      </div>

      {/* ── Command Result Feedback ── */}
      {commandResult && (
        <div style={{
          margin: '10px 12px 0',
          padding: '10px 12px',
          borderRadius: '5px',
          border: `1px solid ${commandResult.success ? 'rgba(0,255,157,0.4)' : 'rgba(255,45,68,0.4)'}`,
          background: commandResult.success ? 'rgba(0,255,157,0.07)' : 'rgba(255,45,68,0.07)',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '11px',
          color: commandResult.success ? 'var(--green)' : 'var(--red)',
          fontFamily: "'Exo 2', sans-serif",
        }} className="animate-slide-down">
          {commandResult.success ? <CheckCircle size={13}/> : <XCircle size={13}/>}
          {commandResult.message}
        </div>
      )}

      {/* ── Confirm Dialog (Dangerous Commands) ── */}
      {confirmDialog && (
        <ConfirmDialog
          dialog={confirmDialog}
          onConfirm={confirmCommand}
          onCancel={cancelConfirm}
        />
      )}

      {/* ── Command Groups ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {COMMAND_GROUPS.map(group => (
          <CommandGroup
            key={group.id}
            group={group}
            vehicle={vehicle}
            isExpanded={expandedGroup === group.id}
            onToggle={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
            onCommand={handleCommand}
            pendingCommand={pendingCommand}
            payloadInputs={payloadInputs}
            setPayloadInputs={setPayloadInputs}
          />
        ))}
      </div>
    </div>
  )
}

// ── Command Group ──────────────────────────────────────────────
function CommandGroup({ group, vehicle, isExpanded, onToggle, onCommand, pendingCommand, payloadInputs, setPayloadInputs }) {
  return (
    <div style={{
      marginBottom: '6px',
      border: `1px solid ${isExpanded ? group.color + '30' : 'var(--border)'}`,
      borderRadius: '6px',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Group Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '9px 12px',
          background: isExpanded ? `${group.color}08` : 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'background 0.15s',
        }}
      >
        <span style={{ color: group.color }}>{group.icon}</span>
        <span style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '9px', letterSpacing: '2px',
          color: isExpanded ? group.color : 'var(--text-mid)',
          flex: 1, textAlign: 'left',
          transition: 'color 0.15s',
        }}>
          {group.label}
        </span>
        <span style={{
          fontSize: '7px', letterSpacing: '1.5px', padding: '1px 5px',
          border: `1px solid ${group.color}40`,
          borderRadius: '2px', color: group.color,
          fontFamily: "'Share Tech Mono', monospace",
        }}>
          {group.clearance}
        </span>
        <ChevronDown size={11} style={{
          color: 'var(--text-dim)',
          transform: isExpanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }} />
      </button>

      {/* Commands */}
      {isExpanded && (
        <div style={{ padding: '8px', borderTop: `1px solid ${group.color}20` }}>
          {group.commands.map(cmd => (
            <CommandButton
              key={cmd.type}
              cmd={cmd}
              vehicle={vehicle}
              onCommand={() => onCommand(cmd, group)}
              isPending={pendingCommand === cmd.type}
              payloadValue={payloadInputs[cmd.type] || ''}
              onPayloadChange={(v) => setPayloadInputs(p => ({ ...p, [cmd.type]: v }))}
              groupColor={group.color}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Single Command Button ──────────────────────────────────────
function CommandButton({ cmd, onCommand, isPending, groupColor, payloadValue, onPayloadChange }) {
  return (
    <div style={{ marginBottom: '5px' }}>
      {/* Payload input if needed */}
      {cmd.hasPayload && (
        <input
          value={payloadValue}
          onChange={e => onPayloadChange(e.target.value)}
          placeholder={cmd.payloadLabel}
          type={cmd.payloadType === 'number' ? 'number' : 'text'}
          style={{
            width: '100%',
            background: 'rgba(0,212,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: '4px 4px 0 0',
            padding: '5px 8px',
            color: 'var(--text)',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '10px',
            outline: 'none',
            borderBottom: 'none',
          }}
        />
      )}

      <button
        onClick={onCommand}
        disabled={isPending}
        className={cmd.danger ? 'danger-btn' : ''}
        style={{
          width: '100%',
          padding: '8px 10px',
          border: cmd.danger
            ? undefined
            : `1px solid ${groupColor}30`,
          borderRadius: cmd.hasPayload ? '0 0 4px 4px' : '4px',
          background: cmd.danger ? undefined : `${groupColor}06`,
          color: cmd.danger ? undefined : groupColor,
          cursor: isPending ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px',
          transition: 'all 0.15s',
          opacity: isPending ? 0.6 : 1,
          fontFamily: "'Exo 2', sans-serif",
        }}
        onMouseEnter={e => {
          if (!isPending && !cmd.danger) {
            e.currentTarget.style.background = `${groupColor}12`
            e.currentTarget.style.borderColor = `${groupColor}70`
            e.currentTarget.style.boxShadow = `0 0 12px ${groupColor}20`
          }
        }}
        onMouseLeave={e => {
          if (!cmd.danger) {
            e.currentTarget.style.background = `${groupColor}06`
            e.currentTarget.style.borderColor = `${groupColor}30`
            e.currentTarget.style.boxShadow = 'none'
          }
        }}
      >
        {isPending
          ? <Loader size={13} style={{ animation: 'rotateRing 1s linear infinite' }} />
          : cmd.icon
        }
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: '10px', letterSpacing: '1px', fontWeight: 600 }}>
            {cmd.label}
          </div>
          <div style={{ fontSize: '8px', color: 'var(--text-dim)', marginTop: '1px' }}>
            {cmd.desc}
          </div>
        </div>
        {cmd.danger && (
          <AlertTriangle size={11} style={{ color: 'var(--red)', opacity: 0.6 }} />
        )}
      </button>
    </div>
  )
}

// ── Confirm Dialog for Dangerous Commands ──────────────────────
function ConfirmDialog({ dialog, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('')
  const required = 'CONFIRM'

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(2,7,13,0.92)',
      backdropFilter: 'blur(4px)',
      zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }} className="animate-fade">
      <div style={{
        background: 'var(--panel2)',
        border: '1px solid rgba(255,45,68,0.5)',
        borderRadius: '8px',
        padding: '20px',
        width: '100%',
        boxShadow: '0 0 40px rgba(255,45,68,0.15)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '12px',
        }}>
          <div style={{ animation: 'blink 0.8s infinite' }}>
            <AlertTriangle size={18} style={{ color: 'var(--red)' }} />
          </div>
          <div>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '11px', letterSpacing: '2px',
              color: 'var(--red)', fontWeight: 700,
            }}>
              DANGEROUS OPERATION
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-mid)', marginTop: '2px' }}>
              {dialog.label} — confirm with authorization code
            </div>
          </div>
        </div>

        <div style={{
          padding: '8px 10px',
          background: 'rgba(255,45,68,0.06)',
          border: '1px solid rgba(255,45,68,0.2)',
          borderRadius: '4px',
          fontSize: '10px',
          color: 'var(--text)',
          marginBottom: '12px',
          fontFamily: "'Share Tech Mono', monospace",
        }}>
          Type <span style={{ color: 'var(--red)' }}>CONFIRM</span> to authorize this command
        </div>

        <input
          autoFocus
          value={typed}
          onChange={e => setTyped(e.target.value.toUpperCase())}
          placeholder="Type CONFIRM..."
          style={{
            width: '100%',
            background: 'var(--bg)',
            border: `1px solid ${typed === required ? 'var(--green)' : 'var(--border2)'}`,
            borderRadius: '4px',
            padding: '8px 10px',
            color: typed === required ? 'var(--green)' : 'var(--text)',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '12px',
            outline: 'none',
            letterSpacing: '3px',
            marginBottom: '12px',
          }}
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onConfirm}
            disabled={typed !== required}
            style={{
              flex: 1, padding: '9px',
              background: typed === required ? 'rgba(255,45,68,0.15)' : 'rgba(255,45,68,0.04)',
              border: `1px solid ${typed === required ? 'var(--red)' : 'rgba(255,45,68,0.2)'}`,
              borderRadius: '4px',
              color: typed === required ? 'var(--red)' : 'var(--text-dim)',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: '11px', letterSpacing: '2px', fontWeight: 700,
              cursor: typed === required ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            EXECUTE
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '9px',
              background: 'transparent',
              border: '1px solid var(--border2)',
              borderRadius: '4px',
              color: 'var(--text-dim)',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: '11px', letterSpacing: '2px',
              cursor: 'pointer',
            }}
          >
            ABORT
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusDot({ status, config: cfg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <div style={{
        width: '6px', height: '6px',
        borderRadius: '50%',
        background: cfg.color,
        boxShadow: `0 0 6px ${cfg.color}`,
        animation: status === 'sos' ? 'blink 0.7s infinite' : 'none',
      }} />
      <span style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '9px', letterSpacing: '2px',
        color: cfg.color,
      }}>{cfg.label}</span>
    </div>
  )
}

function MiniMetric({ icon, label, value, unit, color }) {
  return (
    <div style={{
      background: 'rgba(0,212,255,0.03)',
      border: '1px solid var(--border)',
      borderRadius: '4px',
      padding: '5px 6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-dim)', marginBottom: '2px' }}>
        {icon}
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '7px', letterSpacing: '1px' }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '13px', fontWeight: 700, color, lineHeight: 1 }}>
        {value}{unit && <span style={{ fontSize: '8px', color: 'var(--text-dim)', marginLeft: '1px' }}>{unit}</span>}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', gap: '12px',
    }}>
      <div style={{
        width: '52px', height: '52px',
        borderRadius: '50%',
        border: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-dim)',
        animation: 'rotateRing 8s linear infinite',
      }}>
        <Cpu size={20} />
      </div>
      <div style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '9px', letterSpacing: '3px',
        color: 'var(--text-dim)', textAlign: 'center', lineHeight: 2,
      }}>
        SELECT A VEHICLE<br/>TO ACCESS CONTROLS
      </div>
    </div>
  )
}
