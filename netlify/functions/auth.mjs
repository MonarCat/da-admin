// POST /api/auth/signup         — register new user (invited or open)
// GET  /api/auth/users          — list all users (admin)
// POST /api/auth/invite         — send invitation (admin)
// PATCH /api/auth/users/:id     — update role / profile (admin)
// DELETE /api/auth/users/:id    — deactivate user (super_admin)
// GET  /api/auth/me             — current user profile

import { createClient } from '@supabase/supabase-js'

function db() {
  const url = Netlify.env.get('SUPABASE_DATABASE_URL')
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

async function getCallerProfile(req, supabase) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const { data: { user }, error } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
  if (error || !user) return null
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return profile ? { ...user, profile } : null
}

const ELEVATED = ['admin', 'super_admin', 'government']
const SUPER    = ['super_admin', 'government']

export default async (req) => {
  const url     = new URL(req.url)
  const parts   = url.pathname.split('/').filter(Boolean)
  // parts: ['api','auth','action'] or ['api','auth','users','id']
  const action  = parts[2]  // signup | users | invite | me
  const targetId = parts[3] // user id for update/delete

  let supabase
  try { supabase = db() } catch (e) { return json({ error: e.message }, 500) }

  // ── GET /api/auth/me ─────────────────────────────────────────
  if (req.method === 'GET' && action === 'me') {
    const caller = await getCallerProfile(req, supabase)
    if (!caller) return json({ error: 'Unauthorized' }, 401)
    const { data: vehicles } = await supabase
      .from('vehicle_assignments')
      .select('vehicle:vehicles(id,plate,make,model,status)')
      .eq('user_id', caller.id)
      .eq('is_active', true)
    return json({ user: caller, vehicles: vehicles?.map(v => v.vehicle) || [] })
  }

  // ── POST /api/auth/signup ────────────────────────────────────
  if (req.method === 'POST' && action === 'signup') {
    let body
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const { email, password, full_name, phone, invite_token } = body

    if (!email || !password || !full_name) {
      return json({ error: 'email, password, full_name required' }, 400)
    }
    if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400)

    // Validate invite token if provided
    if (invite_token) {
      const { data: inv } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', invite_token)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .single()
      if (!inv) return json({ error: 'Invalid or expired invitation token' }, 400)
      if (inv.email && inv.email.toLowerCase() !== email.toLowerCase()) {
        return json({ error: 'This invitation was issued for a different email address' }, 400)
      }
    }

    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone }
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        return json({ error: 'An account with this email already exists' }, 409)
      }
      return json({ error: signUpError.message }, 400)
    }

    // Log session
    await supabase.rpc('track_login', {
      p_user_id: authData.user.id,
      p_ip:      req.headers.get('x-forwarded-for'),
      p_agent:   req.headers.get('user-agent'),
      p_success: true
    })

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', authData.user.id).single()

    return json({ success: true, user: authData.user, profile }, 201)
  }

  // ── GET /api/auth/users ──────────────────────────────────────
  if (req.method === 'GET' && action === 'users') {
    const caller = await getCallerProfile(req, supabase)
    if (!caller || !ELEVATED.includes(caller.profile?.role)) {
      return json({ error: 'Insufficient clearance' }, 403)
    }

    const orgFilter = caller.profile.role === 'fleet_manager' ? caller.profile.org_id : null
    let query = supabase
      .from('profiles')
      .select('*, org:organizations(name,type,license_tier)')
      .order('created_at', { ascending: false })

    if (orgFilter) query = query.eq('org_id', orgFilter)

    const { data, error } = await query
    if (error) return json({ error: 'Failed to fetch users' }, 500)
    return json({ users: data, total: data.length })
  }

  // ── POST /api/auth/invite ────────────────────────────────────
  if (req.method === 'POST' && action === 'invite') {
    const caller = await getCallerProfile(req, supabase)
    if (!caller || !ELEVATED.includes(caller.profile?.role)) {
      return json({ error: 'Insufficient clearance' }, 403)
    }

    let body
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const { email, role = 'driver', org_id, note } = body

    if (!email) return json({ error: 'email required' }, 400)

    // Enforce role hierarchy
    const ROLE_RANK = { driver:1, fleet_manager:3, admin:5, government:9, super_admin:10 }
    const callerRank  = ROLE_RANK[caller.profile.role] || 1
    const inviteeRank = ROLE_RANK[role] || 1
    if (inviteeRank >= callerRank && !SUPER.includes(caller.profile.role)) {
      return json({ error: `You cannot invite someone with equal or higher role` }, 403)
    }

    const { data: inv, error } = await supabase
      .from('invitations')
      .insert({ email, role, org_id: org_id || caller.profile.org_id, invited_by: caller.id, note })
      .select().single()

    if (error) return json({ error: 'Failed to create invitation' }, 500)

    // In production: send email via your email provider
    // For now return the token directly
    const inviteUrl = `${req.headers.get('origin') || 'https://your-admin-site.netlify.app'}/signup?token=${inv.token}&email=${encodeURIComponent(email)}`

    return json({
      success: true,
      invitation: inv,
      invite_url: inviteUrl,
      message: `Invitation created for ${email}. Share the invite URL with them.`
    })
  }

  // ── PATCH /api/auth/users/:id ────────────────────────────────
  if (req.method === 'PATCH' && action === 'users' && targetId) {
    const caller = await getCallerProfile(req, supabase)
    if (!caller || !ELEVATED.includes(caller.profile?.role)) {
      return json({ error: 'Insufficient clearance' }, 403)
    }

    let body
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

    // Only super_admin can change roles
    if (body.role && !SUPER.includes(caller.profile.role)) {
      return json({ error: 'Only super_admin can change user roles' }, 403)
    }

    const allowed = ['full_name','phone','role','org_id','department','badge_number','clearance_level','is_active']
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

    if (updates.role) {
      const CLEARANCE = { driver:1, fleet_manager:3, admin:5, government:9, super_admin:10 }
      updates.clearance_level = CLEARANCE[updates.role] || 1
    }

    const { data, error } = await supabase
      .from('profiles').update(updates).eq('id', targetId).select().single()
    if (error) return json({ error: 'Update failed' }, 500)

    // Audit
    await supabase.from('audit_log').insert({
      user_id: caller.id, action: 'USER:UPDATE', target_type: 'profile', target_id: targetId,
      details: { updates, updated_by: caller.profile.full_name }
    })

    return json({ success: true, profile: data })
  }

  // ── DELETE /api/auth/users/:id ───────────────────────────────
  if (req.method === 'DELETE' && action === 'users' && targetId) {
    const caller = await getCallerProfile(req, supabase)
    if (!caller || !SUPER.includes(caller.profile?.role)) {
      return json({ error: 'Only super_admin can deactivate users' }, 403)
    }
    if (targetId === caller.id) return json({ error: 'Cannot deactivate yourself' }, 400)

    await supabase.from('profiles').update({ is_active: false }).eq('id', targetId)
    await supabase.auth.admin.updateUserById(targetId, { ban_duration: '876600h' })

    await supabase.from('audit_log').insert({
      user_id: caller.id, action: 'USER:DEACTIVATED', target_type: 'profile', target_id: targetId,
      details: { deactivated_by: caller.profile.full_name }
    })

    return json({ success: true })
  }

  return json({ error: 'Not found' }, 404)
}

export const config = { path: '/api/auth/*' }
