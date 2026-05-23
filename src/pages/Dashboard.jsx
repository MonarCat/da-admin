import { useEffect, useState } from 'react';
import { useVehicles } from '../hooks/useVehicles.js';
import FleetManagement from '../components/FleetManagement';
import AdminManagement from '../components/AdminManagement';
import AdminInbox from '../components/AdminInbox';
import Verification from './Verification.jsx';
import SOSPanel from '../components/panels/SOSPanel.jsx';
import TacticalHeader from '../components/tactical/TacticalHeader.jsx';
import TacticalFooter from '../components/tactical/TacticalFooter.jsx';
import UnitRoster from '../components/tactical/UnitRoster.jsx';
import TacticalMap from '../components/tactical/TacticalMap.jsx';
import OpsPanel from '../components/tactical/OpsPanel.jsx';
import ShadowOpsGuard from '../components/ShadowOpsGuard.jsx';
import ShadowOpsView from '../components/tactical/ShadowOpsView.jsx';

const BASE_VIEWS = ['map', 'fleet', 'sos', 'inbox', 'verify'];

export default function Dashboard({ user, profile, onSignOut, isDemo = false }) {
  const [view, setView] = useState('map');
  const { vehicles, loading, selectedVehicle, setSelectedVehicle, sosAlerts, resolveSOS } = useVehicles(isDemo);

  const isSuperAdmin = profile?.clearance_level >= 10 || profile?.role === 'super_admin';
  const allowedViews = isSuperAdmin ? [...BASE_VIEWS, 'admins'] : BASE_VIEWS;

  useEffect(() => {
    if (!allowedViews.includes(view) && view !== 'shadow-ops') setView('map');
  }, [view, allowedViews]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#040D0A', overflow: 'hidden' }}>
      <TacticalHeader user={user} profile={profile} view={view} setView={setView} onSignOut={onSignOut} />

      {allowedViews.includes(view) && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <UnitRoster onSelectVehicle={setSelectedVehicle} />
          <div style={{ flex: 1, overflow: 'auto', borderRight: '1px solid #0B2A1C' }}>
            {view === 'map' && (loading ? <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3A7A5A', fontFamily: "'Share Tech Mono',monospace", fontSize: 11 }}>LOADING FLEET...</div> : <TacticalMap selectedVehicle={selectedVehicle} />)}
            {view === 'fleet' && <FleetManagement adminUser={user} />}
            {view === 'sos' && <SOSPanel alerts={sosAlerts} onResolve={resolveSOS} onSelect={(v) => { setSelectedVehicle(v); setView('map'); }} />}
            {view === 'inbox' && <AdminInbox adminUser={user} />}
            {view === 'verify' && <Verification vehicles={vehicles} isDemo={isDemo} />}
            {view === 'admins' && isSuperAdmin && <AdminManagement adminUser={user} />}
          </div>
          <OpsPanel profile={profile} vehicles={vehicles} />
        </div>
      )}

      {view === 'shadow-ops' && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ShadowOpsGuard onBack={() => setView('map')}>
            <ShadowOpsView profile={profile} />
          </ShadowOpsGuard>
        </div>
      )}

      <TacticalFooter />
    </div>
  );
}
