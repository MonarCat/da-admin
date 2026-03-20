// da-admin/src/components/ShadowMesh.jsx
// Shadow Mesh — Multi-target pursuit, fleet integration, admin UI

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  wrap: {
    padding: '24px',
    background: 'var(--bg-primary)',
    minHeight: '100vh',
    color: 'var(--text-primary)',
    fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '28px',
  },
  title: {
    fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px',
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  badge: (color) => ({
    fontSize: '11px', fontWeight: 600, padding: '3px 8px',
    borderRadius: '4px', background: color, color: '#fff',
    letterSpacing: '0.5px', textTransform: 'uppercase',
  }),
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  },
  activeCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--danger)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 0 20px var(--danger-glow)',
  },
  row: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '160px' },
  label: { fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' },
  input: {
    padding: '10px 14px', borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '14px', outline: 'none',
    transition: 'border 0.2s',
  },
  select: {
    padding: '10px 14px', borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '14px', outline: 'none', cursor: 'pointer',
  },
  btn: (variant = 'primary') => ({
    padding: '10px 18px', borderRadius: '8px', border: 'none',
    cursor: 'pointer', fontWeight: 600, fontSize: '13px',
    transition: 'all 0.2s',
    background: variant === 'danger' ? 'var(--danger)'
               : variant === 'ghost' ? 'transparent'
               : variant === 'success' ? 'var(--success)'
               : 'var(--accent)',
    color: variant === 'ghost' ? 'var(--text-secondary)' : '#fff',
    border: variant === 'ghost' ? '1px solid var(--border)' : 'none',
  }),
  targetRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px',
    background: 'var(--bg-secondary)',
    borderRadius: '8px', marginBottom: '8px',
    border: '1px solid var(--border)',
  },
  plateBadge: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 700, fontSize: '14px',
    padding: '4px 12px', borderRadius: '6px',
    background: 'var(--danger)', color: '#fff',
    letterSpacing: '2px',
  },
  sessionCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-strong)',
    borderRadius: '12px', padding: '16px 20px',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '13px', fontWeight: 600, letterSpacing: '1px',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px',
  },
  divider: { height: '1px', background: 'var(--border)', margin: '20px 0' },
  pulse: {
    display: 'inline-block', width: '8px', height: '8px',
    borderRadius: '50%', background: 'var(--danger)',
    animation: 'pulse 1.4s ease-in-out infinite',
  },
};

// Blank target template
const blankTarget = () => ({
  id: Date.now() + Math.random(),
  plate: '',
  make: '',
  color: '',
  notes: '',
  selectedFleetVehicle: '',
});

