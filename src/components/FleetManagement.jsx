// da-admin/src/components/FleetManagement.jsx
// Full fleet CRUD — create, manage vehicles, handle join/exit requests

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  wrap: { padding: '24px', background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' },
  title: { fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
  fleetCard: (selected) => ({
    background: selected ? 'var(--accent-glow)' : 'var(--bg-card)',
    border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '12px', padding: '18px', marginBottom: '10px',
    cursor: 'pointer', transition: 'all 0.2s',
  }),
  row: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  label: { fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' },
  input: {
    padding: '10px 14px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
    color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
  },
  btn: (variant = 'primary', size = 'md') => ({
    padding: size === 'sm' ? '6px 12px' : '10px 18px',
    borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600,
    fontSize: size === 'sm' ? '12px' : '13px', transition: 'all 0.2s',
    background: variant === 'danger' ? 'var(--danger)'
               : variant === 'ghost' ? 'transparent'
               : variant === 'success' ? 'var(--success)'
               : variant === 'warning' ? 'var(--warning)'
               : 'var(--accent)',
    color: variant === 'ghost' ? 'var(--text-secondary)' : '#fff',
    border: variant === 'ghost' ? '1px solid var(--border)' : 'none',
  }),
  sectionTitle: {
    fontSize: '12px', fontWeight: 600, letterSpacing: '1px',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    marginBottom: '14px',
  },
  vrow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', background: 'var(--bg-secondary)',
    borderRadius: '8px', marginBottom: '6px',
    border: '1px solid var(--border)',
  },
  plateBadge: {
    fontFamily: 'monospace', fontWeight: 700, fontSize: '13px',
    padding: '3px 10px', borderRadius: '5px',
    background: 'var(--accent-glow)', border: '1px solid var(--accent)',
    color: 'var(--accent)', letterSpacing: '1.5px',
  },
  requestRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', background: 'var(--bg-secondary)',
    borderRadius: '8px', marginBottom: '6px',
    border: '1px solid var(--border-strong)',
  },
  statusBadge: (status) => ({
    fontSize: '10px', fontWeight: 600, padding: '2px 8px',
    borderRadius: '4px', textTransform: 'uppercase',
    background: status === 'accepted' ? 'rgba(16,185,129,0.15)'
               : status === 'denied' ? 'rgba(239,68,68,0.15)'
               : 'rgba(245,158,11,0.15)',
    color: status === 'accepted' ? 'var(--success)'
          : status === 'denied' ? 'var(--danger)'
          : 'var(--warning)',
  }),
  tabs: { display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-card)', padding: '4px', borderRadius: '10px', width: 'fit-content' },
  tab: (active) => ({
    padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
    fontWeight: 600, fontSize: '13px', border: 'none', transition: 'all 0.2s',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
  }),
  divider: { height: '1px', background: 'var(--border)', margin: '20px 0' },
  layout: { display: 'flex', gap: '20px' },
  sidebar: { width: '280px', flexShrink: 0 },
  main: { flex: 1 },
};

