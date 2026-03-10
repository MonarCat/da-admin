// ============================================================
// src/lib/supabase.js
// Shared Supabase client — used by BOTH frontend & admin panel
// Add to: da-app/src/lib/supabase.js
//         da-admin/src/lib/supabase.js
// ============================================================
import { createClient } from '@supabase/supabase-js'

// These come from your Netlify environment variables
// Set them in: Netlify Dashboard > Site > Environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '❌ Missing Supabase env vars.\n' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file\n' +
    'Get them from: Supabase Dashboard > Project Settings > API'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// ============================================================
// VEHICLE TELEMETRY — Real-time subscription
// ============================================================

/**
 * Subscribe to ALL vehicle telemetry changes
 * @param {Function} onUpdate - callback(payload)
 * @returns Supabase channel (call .unsubscribe() to clean up)
 */
export function subscribeToAllTelemetry(onUpdate) {
  return supabase
    .channel('all-telemetry')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'vehicle_telemetry' },
      onUpdate
    )
    .subscribe()
}

/**
 * Subscribe to a single vehicle's telemetry
 */
export function subscribeToVehicleTelemetry(vehicleId, onUpdate) {
  return supabase
    .channel(`telemetry:${vehicleId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'vehicle_telemetry',
        filter: `vehicle_id=eq.${vehicleId}`,
      },
      onUpdate
    )
    .subscribe()
}

/**
 * Subscribe to SOS events (real-time alerts)
 */
export function subscribeToSOS(onInsert) {
  return supabase
    .channel('sos-alerts')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'sos_events' },
      onInsert
    )
    .subscribe()
}

/**
 * Subscribe to commands for a vehicle (vehicle side — to receive instructions)
 */
export function subscribeToCommands(vehicleId, onInsert) {
  return supabase
    .channel(`commands:${vehicleId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'vehicle_commands',
        filter: `vehicle_id=eq.${vehicleId}`,
      },
      onInsert
    )
    .subscribe()
}

/**
 * Subscribe to command status updates (admin side — see if command was executed)
 */
export function subscribeToCommandUpdates(onUpdate) {
  return supabase
    .channel('command-updates')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'vehicle_commands' },
      onUpdate
    )
    .subscribe()
}

/**
 * Subscribe to messages
 */
export function subscribeToMessages(vehicleId, onMessage) {
  return supabase
    .channel(`messages:${vehicleId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `to_vehicle=eq.${vehicleId}`,
      },
      onMessage
    )
    .subscribe()
}

// ============================================================
// DATA FETCHERS
// ============================================================

export async function fetchAllVehiclesWithTelemetry() {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      owner:profiles(full_name, phone, role),
      telemetry:vehicle_telemetry(*)
    `)
    .eq('is_active', true)
    .order('plate')

  if (error) throw error
  return data
}

export async function fetchVehicleById(vehicleId) {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      owner:profiles(full_name, phone, role, organization),
      telemetry:vehicle_telemetry(*),
      recent_sos:sos_events(*, created_at)
    `)
    .eq('id', vehicleId)
    .single()

  if (error) throw error
  return data
}

export async function fetchLocationHistory(vehicleId, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('location_history')
    .select('lat, lng, speed, heading, recorded_at')
    .eq('vehicle_id', vehicleId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true })
    .limit(2000)

  if (error) throw error
  return data
}

export async function fetchUnresolvedSOS() {
  const { data, error } = await supabase
    .from('sos_events')
    .select(`*, vehicle:vehicles(plate, make, model), triggered_by:profiles(full_name)`)
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function fetchRecentCommands(limit = 50) {
  const { data, error } = await supabase
    .from('vehicle_commands')
    .select(`
      *,
      vehicle:vehicles(plate),
      issued_by:profiles(full_name, role)
    `)
    .order('issued_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function fetchAuditLog(limit = 100) {
  const { data, error } = await supabase
    .from('audit_log')
    .select(`*, user:profiles(full_name, role)`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// ============================================================
// COMMAND ISSUER (Admin → Vehicle)
// ============================================================

export async function issueCommand(vehicleId, commandType, payload = {}, userId) {
  // Insert command — vehicle picks it up via realtime subscription
  const { data, error } = await supabase
    .from('vehicle_commands')
    .insert({
      vehicle_id: vehicleId,
      issued_by: userId,
      command_type: commandType,
      payload,
      priority: getCommandPriority(commandType),
    })
    .select()
    .single()

  if (error) throw error

  // Write to audit log
  await supabase.from('audit_log').insert({
    user_id: userId,
    action: `COMMAND:${commandType}`,
    target_type: 'vehicle',
    target_id: vehicleId,
    details: { command_id: data.id, payload },
  })

  return data
}

function getCommandPriority(commandType) {
  const priorities = {
    immobilize: 1,
    stop_engine: 1,
    activate_alarm: 2,
    sos_response: 2,
    lock_doors: 3,
    force_bluetooth: 4,
    enable_tracking: 4,
    play_music: 8,
    set_volume: 8,
    broadcast_message: 6,
  }
  return priorities[commandType] || 5
}

export async function updateCommandStatus(commandId, status, errorMessage = null) {
  const updates = { status }
  if (status === 'delivered') updates.delivered_at = new Date().toISOString()
  if (status === 'executed') updates.executed_at = new Date().toISOString()
  if (errorMessage) updates.error_message = errorMessage

  const { error } = await supabase
    .from('vehicle_commands')
    .update(updates)
    .eq('id', commandId)

  if (error) throw error
}

// ============================================================
// TELEMETRY UPDATE (Vehicle → Supabase)
// Called from the vehicle's installed DA firmware/app
// ============================================================

export async function pushTelemetry(vehicleId, telemetryData) {
  const { error } = await supabase
    .from('vehicle_telemetry')
    .upsert({
      vehicle_id: vehicleId,
      ...telemetryData,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'vehicle_id' })

  if (error) throw error
}

// ============================================================
// SOS
// ============================================================

export async function triggerSOS(vehicleId, lat, lng, message, userId = null) {
  const { data, error } = await supabase
    .from('sos_events')
    .insert({
      vehicle_id: vehicleId,
      triggered_by: userId,
      lat, lng,
      message,
      severity: 'critical',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function resolveSOS(sosId, resolvedBy, notes) {
  const { error } = await supabase
    .from('sos_events')
    .update({
      is_resolved: true,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      response_notes: notes,
    })
    .eq('id', sosId)

  if (error) throw error
}

// ============================================================
// AUTH HELPERS
// ============================================================

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { ...user, profile }
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}
