import ShadowMeshTracker from './ShadowMeshTracker.jsx';
import AITerminal from './AITerminal.jsx';

export default function ShadowOpsView({ profile }) {
  return (
    <div style={{ height: '100%', background: '#040D0A', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24, gap: 20 }}>
      <div style={{ fontFamily: 'Orbitron,sans-serif', fontSize: 11, letterSpacing: '0.2em', color: '#FF3838' }}>■ CLASSIFIED — SHADOW MESH COMMAND ■</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 900 }}>
        <ShadowMeshTracker currentPhase={1} isSuperAdmin={profile?.clearance_level >= 10 || profile?.role === 'super_admin'} onEscalate={(p) => console.log('Phase:', p)} />
        <AITerminal context={{ meshPhase: 1, activeUnits: 0, anomalyCount: 0 }} />
      </div>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#3A7A5A', letterSpacing: '0.08em', textAlign: 'center' }}>
        MIHU INTELLIGENCE MODULE — PENDING HARDWARE CONNECTION
        <br />
        SIMULATION MODE AVAILABLE IN NEXT BUILD
      </div>
    </div>
  );
}
