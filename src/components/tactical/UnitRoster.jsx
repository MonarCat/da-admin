import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

function toCallsign(plate) {
  if (!plate) return '???';
  const p = plate.replace(/\s/g, '').toUpperCase();
  const L = p.match(/^[A-Z]+/)?.[0] ?? '';
  const N = p.slice(L.length).match(/\d+/)?.[0] ?? '';
  const S = p.slice(L.length + N.length);
  return [L, N, S].filter(Boolean).join('·');
}

const SC = { active: '#00FF8A', tracking: '#00FF8A', moving: '#00FF8A', standby: '#FF8C00', inactive: '#FF8C00', parked: '#FF8C00', offline: '#FF3838', denied: '#FF3838', sos: '#FF3838' };
const SL = { active: 'TRACKING', tracking: 'TRACKING', moving: 'TRACKING', standby: 'STANDBY', inactive: 'STANDBY', parked: 'STANDBY', offline: 'OFFLINE', denied: 'OFFLINE', sos: 'OFFLINE' };
const ZONES = ['ALL', 'CBD', 'WESTLANDS', 'EASTLANDS', 'KAREN', 'SOUTH B', 'EMBAKASI'];

export default function UnitRoster({ onSelectVehicle }) {
  const [vehicles, setVehicles] = useState([]);
  const [zone, setZone] = useState('ALL');
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from('vehicles').select('id,plate,plate_number,status,vehicle_status,zone,owner_name,last_seen,lat,lng,latitude,longitude,speed').order('updated_at', { ascending: false }).limit(200);
    if (data) setVehicles(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel('unit-roster').on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, load).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const filtered = zone === 'ALL' ? vehicles : vehicles.filter((v) => (v.zone ?? '').toUpperCase().includes(zone));
  const counts = vehicles.reduce((a, v) => {
    const status = v.status || v.vehicle_status;
    const k = SL[status] ?? 'OFFLINE';
    a[k] = (a[k] ?? 0) + 1;
    return a;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #0B2A1C', width: 185, minWidth: 185, height: '100%', background: '#040D0A' }}>
      <div className="tac-panel-header" style={{ borderRadius: 0 }}>
        <span>UNIT ROSTER</span>
        <span style={{ background: '#0A2218', border: '1px solid #0B2A1C', padding: '1px 7px', borderRadius: 3, fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#00C896' }}>{vehicles.length}</span>
      </div>
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #0B2A1C', display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {ZONES.map((z) => (
          <button
            key={z}
            onClick={() => setZone(z)}
            style={{
              background: 'transparent',
              cursor: 'pointer',
              border: `1px solid ${z === zone ? '#00FF8A' : '#0B2A1C'}`,
              color: z === zone ? '#00FF8A' : '#3A7A5A',
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 8,
              letterSpacing: '0.08em',
              padding: '2px 5px',
              borderRadius: 2,
            }}
          >
            {z}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {loading ? (
          <div style={{ padding: '12px 10px', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#3A7A5A' }}>LOADING UNITS...</div>
        ) : (
          filtered.map((v) => {
            const status = v.status || v.vehicle_status;
            const color = SC[status] ?? '#FF3838';
            return (
              <div
                key={v.id}
                onClick={() => onSelectVehicle?.(v)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px', cursor: 'pointer', borderBottom: '1px solid #040D0A' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#0A2218')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color, letterSpacing: '0.04em' }}>
                  <span style={{ marginRight: 4, fontSize: 8 }}>●</span>
                  {toCallsign(v.plate_number || v.plate)}
                </span>
                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, color, letterSpacing: '0.07em', fontWeight: 600 }}>{SL[status] ?? 'OFFLINE'}</span>
              </div>
            );
          })
        )}
      </div>
      <div style={{ borderTop: '1px solid #0B2A1C', padding: '8px 10px' }}>
        {[
          ['TRACKING', '#00FF8A'],
          ['STANDBY', '#FF8C00'],
          ['OFFLINE', '#FF3838'],
        ].map(([l, c]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: c, padding: '2px 0' }}>
            <span>{l}</span>
            <span style={{ fontWeight: 700 }}>{counts[l] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