export default function ShadowMesh({ adminUser }) {
  const [sessions, setSessions]   = useState([]);
  const [fleets, setFleets]       = useState([]);
  const [fleetVehicles, setFleetVehicles] = useState({});
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);

  // New session draft
  const [draftName, setDraftName]       = useState('');
  const [draftPriority, setDraftPriority] = useState('standard');
  const [draftTargets, setDraftTargets] = useState([blankTarget()]);
  const [draftFleet, setDraftFleet]     = useState('');

  useEffect(() => {
    loadSessions();
    loadFleets();

    // Realtime subscription on pursuits
    const ch = supabase
      .channel('pursuits_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pursuits' }, loadSessions)
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  async function loadSessions() {
    try {
      const { data } = await supabase
        .from('pursuits')
        .select('*')
        .order('created_at', { ascending: false });
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load pursuits:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadFleets() {
    const { data: myFleets } = await supabase
      .from('fleets')
      .select('id, name')
      .eq('is_active', true);
    setFleets(myFleets || []);
  }

  async function loadFleetVehicles(fleetId) {
    if (!fleetId || fleetVehicles[fleetId]) return;
    const { data } = await supabase
      .from('fleet_memberships')
      .select(`
        vehicle_registration_id,
        vehicle_registrations(id, plate_number, make, model, color)
      `)
      .eq('fleet_id', fleetId);
    setFleetVehicles(prev => ({
      ...prev,
      [fleetId]: (data || []).map(d => d.vehicle_registrations),
    }));
  }

  function addTarget() {
    setDraftTargets(prev => [...prev, blankTarget()]);
  }

  function removeTarget(id) {
    setDraftTargets(prev => prev.filter(t => t.id !== id));
  }

  function updateTarget(id, field, value) {
    setDraftTargets(prev =>
      prev.map(t => t.id === id ? { ...t, [field]: value } : t)
    );
  }

  function applyFleetVehicle(targetId, regId) {
    const fleet = fleetVehicles[draftFleet] || [];
    const reg = fleet.find(v => v?.id === regId);
    if (!reg) return;
    updateTarget(targetId, 'plate', reg.plate_number || '');
    updateTarget(targetId, 'make', `${reg.make || ''} ${reg.model || ''}`.trim());
    updateTarget(targetId, 'color', reg.color || '');
    updateTarget(targetId, 'selectedFleetVehicle', regId);
  }

  async function createSession() {
    const validTargets = draftTargets.filter(t => t.plate.trim());
    if (!validTargets.length) return alert('Add at least one vehicle plate.');

    setCreating(true);
    const groupSessionId = crypto.randomUUID();

    try {
      const rows = validTargets.map(t => ({
        target_plate:         t.plate.trim().toUpperCase(),
        target_make:          t.make.trim(),
        target_color:         t.color.trim(),
        notes:                t.notes.trim(),
        status:               'active',
        initiated_by:         adminUser?.id,
        group_session_id:     groupSessionId,
        initiated_from_fleet_id: draftFleet || null,
        priority:             draftPriority,
        session_name:         draftName.trim() || `Pursuit ${new Date().toLocaleTimeString()}`,
      }));

      const { error } = await supabase.from('pursuits').insert(rows);
      if (error) throw error;

      // Reset draft
      setDraftName('');
      setDraftPriority('standard');
      setDraftTargets([blankTarget()]);
      setDraftFleet('');
      await loadSessions();
    } catch (err) {
      alert('Failed to initiate pursuit: ' + err.message);
    } finally {
      setCreating(false);
    }
  }

  async function terminatePursuit(id) {
    await supabase.from('pursuits').update({ status: 'terminated' }).eq('id', id);
    await loadSessions();
  }

  async function terminateSession(groupSessionId) {
    await supabase
      .from('pursuits')
      .update({ status: 'terminated' })
      .eq('group_session_id', groupSessionId);
    await loadSessions();
  }

  // Group active sessions by group_session_id
  const activeSessions = sessions.filter(s => s.status === 'active');
  const groupedActive  = activeSessions.reduce((acc, s) => {
    const key = s.group_session_id || s.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});
  const pastSessions = sessions.filter(s => s.status !== 'active').slice(0, 20);

  return (
    <div style={S.wrap}>
      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.4; transform:scale(1.4); }
        }
        select option { background: var(--bg-secondary); color: var(--text-primary); }
      `}</style>

      <div style={S.header}>
        <div style={S.title}>
          <span>🕸️</span> Shadow Mesh
          {activeSessions.length > 0 && (
            <span style={S.badge('var(--danger)')}>
              {activeSessions.length} LIVE
            </span>
          )}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Multi-vehicle pursuit operations
        </div>
      </div>

      {/* ── NEW PURSUIT FORM ── */}
      <div style={S.card}>
        <div style={S.sectionTitle}>
          <span>⚡</span> Initiate Pursuit Operation
        </div>

        <div style={{ ...S.row, marginBottom: '16px' }}>
          <div style={S.field}>
            <span style={S.label}>Operation Name</span>
            <input
              style={S.input}
              placeholder="e.g. Operation Nightfall"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
            />
          </div>
          <div style={S.field}>
            <span style={S.label}>Priority</span>
            <select style={S.select} value={draftPriority} onChange={e => setDraftPriority(e.target.value)}>
              <option value="standard">🔵 Standard</option>
              <option value="high">🟡 High</option>
              <option value="critical">🔴 Critical</option>
            </select>
          </div>
          <div style={S.field}>
            <span style={S.label}>Initiate from Fleet</span>
            <select
              style={S.select}
              value={draftFleet}
              onChange={e => {
                setDraftFleet(e.target.value);
                if (e.target.value) loadFleetVehicles(e.target.value);
              }}
            >
              <option value="">— Manual entry —</option>
              {fleets.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Target rows */}
        <div style={S.sectionTitle}>
          <span>🎯</span> Target Vehicles
        </div>
        {draftTargets.map((t, idx) => (
          <div key={t.id} style={S.targetRow}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', minWidth: '20px' }}>
              #{idx + 1}
            </span>

            {draftFleet && (fleetVehicles[draftFleet] || []).length > 0 && (
              <div style={S.field}>
                <span style={S.label}>Fleet Vehicle</span>
                <select
                  style={{ ...S.select, minWidth: '160px' }}
                  value={t.selectedFleetVehicle}
                  onChange={e => applyFleetVehicle(t.id, e.target.value)}
                >
                  <option value="">— Pick from fleet —</option>
                  {(fleetVehicles[draftFleet] || []).map(v => v && (
                    <option key={v.id} value={v.id}>
                      {v.plate_number} · {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={S.field}>
              <span style={S.label}>Plate *</span>
              <input
                style={{ ...S.input, fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 700 }}
                placeholder="KXX 000X"
                value={t.plate}
                onChange={e => updateTarget(t.id, 'plate', e.target.value.toUpperCase())}
              />
            </div>
            <div style={S.field}>
              <span style={S.label}>Make / Model</span>
              <input style={S.input} placeholder="Toyota Harrier" value={t.make}
                onChange={e => updateTarget(t.id, 'make', e.target.value)} />
            </div>
            <div style={S.field}>
              <span style={S.label}>Color</span>
              <input style={S.input} placeholder="Silver" value={t.color}
                onChange={e => updateTarget(t.id, 'color', e.target.value)} />
            </div>
            <div style={{ ...S.field, flex: 2 }}>
              <span style={S.label}>Notes</span>
              <input style={S.input} placeholder="Last seen heading north on Thika Rd" value={t.notes}
                onChange={e => updateTarget(t.id, 'notes', e.target.value)} />
            </div>
            {draftTargets.length > 1 && (
              <button style={{ ...S.btn('ghost'), padding: '10px', color: 'var(--danger)' }}
                onClick={() => removeTarget(t.id)}>✕</button>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button style={S.btn('ghost')} onClick={addTarget}>
            + Add Another Vehicle
          </button>
          <button
            style={{ ...S.btn('danger'), marginLeft: 'auto' }}
            onClick={createSession}
            disabled={creating}
          >
            {creating ? 'Initiating...' : '🚨 Launch Pursuit'}
          </button>
        </div>
      </div>

      {/* ── ACTIVE PURSUIT SESSIONS ── */}
      {Object.keys(groupedActive).length > 0 && (
        <>
          <div style={S.divider} />
          <div style={S.sectionTitle}>
            <span style={S.pulse} /> Active Operations ({Object.keys(groupedActive).length})
          </div>

          {Object.entries(groupedActive).map(([sessionId, targets]) => (
            <div key={sessionId} style={S.activeCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>
                    {targets[0].session_name || 'Unnamed Operation'}
                  </span>
                  <span style={{
                    marginLeft: '10px', fontSize: '11px',
                    color: targets[0].priority === 'critical' ? 'var(--danger)'
                         : targets[0].priority === 'high' ? 'var(--warning)'
                         : 'var(--accent)',
                    fontWeight: 600, textTransform: 'uppercase',
                  }}>
                    {targets[0].priority}
                  </span>
                </div>
                <button
                  style={{ ...S.btn('danger'), fontSize: '12px', padding: '6px 14px' }}
                  onClick={() => terminateSession(sessionId)}
                >
                  Terminate All
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {targets.map(t => (
                  <div key={t.id} style={{
                    background: 'var(--bg-secondary)', borderRadius: '10px',
                    padding: '12px 16px', border: '1px solid var(--border-strong)',
                    minWidth: '200px', flex: 1,
                  }}>
                    <div style={S.plateBadge}>{t.target_plate}</div>
                    <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {t.target_make && <div>{t.target_make}</div>}
                      {t.target_color && <div style={{ color: 'var(--text-muted)' }}>{t.target_color}</div>}
                      {t.notes && <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{t.notes}</div>}
                    </div>
                    <button
                      style={{ ...S.btn('ghost'), marginTop: '10px', fontSize: '12px', padding: '5px 10px', color: 'var(--danger)', width: '100%' }}
                      onClick={() => terminatePursuit(t.id)}
                    >
                      Remove Target
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── PAST SESSIONS ── */}
      {pastSessions.length > 0 && (
        <>
          <div style={S.divider} />
          <div style={S.sectionTitle}>📋 Recent History</div>
          {Object.entries(
            pastSessions.reduce((acc, s) => {
              const k = s.group_session_id || s.id;
              if (!acc[k]) acc[k] = [];
              acc[k].push(s);
              return acc;
            }, {})
          ).map(([key, targets]) => (
            <div key={key} style={S.sessionCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>
                    {targets[0].session_name || 'Unnamed'}
                  </span>
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {targets.map(t => t.target_plate).join(', ')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ ...S.badge('var(--text-muted)'), fontSize: '10px' }}>
                    {targets[0].status?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(targets[0].created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
          Loading pursuit data...
        </div>
      )}
    </div>
  );
}
