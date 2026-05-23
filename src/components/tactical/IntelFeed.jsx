export default function IntelFeed({ vehicles = [] }) {
  const offline = vehicles.filter((v) => (v.status || v.vehicle_status) === 'offline');
  const standby = vehicles.filter((v) => ['standby', 'inactive', 'parked'].includes(v.status || v.vehicle_status));
  const tracking = vehicles.filter((v) => ['active', 'tracking', 'moving'].includes(v.status || v.vehicle_status));
  const items = [
    ...offline.map((v) => ({ level: 'red', icon: '⚠', text: `SIGNAL LOST: ${v.plate_number ?? v.plate ?? v.id.slice(0, 8)}` })),
    ...standby.map((v) => ({ level: 'amber', icon: '◑', text: `STANDBY: ${v.plate_number ?? v.plate ?? v.id.slice(0, 8)}` })),
    { level: 'green', icon: '✓', text: `MESH SYNC NOMINAL  //  ${tracking.length} TRACKING` },
  ];
  const C = { red: '#FF3838', amber: '#FF8C00', green: '#00C896' };
  return (
    <div style={{ background: '#020806', border: '1px solid #0B2A1C', borderRadius: 4, padding: '8px 10px' }}>
      <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, letterSpacing: '0.12em', color: '#3A7A5A', marginBottom: 5 }}>INTEL FEED</div>
      {items.slice(0, 6).map((item, i) => (
        <div key={i} style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: C[item.level], padding: '2px 0' }}>
          <span style={{ marginRight: 6 }}>{item.icon}</span>
          {item.text}
        </div>
      ))}
    </div>
  );
}
