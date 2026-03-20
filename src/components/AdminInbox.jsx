// da-admin/src/components/AdminInbox.jsx
// Real-time inbox — vehicle verification, fleet requests, all notifications

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  wrap: { padding: '24px', background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' },
  title: { fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-card)', padding: '4px', borderRadius: '10px', width: 'fit-content' },
  tab: (active) => ({
    padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
    fontWeight: 600, fontSize: '13px', border: 'none', transition: 'all 0.2s',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
  }),
  card: (unread) => ({
    background: unread ? 'var(--accent-glow)' : 'var(--bg-card)',
    border: `1px solid ${unread ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '12px', padding: '18px', marginBottom: '12px',
    transition: 'all 0.2s',
  }),
  regCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-strong)',
    borderRadius: '12px', padding: '20px', marginBottom: '12px',
  },
  row: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' },
  value: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' },
  plateBadge: {
    fontFamily: 'monospace', fontWeight: 700, fontSize: '16px',
    padding: '6px 16px', borderRadius: '8px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)',
    letterSpacing: '2px', display: 'inline-block',
  },
  btn: (variant = 'primary', size = 'md') => ({
    padding: size === 'sm' ? '6px 14px' : '10px 20px',
    borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600,
    fontSize: size === 'sm' ? '12px' : '13px', transition: 'all 0.2s',
    background: variant === 'danger' ? 'var(--danger)'
               : variant === 'ghost' ? 'transparent'
               : variant === 'success' ? 'var(--success)'
               : 'var(--accent)',
    color: variant === 'ghost' ? 'var(--text-secondary)' : '#fff',
    border: variant === 'ghost' ? '1px solid var(--border)' : 'none',
  }),
  textarea: {
    padding: '10px 14px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
    resize: 'vertical', minHeight: '72px', width: '100%',
  },
  statusBadge: (status) => ({
    fontSize: '11px', fontWeight: 700, padding: '3px 10px',
    borderRadius: '5px', textTransform: 'uppercase',
    background: status === 'verified' ? 'rgba(16,185,129,0.15)'
               : status === 'rejected' ? 'rgba(239,68,68,0.15)'
               : 'rgba(245,158,11,0.15)',
    color: status === 'verified' ? 'var(--success)'
          : status === 'rejected' ? 'var(--danger)'
          : 'var(--warning)',
  }),
  liveChip: {
    fontSize: '11px', fontWeight: 700, padding: '2px 8px',
    borderRadius: '4px', background: 'var(--success)', color: '#fff',
    animation: 'blink 2s ease-in-out infinite',
  },
  divider: { height: '1px', background: 'var(--border)', margin: '16px 0' },
};

export default function AdminInbox({ adminUser }) {
  const [tab, setTab]                     = useState('verify');
  const [pendingRegs, setPendingRegs]     = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [feedbacks, setFeedbacks]         = useState({});   // regId -> feedback text
  const [processing, setProcessing]       = useState({});

  useEffect(() => {
    loadPendingRegistrations();
    loadNotifications();

    // Realtime: new registrations / updates
    const ch = supabase.channel('admin_inbox_realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'vehicle_registrations',
      }, payload => {
        if (payload.new.is_verified === false || payload.new.is_verified === null) {
          setPendingRegs(prev => [payload.new, ...prev]);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'vehicle_registrations',
      }, () => loadPendingRegistrations())
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${adminUser?.id}`,
      }, payload => setNotifications(prev => [payload.new, ...prev]))
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [adminUser?.id]);

  async function loadPendingRegistrations() {
    const { data } = await supabase
      .from('vehicle_registrations')
      .select('*')
      .or('is_verified.is.null,is_verified.eq.false')
      .order('created_at', { ascending: false });
    setPendingRegs(data || []);
    setLoading(false);
  }

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', adminUser?.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data || []);
  }

  async function verifyRegistration(reg, approved) {
    const feedback = feedbacks[reg.id] || (approved ? 'Vehicle registration verified successfully.' : '');
    if (!approved && !feedback.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    setProcessing(prev => ({ ...prev, [reg.id]: true }));

    try {
      const { error } = await supabase.from('vehicle_registrations').update({
        is_verified: approved,
        verified_feedback: feedback.trim(),
        verified_by: adminUser?.id,
        verified_at: new Date().toISOString(),
        status: approved ? 'verified' : 'rejected',
      }).eq('id', reg.id);

      if (error) throw error;

      // Notify the vehicle owner
      await supabase.from('notifications').insert({
        user_id: reg.user_id,
        type: approved ? 'verification_approved' : 'verification_rejected',
        title: approved ? '✅ Vehicle Verified' : '❌ Verification Failed',
        message: feedback.trim() || (approved
          ? `Your vehicle ${reg.plate_number} has been verified.`
          : `Your vehicle ${reg.plate_number} verification was not approved.`),
        data: {
          vehicle_id: reg.id,
          plate_number: reg.plate_number,
          approved,
          feedback: feedback.trim(),
        },
      });

      setPendingRegs(prev => prev.filter(r => r.id !== reg.id));
      setFeedbacks(prev => { const n = { ...prev }; delete n[reg.id]; return n; });
    } catch (err) {
      alert('Action failed: ' + err.message);
    } finally {
      setProcessing(prev => ({ ...prev, [reg.id]: false }));
    }
  }

  async function markRead(notifId) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (!ids.length) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', ids);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={S.wrap}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      <div style={S.header}>
        <div style={S.title}>
          <span>📬</span> Admin Inbox
          {unreadCount > 0 && (
            <span style={{ fontSize: '13px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px', background: 'var(--danger)', color: '#fff' }}>
              {unreadCount}
            </span>
          )}
          <span style={S.liveChip}>LIVE</span>
        </div>
        {unreadCount > 0 && (
          <button style={S.btn('ghost', 'sm')} onClick={markAllRead}>Mark all read</button>
        )}
      </div>

      <div style={S.tabs}>
        <button style={S.tab(tab === 'verify')} onClick={() => setTab('verify')}>
          Verify Vehicles {pendingRegs.length > 0 && `(${pendingRegs.length})`}
        </button>
        <button style={S.tab(tab === 'notifications')} onClick={() => setTab('notifications')}>
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {/* ── VERIFICATION TAB ── */}
      {tab === 'verify' && (
        <div>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '48px' }}>
              Loading pending registrations...
            </div>
          ) : pendingRegs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
              All vehicle registrations are verified. Great job!
            </div>
          ) : (
            <>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {pendingRegs.length} pending registration{pendingRegs.length !== 1 ? 's' : ''} await review
              </div>
              {pendingRegs.map(reg => (
                <div key={reg.id} style={S.regCard}>
                  {/* Vehicle summary */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <span style={S.plateBadge}>{reg.plate_number}</span>
                      {reg.status && (
                        <span style={{ ...S.statusBadge(reg.status), marginLeft: '10px', display: 'inline-block' }}>
                          {reg.status}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                      Submitted {new Date(reg.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {[
                      ['Make', reg.make],
                      ['Model', reg.model],
                      ['Year', reg.year],
                      ['Color', reg.color],
                      ['Owner', reg.owner_name],
                      ['Phone', reg.owner_phone],
                      ['ID/KRA', reg.owner_id_number],
                    ].filter(([, v]) => v).map(([label, val]) => (
                      <div key={label} style={S.field}>
                        <span style={S.label}>{label}</span>
                        <span style={S.value}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Document links */}
                  {(reg.logbook_url || reg.insurance_url) && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                      {reg.logbook_url && (
                        <a href={reg.logbook_url} target="_blank" rel="noreferrer"
                          style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'underline' }}>
                          📄 View Logbook
                        </a>
                      )}
                      {reg.insurance_url && (
                        <a href={reg.insurance_url} target="_blank" rel="noreferrer"
                          style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'underline' }}>
                          🛡️ View Insurance
                        </a>
                      )}
                    </div>
                  )}

                  <div style={S.divider} />

                  {/* Feedback and actions */}
                  <div style={{ marginBottom: '12px' }}>
                    <span style={S.label}>Feedback / Notes to Owner</span>
                    <textarea
                      style={{ ...S.textarea, marginTop: '6px' }}
                      placeholder="e.g. Verified successfully · OR · Logbook details don't match. Please resubmit with correct documents."
                      value={feedbacks[reg.id] || ''}
                      onChange={e => setFeedbacks(prev => ({ ...prev, [reg.id]: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      style={S.btn('success')}
                      disabled={processing[reg.id]}
                      onClick={() => verifyRegistration(reg, true)}
                    >
                      {processing[reg.id] ? 'Processing...' : '✓ Verify & Approve'}
                    </button>
                    <button
                      style={S.btn('danger')}
                      disabled={processing[reg.id]}
                      onClick={() => verifyRegistration(reg, false)}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {tab === 'notifications' && (
        <div>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔕</div>
              No notifications yet.
            </div>
          ) : notifications.map(n => (
            <div
              key={n.id}
              style={S.card(!n.is_read)}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: n.is_read ? 500 : 700, marginBottom: '4px' }}>
                  {n.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '12px' }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{n.message}</div>
              {!n.is_read && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--accent)', cursor: 'pointer' }}>
                  Click to mark as read
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
