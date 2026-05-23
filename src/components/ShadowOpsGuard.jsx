import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const SUPER_ADMIN_UUID = 'a7a26e70-f360-4c02-9424-a8770374a206';

async function logAttempt(userId, granted) {
  supabase
    .from('access_log')
    .insert({
      user_id: userId,
      path: 'shadow-ops',
      granted,
      attempted_at: new Date().toISOString(),
    })
    .then(() => {})
    .catch(() => {});
}

const S = {
  screen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 400,
    background: '#040D0A',
    fontFamily: "'Share Tech Mono','Courier New',monospace",
  },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: '0.18em', color: '#00FF8A', margin: 0 },
  sub: { fontSize: 11, letterSpacing: '0.1em', color: '#3A7A5A', marginTop: 12 },
  btn: {
    marginTop: 28,
    background: 'transparent',
    border: '1px solid #3A7A5A',
    color: '#00C896',
    fontFamily: "'Share Tech Mono',monospace",
    fontSize: 11,
    letterSpacing: '0.12em',
    padding: '8px 20px',
    cursor: 'pointer',
    borderRadius: 4,
  },
};

export default function ShadowOpsGuard({ children, onBack }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus('denied');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('clearance_level')
        .eq('id', user.id)
        .single();

      const granted = profile?.clearance_level >= 10 || user.id === SUPER_ADMIN_UUID;
      await logAttempt(user.id, granted);
      setStatus(granted ? 'granted' : 'denied');
    })();
  }, []);

  if (status === 'checking') {
    return (
      <div style={S.screen}>
        <p style={S.title}>VERIFYING CLEARANCE</p>
        <p style={S.sub}>STAND BY...</p>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div style={S.screen}>
        <p style={{ ...S.title, color: '#FF3838' }}>ACCESS DENIED</p>
        <p style={S.sub}>CLEARANCE LEVEL INSUFFICIENT — ATTEMPT LOGGED</p>
        {onBack && (
          <button style={S.btn} onClick={onBack}>
            RETURN TO DASHBOARD
          </button>
        )}
      </div>
    );
  }

  return children;
}
