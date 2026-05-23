import ShadowMeshTracker from './ShadowMeshTracker.jsx';
import AITerminal from './AITerminal.jsx';
import IntelFeed from './IntelFeed.jsx';

export default function OpsPanel({ profile, vehicles = [] }) {
  const context = {
    activeUnits: vehicles.filter((v) => ['active', 'tracking', 'moving'].includes(v.status || v.vehicle_status)).length,
    anomalyCount: 0,
    meshPhase: 1,
  };
  return (
    <div style={{ width: 215, minWidth: 215, height: '100%', background: '#040D0A', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 10, gap: 8 }}>
      <ShadowMeshTracker currentPhase={1} isSuperAdmin={profile?.clearance_level >= 10 || profile?.role === 'super_admin'} />
      <AITerminal context={context} />
      <IntelFeed vehicles={vehicles} />
    </div>
  );
}
