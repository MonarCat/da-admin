// da-admin/src/components/AdminManagement.jsx
// Manage admin users — invite, list, toggle, role assignment

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  wrap: { padding: '24px', background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' },
  title: { fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
  row: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  label: { fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' },
  input: {
    padding: '10px 14px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
    color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
  },
  select: {
    padding: '10px 14px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
    color: 'var(--text-primary)', fontSize: '14px', outline: 'none', cursor: 'pointer',
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
  adminRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px', background: 'var(--bg-secondary)',
    borderRadius: '10px', marginBottom: '8px',
    border: '1px solid var(--border)',
  },
  avatar: {
    width: '36px', height: '36px', borderRadius: '50%',
    background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '14px', color: '#fff',
  },
  roleBadge: (role) => ({
    fontSize: '11px', fontWeight: 700, padding: '3px 10px',
    borderRadius: '5px', textTransform: 'uppercase', letterSpacing: '0.5px',
    background: role === 'super_admin' ? 'rgba(139,92,246,0.15)'
               : role === 'operator' ? 'rgba(6,182,212,0.15)'
               : 'rgba(59,130,246,0.15)',
    color: role === 'super_admin' ? 'var(--purple)'
          : role === 'operator' ? 'var(--cyan)'
          : 'var(--accent)',
  }),
  activeDot: (active) => ({
    display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
    background: active ? 'var(--success)' : 'var(--text-muted)',
  }),
  sectionTitle: {
    fontSize: '12px', fontWeight: 600, letterSpacing: '1px',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    marginBottom: '14px',
  },
};

export default function AdminManagement({ adminUser }) {
  const [admins, setAdmins]       = useState([]);
  const [myRole, setMyRole]       = useState(null);
  const [loading, setLoading]     = useState(true);

  const [inviteEmail, setInviteEmail]     = useState('');
  const [inviteName, setInviteName]       = useState('');
  const [inviteRole, setInviteRole]       = useState('admin');
  const [inviting, setInviting]           = useState(false);

  useEffect(() => { loadAdmins(); }, []);

  async function loadAdmins() {
    const { data } = await supabase
      .from('admin_roles')
      .select('*')
      .order('created_at', { ascending: false });

    const me = (data || []).find(a => a.user_id === adminUser?.id);
    setMyRole(me?.role);
    setAdmins(data || []);
    setLoading(false);
  }

  const isSuperAdmin = myRole === 'super_admin';

  async function inviteAdmin() {
    if (!inviteEmail.trim()) return;
    setInviting(true);

    try {
      // Invite the user via Supabase Auth (they'll get an email link)
      const { data: userData, error: authErr } = await supabase.auth.admin.inviteUserByEmail(inviteEmail.trim());
      
      // Even if invite fails (user may exist), upsert their admin role
      // In practice, if using service_role this works; otherwise admins set role after user registers
      const { error } = await supabase.from('admin_roles').upsert({
        email: inviteEmail.trim().toLowerCase(),
        full_name: inviteName.trim(),
        role: inviteRole,
        created_by: adminUser?.id,
        is_active: true,
        // user_id will be set when they sign in — you may need a trigger for this
      }, { onConflict: 'email' });

      if (error) throw error;

      // Notify via notifications if user exists
      await supabase.from('notifications').insert({
        user_id: userData?.user?.id || adminUser?.id, // fallback to self
        type: 'admin_invited',
        title: 'Admin Access Granted',
        message: `${inviteEmail} has been invited as ${inviteRole} to D.A admin panel.`,
        data: { role: inviteRole, email: inviteEmail },
      }).maybeSingle();

      setInviteEmail(''); setInviteName('');
      await loadAdmins();
    } catch (err) {
      alert('Failed to invite: ' + err.message);
    } finally {
      setInviting(false);
    }
  }

  async function toggleAdmin(adminId, currentStatus) {
    await supabase.from('admin_roles')
      .update({ is_active: !currentStatus })
      .eq('id', adminId);
    await loadAdmins();
  }

  async function removeAdmin(adminId, userId) {
    if (!confirm('Revoke admin access for this user?')) return;
    if (userId === adminUser?.id) return alert("You can't remove yourself.");
    await supabase.from('admin_roles').delete().eq('id', adminId);
    await loadAdmins();
  }

  async function updateRole(adminId, newRole) {
    await supabase.from('admin_roles').update({ role: newRole }).eq('id', adminId);
    await loadAdmins();
  }

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={S.title}>
          <span>👥</span> Admin Management
          {myRole && <span style={S.roleBadge(myRole)}>{myRole.replace('_', ' ')}</span>}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {admins.filter(a => a.is_active).length} active admins
        </div>
      </div>

      {/* Invite form — super_admin only */}
      {isSuperAdmin && (
        <div style={S.card}>
          <div style={S.sectionTitle}>Invite Admin</div>
          <div style={S.row}>
            <div style={S.field}>
              <span style={S.label}>Email *</span>
              <input style={S.input} type="email" placeholder="admin@example.com"
                value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div style={S.field}>
              <span style={S.label}>Full Name</span>
              <input style={S.input} placeholder="John Kamau"
                value={inviteName} onChange={e => setInviteName(e.target.value)} />
            </div>
            <div style={S.field}>
              <span style={S.label}>Role</span>
              <select style={S.select} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <button style={S.btn('success')} onClick={inviteAdmin} disabled={inviting}>
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
            ℹ️ An invitation email will be sent. Their role is activated upon sign-in.
          </div>
        </div>
      )}

      {/* Admin list */}
      <div style={S.sectionTitle}>All Admins</div>
      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: '32px', textAlign: 'center' }}>Loading...</div>
      ) : admins.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          No admins configured yet.
        </div>
      ) : admins.map(admin => {
        const isMe = admin.user_id === adminUser?.id;
        const initials = (admin.full_name || admin.email || 'A').slice(0, 2).toUpperCase();

        return (
          <div key={admin.id} style={{ ...S.adminRow, opacity: admin.is_active ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={S.avatar}>{initials}</div>
              <div>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {admin.full_name || admin.email}
                  {isMe && <span style={{ fontSize: '11px', color: 'var(--accent)' }}>(you)</span>}
                  <span style={S.activeDot(admin.is_active)} title={admin.is_active ? 'Active' : 'Inactive'} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {admin.email} · Added {new Date(admin.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={S.roleBadge(admin.role)}>{admin.role.replace('_', ' ')}</span>
              {isSuperAdmin && !isMe && (
                <>
                  <select
                    style={{ ...S.select, fontSize: '12px', padding: '5px 10px' }}
                    value={admin.role}
                    onChange={e => updateRole(admin.id, e.target.value)}
                  >
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  <button
                    style={S.btn(admin.is_active ? 'warning' : 'success', 'sm')}
                    onClick={() => toggleAdmin(admin.id, admin.is_active)}
                  >
                    {admin.is_active ? 'Suspend' : 'Activate'}
                  </button>
                  <button style={S.btn('danger', 'sm')} onClick={() => removeAdmin(admin.id, admin.user_id)}>
                    Revoke
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
