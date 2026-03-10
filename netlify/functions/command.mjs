// netlify/functions/command.mjs
// POST /api/command — admin issues a command to a vehicle
// Only accessible by admin/government roles

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  Netlify.env.get('SUPABASE_URL'),
  Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
)

const ALLOWED_ROLES = ['admin', 'super_admin', 'government']

// Command authorization matrix — which roles can use which commands
const COMMAND_AUTH = {
  stop_engine:         ['super_admin', 'government'],
  start_engine:        ['super_admin', 'government'],
  immobilize:          ['super_admin', 'government'],
  release_immobilize:  ['super_admin', 'government'],
  activate_autopilot:  ['super_admin', 'government', 'admin'],
  deactivate_autopilot:['super_admin', 'government', 'admin'],
  lock_doors:          ['super_admin', 'government', 'admin'],
  unlock_doors:        ['super_admin', 'government', 'admin'],
  force_bluetooth:     ['super_admin', 'government', 'admin'],
  disconnect_bluetooth:['super_admin', 'government', 'admin'],
  play_music:          ['super_admin', 'government', 'admin'],
  stop_music:          ['super_admin', 'government', 'admin'],
  set_volume:          ['super_admin', 'government', 'admin'],
  activate_alarm:      ['super_admin', 'government', 'admin'],
  deactivate_alarm:    ['super_admin', 'government', 'admin'],
  request_location:    ['super_admin', 'government', 'admin', 'fleet_manager'],
  enable_tracking:     ['super_admin', 'government', 'admin', 'fleet_manager'],
  disable_tracking:    ['super_admin', 'government'],
  broadcast_message:   ['super_admin', 'government', 'admin'],
  sos_response:        ['super_admin', 'government', 'admin'],
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // Verify JWT from Authorization header
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing authorization' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)

  // Get user profile + role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, organization')
    .eq('id', user.id)
    .single()

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return json({ error: 'Insufficient permissions' }, 403)
  }

  let body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { vehicle_id, command_type, payload = {} } = body

  if (!vehicle_id || !command_type) {
    return json({ error: 'Missing vehicle_id or command_type' }, 400)
  }

  // Check command authorization
  const allowedRoles = COMMAND_AUTH[command_type]
  if (!allowedRoles) return json({ error: 'Unknown command type' }, 400)
  if (!allowedRoles.includes(profile.role)) {
    return json({ error: `Role '${profile.role}' cannot issue '${command_type}'` }, 403)
  }

  // Verify vehicle exists
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id, plate, is_active')
    .eq('id', vehicle_id)
    .single()

  if (!vehicle) return json({ error: 'Vehicle not found' }, 404)
  if (!vehicle.is_active) return json({ error: 'Vehicle is inactive' }, 400)

  // Issue command
  const { data: command, error: cmdError } = await supabase
    .from('vehicle_commands')
    .insert({
      vehicle_id,
      issued_by: user.id,
      command_type,
      payload,
      priority: getPriority(command_type),
      ip_address: req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent'),
    })
    .select()
    .single()

  if (cmdError) {
    console.error('Command insert error:', cmdError)
    return json({ error: 'Failed to issue command' }, 500)
  }

  // Audit log
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: `CMD:${command_type.toUpperCase()}`,
    target_type: 'vehicle',
    target_id: vehicle_id,
    details: {
      command_id: command.id,
      plate: vehicle.plate,
      payload,
      issued_by_name: profile.full_name,
      issued_by_role: profile.role,
      organization: profile.organization,
    },
    ip_address: req.headers.get('x-forwarded-for'),
    user_agent: req.headers.get('user-agent'),
  })

  return json({
    success: true,
    command_id: command.id,
    vehicle_id,
    plate: vehicle.plate,
    command_type,
    status: 'pending',
    message: `Command '${command_type}' issued to ${vehicle.plate}`,
  })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function getPriority(commandType) {
  const p = {
    immobilize: 1, stop_engine: 1, activate_alarm: 2,
    sos_response: 2, lock_doors: 3, force_bluetooth: 4,
    play_music: 8, set_volume: 9, broadcast_message: 6,
  }
  return p[commandType] || 5
}

export const config = { path: '/api/command' }
