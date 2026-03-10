// src/pages/AdminDashboard.jsx
// Main admin command center layout

import React, { useState } from 'react'
import {
  Activity, Map, Users, Shield, List, LogOut,
  AlertTriangle, Cpu, Radio, Eye, Menu, X
} from 'lucide-react'
import AdminMap from '../components/map/AdminMap'
import VehicleCommandCenter from '../components/controls/VehicleCommandCenter'
import VehicleList from '../components/panels/VehicleList'
import SOSPanel from '../components/panels/SOSPanel'
import CommandLog from '../components/panels/CommandLog'
import NetworkStats from '../components/panels/NetworkStats'
import AuditPanel from '../components/panels/AuditPanel'
import { useAdminVehicles } from '../hooks/useAdminVehicles'
import { supabase } from '../lib/supabase'

const NAV_ITEMS = [
  { id: 'map',     label: 'LIVE MAP',    icon: <Map size={14}/> },
  { id: 'fleet',   label: 'FLEET',       icon: <List size={14}/> },
  { id: 'sos',     label: 'SOS',         icon: <AlertTriangle size={14}/> },
  { id: 'network', label: 'NETWORK',     icon: <Activity size={14}/> },
  { id: 'audit',   label: 'AUDIT LOG',   icon: <Eye size={14}/> },
]

export default function AdminDashboard({ user }) {
  const [activeView, setActiveView] = useState('map')
  const {
    vehicles, loading, selectedVehicle, setSelectedVehicle,
    sosAlerts, commandLog, networkStats, issueCommand, resolveSOS,
  } = useAdminVehicles()

  const sosCount = sosAlerts.length
  const role = user?.profile?.role || 'admin'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: 'var(--bg)', overflow: 'hidden',
    }}>
      {/* ══ TOP BAR ══════════════════════════════════════════ */}
      <header style={{
        height: '50px',
        background: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: '12px',
        flexShrink: 0, zIndex: 300,
        position: 'relative',
      }}>
        {/* Animated corner accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(90deg, rgba(0,212,255,0.03) 0%, transparent 40%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '14px', fontWeight: 800,
          letterSpacing: '4px', color: 'var(--accent)',
          textShadow: '0 0 16px rgba(0,212,255,0.4)',
        }}>
          D.A
        </div>
        <div style={{
          fontSize: '8px', letterSpacing: '3px', color: 'var(--text-dim)',
          fontFamily: "'Share Tech Mono', monospace",
          paddingLeft: '10px', borderLeft: '1px solid var(--border2)',
        }}>
          COMMAND CENTER
        </div>
        <div style={{
          fontSize: '7px', padding: '2px 7px',
          background: 'rgba(212,168,71,0.1)',
          border: '1px solid rgba(212,168,71,0.3)',
          borderRadius: '2px',
          color: 'var(--gold)',
          fontFamily: "'Share Tech Mono', monospace",
          letterSpacing: '2px',
        }}>
          {role.toUpperCase().replace('_', ' ')}
        </div>

        {/* Nav */}
        <nav style={{
          display: 'flex', gap: '2px',
          marginLeft: '20px', flex: 1,
        }}>
          {NAV_ITEMS.map(item => (
            <NavBtn
              key={item.id}
              item={item}
              isActive={activeView === item.id}
              onClick={() => setActiveView(item.id)}
              badge={item.id === 'sos' ? sosCount : 0}
            />
          ))}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: 'auto' }}>
          <StatChip label="NODES" value={networkStats.active} color="var(--accent)" />
          <StatChip label="SOS" value={networkStats.sos} color={networkStats.sos > 0 ? 'var(--red)' : 'var(--text-dim)'} blink={networkStats.sos > 0} />
          <StatChip label="MOVING" value={networkStats.moving} color="var(--green)" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '10px', borderLeft: '1px solid var(--border)' }}>
            <div style={{
              width: '24px', height: '24px',
              borderRadius: '50%',
              background: 'rgba(212,168,71,0.1)',
              border: '1px solid rgba(212,168,71,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px',
            }}>
              {user?.profile?.full_name?.[0] || 'A'}
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-mid)', fontFamily: "'Share Tech Mono', monospace" }}>
              {user?.profile?.full_name?.split(' ')[0] || 'ADMIN'}
            </span>
          </div>

          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '4px', padding: '4px 8px',
              color: 'var(--text-dim)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '10px', fontFamily: "'Share Tech Mono', monospace",
              letterSpacing: '1px',
            }}
          >
            <LogOut size={11} /> EXIT
          </button>
        </div>
      </header>

      {/* ══ MAIN BODY ═════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT: Vehicle List ── */}
        <VehicleList
          vehicles={vehicles}
          loading={loading}
          selectedVehicle={selectedVehicle}
          onSelect={setSelectedVehicle}
          sosAlerts={sosAlerts}
        />

        {/* ── CENTER: Active View ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {activeView === 'map' && (
            <AdminMap
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onVehicleSelect={setSelectedVehicle}
            />
          )}
          {activeView === 'fleet' && (
            <FleetView vehicles={vehicles} onSelect={setSelectedVehicle} />
          )}
          {activeView === 'sos' && (
            <SOSPanel alerts={sosAlerts} onResolve={resolveSOS} onSelect={v => { setSelectedVehicle(v); setActiveView('map') }} />
          )}
          {activeView === 'network' && (
            <NetworkStats stats={networkStats} vehicles={vehicles} />
          )}
          {activeView === 'audit' && (
            <AuditPanel />
          )}
        </div>

        {/* ── RIGHT: Command Center ── */}
        <div style={{
          width: '288px',
          background: 'var(--panel)',
          borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', flexShrink: 0,
          position: 'relative',
        }}>
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '8px',
            flexShrink: 0,
          }}>
            <Cpu size={11} style={{ color: 'var(--accent)' }} />
            <span style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '9px', letterSpacing: '3px',
              color: 'var(--accent)',
            }}>COMMAND CENTER</span>
            {selectedVehicle && (
              <div style={{
                marginLeft: 'auto', width: '6px', height: '6px',
                borderRadius: '50%', background: 'var(--green)',
                boxShadow: '0 0 6px var(--green)',
                animation: 'pulse 1.5s infinite',
              }} />
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
            <VehicleCommandCenter
              vehicle={selectedVehicle}
              issueCommand={issueCommand}
            />
          </div>

          {/* Command Log strip */}
          <CommandLog commands={commandLog} />
        </div>
      </div>

      {/* ══ BOTTOM BAR ═══════════════════════════════════════ */}
      <footer style={{
        height: '24px',
        background: 'rgba(0,212,255,0.02)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 14px', gap: '20px', flexShrink: 0,
      }}>
        {[
          `🛰 MESH: ${networkStats.active} ACTIVE NODES`,
          `📡 PROTOCOL: BT/WIFI-P2P/LTE`,
          `🔐 E2E ENCRYPTED · TLS 1.3`,
          `⚡ LATENCY: ~23ms`,
        ].map(t => (
          <span key={t} style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '8px', color: 'var(--text-dim)', letterSpacing: '1px',
          }}>{t}</span>
        ))}
        <span style={{ marginLeft: 'auto', fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--accent)' }}>
          D.A COMMAND v0.1 — RESTRICTED
        </span>
      </footer>
    </div>
  )
}

