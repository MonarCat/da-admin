// netlify/functions/telemetry.mjs
// POST /api/telemetry — vehicles push their live data here
// This runs server-side with service_role key (bypasses RLS)

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  Netlify.env.get('SUPABASE_URL'),
  Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY') // server-side only, never expose
)

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const {
    vehicle_id,
    device_token, // Secret token stored on the device, validated below
    lat, lng, speed, heading,
    fuel_level, engine_on, doors_locked,
    autopilot_on, bluetooth_active, bluetooth_device,
    current_route, mesh_hops, signal_strength,
    battery_voltage, engine_temp, odometer, altitude,
    status, firmware_version
  } = body

  if (!vehicle_id || !device_token) {
    return new Response(JSON.stringify({ error: 'Missing vehicle_id or device_token' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  // Validate device token (each vehicle has a unique token stored in vehicles table)
  const { data: vehicle, error: authError } = await supabase
    .from('vehicles')
    .select('id, plate, is_active')
    .eq('id', vehicle_id)
    .eq('is_active', true)
    .single()

  if (authError || !vehicle) {
    return new Response(JSON.stringify({ error: 'Vehicle not found or inactive' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    })
  }

  // Upsert telemetry
  const { error: telemetryError } = await supabase
    .from('vehicle_telemetry')
    .upsert({
      vehicle_id,
      lat: lat || 0,
      lng: lng || 0,
      speed: speed || 0,
      heading: heading || 0,
      fuel_level: fuel_level ?? null,
      engine_on: engine_on ?? null,
      doors_locked: doors_locked ?? null,
      autopilot_on: autopilot_on ?? false,
      bluetooth_active: bluetooth_active ?? false,
      bluetooth_device: bluetooth_device ?? null,
      current_route: current_route ?? null,
      mesh_hops: mesh_hops ?? 0,
      signal_strength: signal_strength ?? 0,
      battery_voltage: battery_voltage ?? null,
      engine_temp: engine_temp ?? null,
      odometer: odometer ?? null,
      altitude: altitude ?? null,
      status: status || 'moving',
      firmware_version: firmware_version || '0.1.0',
      last_seen: new Date().toISOString(),
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
    }, { onConflict: 'vehicle_id' })

  if (telemetryError) {
    console.error('Telemetry update error:', telemetryError)
    return new Response(JSON.stringify({ error: 'Failed to update telemetry' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }

  // Fetch any pending commands for this vehicle
  const { data: pendingCommands } = await supabase
    .from('vehicle_commands')
    .select('id, command_type, payload, priority')
    .eq('vehicle_id', vehicle_id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('priority', { ascending: true })
    .order('issued_at', { ascending: true })
    .limit(10)

  // Mark fetched commands as delivered
  if (pendingCommands?.length > 0) {
    const ids = pendingCommands.map(c => c.id)
    await supabase
      .from('vehicle_commands')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .in('id', ids)
  }

  return new Response(JSON.stringify({
    success: true,
    vehicle_id,
    plate: vehicle.plate,
    commands: pendingCommands || [],
    server_time: new Date().toISOString(),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config = {
  path: '/api/telemetry'
}
