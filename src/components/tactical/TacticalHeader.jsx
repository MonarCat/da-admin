import { useEffect, useState } from 'react';

const NAV_VIEWS = [
  { id: 'map', label: 'LIVE MAP' },
  { id: 'fleet', label: 'FLEET' },
  { id: 'sos', label: 'SOS' },
  { id: 'inbox', label: 'INBOX' },
  { id: 'verify', label: 'VERIFY' },
];

const ADMIN_VIEW = { id: 'admins', label: 'ADMINS' };
const SHADOW_VIEW = { id: 'shadow-ops', label: 'SHADOW OPS' };

export default function TacticalHeader({ user, profile, view, setView, onSignOut }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () =>
      setTime([new Date().getHours(), new Date().getMinutes(), new Date().getSeconds()].map((v) => String(v).padStart(2, '0')).join(':'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isSuperAdmin = profile?.clearance_level >= 10 || profile?.role === 'super_admin';
  const navItems = isSuperAdmin ? [...NAV_VIEWS, ADMIN_VIEW, SHADOW_VIEW] : NAV_VIEWS;

  return (
    <div
      style={{
        background: '#020806',
        borderBottom: '1px solid #0B2A1C',
        padding: '0 14px',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        height: 52,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'Orbitron,sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', color: '#00FF8A' }}>[ D·A ] DRIVE ASSISTANT</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: '0.1em', color: '#3A7A5A', marginTop: 1 }}>TACTICAL OPERATIONS CENTER  //  v2.4.1-ALPHA</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
          {navItems.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: view === v.id ? `2px solid ${v.id === 'shadow-ops' ? '#FF3838' : '#00FF8A'}` : '2px solid transparent',
                color: view === v.id ? (v.id === 'shadow-ops' ? '#FF3838' : '#00FF8A') : v.id === 'shadow-ops' ? '#7A3A3A' : '#3A7A5A',
                fontFamily: "'Rajdhani',sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                padding: '0 14px',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="tac-classified" style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em' }}>
          ■ TOP SECRET // RESTRICTED ■
        </div>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: '0.06em', color: '#3A7A5A', marginTop: 2 }}>
          {profile?.badge_number ? `BADGE: ${profile.badge_number}` : `UID: ${(user?.id ?? '--------').slice(0, 8).toUpperCase()}…`}
          &nbsp;//&nbsp;L{profile?.clearance_level ?? 1}&nbsp;//&nbsp;{(profile?.role ?? 'OPERATOR').toUpperCase()}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 20, fontWeight: 700, color: '#00FF8A', letterSpacing: '0.06em', lineHeight: 1 }}>{time}</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: '0.08em', color: '#3A7A5A', marginTop: 2 }}>NBI-LOCAL  //  MESH: ACTIVE</div>
        </div>
        <button onClick={onSignOut} className="tac-btn danger" style={{ fontSize: 9, padding: '3px 10px' }}>
          LOGOUT
        </button>
      </div>
    </div>
  );
}