function NavBtn({ item, isActive, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '5px 10px',
        background: isActive ? 'rgba(0,212,255,0.1)' : 'transparent',
        border: `1px solid ${isActive ? 'rgba(0,212,255,0.3)' : 'transparent'}`,
        borderRadius: '4px',
        color: isActive ? 'var(--accent)' : 'var(--text-mid)',
        cursor: 'pointer',
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '9px', letterSpacing: '1.5px',
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      {item.icon} {item.label}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: '-4px', right: '-4px',
          background: 'var(--red)', color: '#fff',
          borderRadius: '50%', width: '14px', height: '14px',
          fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'blink 0.8s infinite', fontFamily: "'Orbitron', sans-serif",
        }}>{badge}</span>
      )}
    </button>
  )
}

function StatChip({ label, value, color, blink }) {
  return (
    <div style={{ textAlign: 'center', animation: blink ? 'blink 0.9s infinite' : 'none' }}>
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '14px', fontWeight: 700, color, lineHeight: 1,
      }}>{value}</div>
      <div style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '7px', letterSpacing: '2px',
        color: 'var(--text-dim)', marginTop: '1px',
      }}>{label}</div>
    </div>
  )
}

function FleetView({ vehicles, onSelect }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <div style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '9px', letterSpacing: '3px', color: 'var(--text-dim)',
        marginBottom: '12px',
      }}>
        FLEET REGISTRY — {vehicles.length} VEHICLES
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['PLATE', 'OWNER', 'MAKE/MODEL', 'STATUS', 'SPEED', 'FUEL', 'ROUTE', 'LAST SEEN'].map(h => (
                <th key={h} style={{
                  padding: '6px 10px', textAlign: 'left',
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: '8px', letterSpacing: '2px', color: 'var(--text-dim)',
                  fontWeight: 400,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => {
              const statusColors = { moving: 'var(--green)', parked: 'var(--yellow)', stalled: 'var(--yellow)', sos: 'var(--red)', offline: 'var(--text-dim)' }
              return (
                <tr
                  key={v.id}
                  onClick={() => onSelect(v)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '8px 10px', fontFamily: "'Rajdhani',sans-serif", fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '2px' }}>{v.plate}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-mid)' }}>{v.owner?.full_name || '—'}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-mid)' }}>{v.make} {v.model}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ color: statusColors[v.status] || 'var(--text-dim)', fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', letterSpacing: '1px' }}>
                      {v.status?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: "'Share Tech Mono',monospace", color: 'var(--accent)' }}>
                    {v.speed > 0 ? `${Math.round(v.speed)} km/h` : '—'}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: "'Share Tech Mono',monospace", color: v.fuel_level < 15 ? 'var(--red)' : 'var(--text-mid)' }}>
                    {v.fuel_level != null ? `${v.fuel_level}%` : '—'}
                  </td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-mid)', fontSize: '10px' }}>{v.current_route || '—'}</td>
                  <td style={{ padding: '8px 10px', fontFamily: "'Share Tech Mono',monospace", fontSize: '9px', color: 'var(--text-dim)' }}>
                    {v.last_seen ? new Date(v.last_seen).toLocaleTimeString('en-KE', { hour12: false }) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