export default function FleetManagement({ adminUser }) {
  const [fleets, setFleets]           = useState([]);
  const [selectedFleet, setSelected]  = useState(null);
  const [members, setMembers]         = useState([]);
  const [joinReqs, setJoinReqs]       = useState([]);
  const [exitReqs, setExitReqs]       = useState([]);
  const [tab, setTab]                 = useState('members');
  const [loading, setLoading]         = useState(false);

  // Create fleet form
  const [showCreate, setShowCreate]   = useState(false);
  const [newName, setNewName]         = useState('');
  const [newDesc, setNewDesc]         = useState('');
  const [creating, setCreating]       = useState(false);

  useEffect(() => { loadFleets(); }, []);

  useEffect(() => {
    if (!selectedFleet) return;
    loadMembers(selectedFleet.id);
    loadRequests(selectedFleet.id);

    // Realtime
    const ch = supabase.channel(`fleet_${selectedFleet.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_join_requests',
          filter: `fleet_id=eq.${selectedFleet.id}` }, () => loadRequests(selectedFleet.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_exit_requests',
          filter: `fleet_id=eq.${selectedFleet.id}` }, () => loadRequests(selectedFleet.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_memberships',
          filter: `fleet_id=eq.${selectedFleet.id}` }, () => loadMembers(selectedFleet.id))
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [selectedFleet]);

  async function loadFleets() {
    const { data } = await supabase
      .from('fleets')
      .select('*, fleet_memberships(count)')
      .eq('admin_id', adminUser?.id)
      .order('created_at', { ascending: false });
    setFleets(data || []);
    if (data?.length && !selectedFleet) setSelected(data[0]);
  }

  async function loadMembers(fleetId) {
    const { data } = await supabase
      .from('fleet_memberships')
      .select(`
        id, joined_at, user_id,
        vehicle_registrations(id, plate_number, make, model, color, owner_name, owner_phone)
      `)
      .eq('fleet_id', fleetId)
      .order('joined_at', { ascending: false });
    setMembers(data || []);
  }

  async function loadRequests(fleetId) {
    const [joinRes, exitRes] = await Promise.all([
      supabase.from('fleet_join_requests')
        .select(`id, status, requested_at, vehicle_registrations(plate_number, make, model, owner_name)`)
        .eq('fleet_id', fleetId)
        .order('requested_at', { ascending: false }),
      supabase.from('fleet_exit_requests')
        .select(`id, status, requested_at, vehicle_registrations(plate_number, make, model, owner_name)`)
        .eq('fleet_id', fleetId)
        .order('requested_at', { ascending: false }),
    ]);
    setJoinReqs(joinRes.data || []);
    setExitReqs(exitRes.data || []);
  }

  async function createFleet() {
    if (!newName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from('fleets').insert({
      name: newName.trim(),
      description: newDesc.trim(),
      admin_id: adminUser?.id,
    }).select().single();
    if (!error) {
      setFleets(prev => [data, ...prev]);
      setSelected(data);
      setNewName(''); setNewDesc(''); setShowCreate(false);
    } else {
      alert('Failed: ' + error.message);
    }
    setCreating(false);
  }

  async function deleteFleet(fleetId) {
    if (!confirm('Delete this fleet? All memberships will be removed.')) return;
    await supabase.from('fleets').update({ is_active: false }).eq('id', fleetId);
    setFleets(prev => prev.filter(f => f.id !== fleetId));
    setSelected(null);
  }

  async function respondJoinRequest(reqId, status, vehicleRegId, userId) {
    setLoading(true);
    await supabase.from('fleet_join_requests')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', reqId);

    if (status === 'accepted') {
      // Remove existing membership if any (enforce one-fleet rule)
      await supabase.from('fleet_memberships').delete().eq('vehicle_registration_id', vehicleRegId);
      await supabase.from('fleet_memberships').insert({
        fleet_id: selectedFleet.id,
        vehicle_registration_id: vehicleRegId,
        user_id: userId,
      });
      // Notify owner
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'fleet_join_accepted',
        title: 'Fleet Request Accepted ✓',
        message: `Your request to join ${selectedFleet.name} has been accepted.`,
        data: { fleet_id: selectedFleet.id, fleet_name: selectedFleet.name },
      });
    } else {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'fleet_join_denied',
        title: 'Fleet Request Declined',
        message: `Your request to join ${selectedFleet.name} was not approved.`,
        data: { fleet_id: selectedFleet.id, fleet_name: selectedFleet.name },
      });
    }

    await loadRequests(selectedFleet.id);
    await loadMembers(selectedFleet.id);
    setLoading(false);
  }

  async function respondExitRequest(reqId, status, vehicleRegId, userId) {
    setLoading(true);
    await supabase.from('fleet_exit_requests')
      .update({ status: status === 'accepted' ? 'approved' : 'denied', responded_at: new Date().toISOString() })
      .eq('id', reqId);

    if (status === 'accepted') {
      await supabase.from('fleet_memberships').delete()
        .eq('fleet_id', selectedFleet.id)
        .eq('vehicle_registration_id', vehicleRegId);
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'fleet_exit_approved',
        title: 'Exit Request Approved',
        message: `You have been removed from ${selectedFleet.name}.`,
        data: { fleet_id: selectedFleet.id },
      });
    }

    await loadRequests(selectedFleet.id);
    await loadMembers(selectedFleet.id);
    setLoading(false);
  }

  async function removeVehicle(membershipId, vehicleRegId, userId) {
    if (!confirm('Remove this vehicle from the fleet?')) return;
    await supabase.from('fleet_memberships').delete().eq('id', membershipId);
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'fleet_exit_approved',
      title: 'Removed from Fleet',
      message: `An admin has removed your vehicle from ${selectedFleet.name}.`,
      data: { fleet_id: selectedFleet.id },
    });
    await loadMembers(selectedFleet.id);
  }

  const pendingJoinCount = joinReqs.filter(r => r.status === 'pending').length;
  const pendingExitCount = exitReqs.filter(r => r.status === 'pending').length;

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={S.title}>🚗 Fleet Management</div>
        <button style={S.btn()} onClick={() => setShowCreate(v => !v)}>
          {showCreate ? '✕ Cancel' : '+ New Fleet'}
        </button>
      </div>

      {/* Create Fleet */}
      {showCreate && (
        <div style={S.card}>
          <div style={S.sectionTitle}>Create Fleet</div>
          <div style={S.row}>
            <div style={S.field}>
              <span style={S.label}>Fleet Name *</span>
              <input style={S.input} placeholder="e.g. Alpha Response Unit" value={newName}
                onChange={e => setNewName(e.target.value)} />
            </div>
            <div style={{ ...S.field, flex: 2 }}>
              <span style={S.label}>Description</span>
              <input style={S.input} placeholder="Optional description..." value={newDesc}
                onChange={e => setNewDesc(e.target.value)} />
            </div>
            <button style={S.btn('success')} onClick={createFleet} disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {fleets.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚘</div>
          <div>No fleets yet. Create your first fleet to get started.</div>
        </div>
      ) : (
        <div style={S.layout}>
          {/* Sidebar: fleet list */}
          <div style={S.sidebar}>
            <div style={S.sectionTitle}>Your Fleets ({fleets.length})</div>
            {fleets.map(fleet => (
              <div key={fleet.id} style={S.fleetCard(selectedFleet?.id === fleet.id)}
                onClick={() => setSelected(fleet)}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>{fleet.name}</div>
                {fleet.description && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {fleet.description}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {new Date(fleet.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {/* Main: fleet detail */}
          {selectedFleet && (
            <div style={S.main}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{selectedFleet.name}</h2>
                  {selectedFleet.description && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {selectedFleet.description}
                    </div>
                  )}
                </div>
                <button style={S.btn('danger', 'sm')} onClick={() => deleteFleet(selectedFleet.id)}>
                  Delete Fleet
                </button>
              </div>

              {/* Tabs */}
              <div style={S.tabs}>
                <button style={S.tab(tab === 'members')} onClick={() => setTab('members')}>
                  Members ({members.length})
                </button>
                <button style={S.tab(tab === 'join')} onClick={() => setTab('join')}>
                  Join Requests {pendingJoinCount > 0 && `(${pendingJoinCount})`}
                </button>
                <button style={S.tab(tab === 'exit')} onClick={() => setTab('exit')}>
                  Exit Requests {pendingExitCount > 0 && `(${pendingExitCount})`}
                </button>
              </div>

              {/* Members */}
              {tab === 'members' && (
                <div>
                  {members.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>
                      No vehicles in this fleet yet.
                    </div>
                  ) : members.map(m => {
                    const v = m.vehicle_registrations;
                    return (
                      <div key={m.id} style={S.vrow}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <span style={S.plateBadge}>{v?.plate_number}</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{v?.make} {v?.model}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {v?.owner_name} · Joined {new Date(m.joined_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <button style={S.btn('danger', 'sm')}
                          onClick={() => removeVehicle(m.id, v?.id, m.user_id)}>
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Join requests */}
              {tab === 'join' && (
                <div>
                  {joinReqs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>
                      No join requests.
                    </div>
                  ) : joinReqs.map(r => {
                    const v = r.vehicle_registrations;
                    return (
                      <div key={r.id} style={S.requestRow}>
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v?.plate_number}</span>
                          <span style={{ marginLeft: '10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {v?.make} · {v?.owner_name}
                          </span>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(r.requested_at).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={S.statusBadge(r.status)}>{r.status}</span>
                          {r.status === 'pending' && (
                            <>
                              <button style={S.btn('success', 'sm')} disabled={loading}
                                onClick={() => respondJoinRequest(r.id, 'accepted', r.vehicle_registration_id, r.user_id)}>
                                Accept
                              </button>
                              <button style={S.btn('danger', 'sm')} disabled={loading}
                                onClick={() => respondJoinRequest(r.id, 'denied', r.vehicle_registration_id, r.user_id)}>
                                Deny
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Exit requests */}
              {tab === 'exit' && (
                <div>
                  {exitReqs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>
                      No exit requests.
                    </div>
                  ) : exitReqs.map(r => {
                    const v = r.vehicle_registrations;
                    return (
                      <div key={r.id} style={S.requestRow}>
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v?.plate_number}</span>
                          <span style={{ marginLeft: '10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {v?.owner_name} requesting exit
                          </span>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(r.requested_at).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={S.statusBadge(r.status)}>{r.status}</span>
                          {r.status === 'pending' && (
                            <>
                              <button style={S.btn('success', 'sm')} disabled={loading}
                                onClick={() => respondExitRequest(r.id, 'accepted', r.vehicle_registration_id, r.user_id)}>
                                Approve Exit
                              </button>
                              <button style={S.btn('danger', 'sm')} disabled={loading}
                                onClick={() => respondExitRequest(r.id, 'denied', r.vehicle_registration_id, r.user_id)}>
                                Deny
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
