// POST /api/telemetry
// Called by each vehicle every 3 seconds to push GPS + status
// Returns any pending commands for that vehicle
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
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

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  let db
  try { db = getSupabase() } catch (e) { return json({ error: e.message }, 500) }

  let body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { vehicle_id, lat, lng, speed, heading, fuel_level, engine_on,
          doors_locked, autopilot_on, bluetooth_active, bluetooth_device,
          current_route, mesh_hops, signal_strength, battery_voltage,
          engine_temp, odometer, altitude, status, firmware_version } = body

  if (!vehicle_id) return json({ error: 'vehicle_id required' }, 400)

  // Verify vehicle exists
  const { data: vehicle, error: vErr } = await db
    .from('vehicles').select('id, plate, is_active').eq('id', vehicle_id).single()
  if (vErr || !vehicle) return json({ error: 'Vehicle not found' }, 401)
  if (!vehicle.is_active)  return json({ error: 'Vehicle inactive' }, 403)

  // Upsert telemetry
  const { error: tErr } = await db.from('vehicle_telemetry').upsert({
    vehicle_id,
    lat:              lat ?? 0,
    lng:              lng ?? 0,
    speed:            speed ?? 0,
    heading:          heading ?? 0,
    fuel_level:       fuel_level ?? null,
    engine_on:        engine_on ?? null,
    doors_locked:     doors_locked ?? null,
    autopilot_on:     autopilot_on ?? false,
    bluetooth_active: bluetooth_active ?? false,
    bluetooth_device: bluetooth_device ?? null,
    current_route:    current_route ?? null,
    mesh_hops:        mesh_hops ?? 0,
    signal_strength:  signal_strength ?? 0,
    battery_voltage:  battery_voltage ?? null,
    engine_temp:      engine_temp ?? null,
    odometer:         odometer ?? null,
    altitude:         altitude ?? null,
    status:           status || 'moving',
    firmware_version: firmware_version || '0.1.0',
    last_seen:        new Date().toISOString(),
    ip_address:       req.headers.get('x-forwarded-for') || 'unknown',
  }, { onConflict: 'vehicle_id' })

  if (tErr) return json({ error: 'Telemetry update failed' }, 500)

  // Fetch pending commands for this vehicle
  const { data: cmds } = await db
    .from('vehicle_commands')
    .select('id, command_type, payload, priority')
    .eq('vehicle_id', vehicle_id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('priority', { ascending: true })
    .limit(10)

  // Mark them as delivered
  if (cmds?.length) {
    await db.from('vehicle_commands')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .in('id', cmds.map(c => c.id))
  }

  return json({
    success:     true,
    vehicle_id,
    plate:       vehicle.plate,
    commands:    cmds || [],
    server_time: new Date().toISOString(),
  })
}

export const config = { path: '/api/telemetry' }
