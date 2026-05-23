import { useState } from 'react';

const PHASES = [
  { n: 1, code: 'PH.1', label: 'SURVEILLANCE' },
  { n: 2, code: 'PH.2', label: 'MONITORING' },
  { n: 3, code: 'PH.3', label: 'INTERCEPT READY' },
  { n: 4, code: 'PH.4', label: 'ACTIVE PURSUIT' },
  { n: 5, code: 'PH.5', label: 'CONTAINMENT' },
  { n: 6, code: 'PH.6', label: 'TERMINATION' },
];

export default function ShadowMeshTracker({ currentPhase = 1, isSuperAdmin, onEscalate }) {
  const [phase, setPhase] = useState(currentPhase);
  const cur = PHASES.find((p) => p.n === phase) ?? PHASES[0];

  function escalate() {
    if (!isSuperAdmin || phase >= 6) return;
    const next = PHASES[phase];
    if (!window.confirm(`ESCALATE TO ${next.code}: ${next.label}?\nThis action will be logged.`)) return;
    setPhase(phase + 1);
    onEscalate?.(phase + 1);
  }

  return (
    <div style={{ background: '#020806', border: '1px solid #0B2A1C', borderRadius: 4, padding: '8px 10px' }}>
      <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, letterSpacing: '0.14em', color: '#3A7A5A', marginBottom: 5 }}>SHADOW MESH STATUS</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
        <span style={{ fontFamily: 'Orbitron,sans-serif', fontSize: 22, fontWeight: 700, color: '#00FF8A' }}>{cur.code}</span>
        <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, letterSpacing: '0.1em', color: '#3A7A5A' }}>{cur.label}</span>
      </div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
        {PHASES.map((p) => (
          <div key={p.n} style={{ flex: 1, height: 3, borderRadius: 2, background: p.n <= phase ? '#00FF8A' : '#0A2218' }} />
        ))}
      </div>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: '0.06em', color: '#3A7A5A' }}>ESCALATION: MANUAL  //  AUTH: SUPER_ADMIN</div>
      {isSuperAdmin && phase < 6 && (
        <button
          onClick={escalate}
          style={{
            marginTop: 8,
            width: '100%',
            background: 'transparent',
            border: '1px solid #FF3838',
            color: '#FF3838',
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 10,
            letterSpacing: '0.1em',
            padding: '4px 0',
            cursor: 'pointer',
            borderRadius: 3,
          }}
        >
          ESCALATE → {PHASES[phase]?.code}
        </button>
      )}
    </div>
  );
}
