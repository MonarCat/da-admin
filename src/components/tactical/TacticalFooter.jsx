import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

export default function TacticalFooter() {
  const [dbOk, setDbOk] = useState(null);
  const [sync, setSync] = useState('--:--:--');

  useEffect(() => {
    const ping = async () => {
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      setDbOk(!error);
      setSync(new Date().toTimeString().slice(0, 8));
    };
    ping();
    const id = setInterval(ping, 30000);
    return () => clearInterval(id);
  }, []);

  const dot = (ok) => (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: ok === null ? '#3A7A5A' : ok ? '#00FF8A' : '#FF3838',
        marginRight: 5,
        verticalAlign: 'middle',
      }}
    />
  );

  return (
    <div style={{ background: '#020806', borderTop: '1px solid #0B2A1C', padding: '5px 16px', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
      {[
        [`SUPABASE: ${dbOk === null ? 'CHECKING' : dbOk ? 'ONLINE' : 'ERROR'}`, dbOk],
        ['VERCEL: LIVE', true],
        ['MESH: ACTIVE', true],
      ].map(([label, ok]) => (
        <span key={label} style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: '0.09em', color: '#3A7A5A' }}>
          {dot(ok)}
          {label}
        </span>
      ))}
      <span style={{ marginLeft: 'auto', fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: '0.08em', color: '#1A4A32' }}>
        LAST SYNC: {sync}  //  INTERVAL: 30S  //  BUILD: DA-2.4.1  //  MONARCAT
      </span>
    </div>
  );
}
