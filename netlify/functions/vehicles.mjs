// netlify/functions/vehicles.mjs
// GET  /api/vehicles         — all vehicles with live telemetry
// GET  /api/vehicles?id=xxx  — single vehicle full detail
// POST /api/vehicles         — register new vehicle
// PATCH /api/vehicles        — update vehicle

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Netlify.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null

export default async (req) => {
  if (!supabase) return json({ error: 'Server configuration error: Supabase environment variables are not set.' }, 503)
  if (req.method === 'GET')   return handleGet(req)
  if (req.method === 'POST')  return handleCreate(req)
  if (req.method === 'PATCH') return handleUpdate(req)
  return json({ error: 'Method not allowed' }, 405)
}

async function handleGet(req) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const stats = url.searchParams.get('stats')

  // Network stats endpoint
  if (stats === 'true') {
    const { data: telemetry } = await supabase
      .from('vehicle_telemetry')
      .select('status, mesh_hops, signal_strength')

    const total = telemetry?.length || 0
    const active = telemetry?.filter(t => t.status !== 'offline').length || 0
    const moving = telemetry?.filter(t => t.status === 'moving').length || 0
    const sos = telemetry?.filter(t => t.status === 'sos').length || 0
    const avgHops = telemetry?.reduce((a, b) => a + (b.mesh_hops || 0), 0) / (total || 1)

    return json({ total, active, moving, sos, avg_mesh_hops: avgHops.toFixed(1) })
  }

  if (id) {
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        owner:profiles(id, full_name, phone, role, organization),
        telemetry:vehicle_telemetry(*),
        sos_events(id, message, severity, created_at, is_resolved),
        recent_commands:vehicle_commands(id, command_type, status, issued_at, payload)
      `)
      .eq('id', id)
      .order('issued_at', { foreignTable: 'vehicle_commands', ascending: false })
      .limit(5, { foreignTable: 'vehicle_commands' })
      .single()

    if (error) return json({ error: 'Vehicle not found' }, 404)
    return json(data)
  }

  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      owner:profiles(full_name, phone),
      telemetry:vehicle_telemetry(
        status, lat, lng, speed, heading, fuel_level,
        engine_on, doors_locked, autopilot_on,
        bluetooth_active, current_route, mesh_hops,
        last_seen, updated_at
      )
    `)
    .eq('is_active', true)
    .order('plate')

  if (error) return json({ error: 'Fetch failed' }, 500)

  // Flatten for easier consumption
  const vehicles = data.map(v => ({
    ...v,
    ...v.telemetry?.[0],
    telemetry: undefined,
  }))

  return json({ vehicles, total: vehicles.length })
}

async function handleCreate(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return json({ error: 'Invalid token' }, 401)

  let body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { plate, make, model, year, color, vin, subscription_tier, owner_id } = body

  if (!plate || !make) return json({ error: 'plate and make are required' }, 400)

  const { data, error } = await supabase
    .from('vehicles')
    .insert({ plate, make, model, year, color, vin, subscription_tier, owner_id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return json({ error: 'Plate already registered' }, 409)
    return json({ error: 'Failed to register vehicle' }, 500)
  }

  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'VEHICLE:REGISTERED',
    target_type: 'vehicle',
    target_id: data.id,
    details: { plate, make, model },
  })

  return json({ success: true, vehicle: data }, 201)
}

async function handleUpdate(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return json({ error: 'Invalid token' }, 401)

  let body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { id, ...updates } = body
  if (!id) return json({ error: 'Missing vehicle id' }, 400)

  const { data, error } = await supabase
    .from('vehicles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return json({ error: 'Update failed' }, 500)
  return json({ success: true, vehicle: data })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export const config = { path: '/api/vehicles' }
