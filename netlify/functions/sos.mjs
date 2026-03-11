// netlify/functions/sos.mjs
// POST /api/sos — vehicle broadcasts SOS
// GET  /api/sos — fetch unresolved SOS events (admin)
// PATCH /api/sos — resolve SOS (admin)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Netlify.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null

export default async (req) => {
  if (!supabase) return json({ error: 'Server configuration error: Supabase environment variables are not set.' }, 503)
  if (req.method === 'POST') return handleTriggerSOS(req)
  if (req.method === 'GET')  return handleGetSOS(req)
  if (req.method === 'PATCH') return handleResolveSOS(req)
  return json({ error: 'Method not allowed' }, 405)
}

async function handleTriggerSOS(req) {
  let body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { vehicle_id, lat, lng, message } = body
  if (!vehicle_id || !lat || !lng) return json({ error: 'Missing required fields' }, 400)

  const { data, error } = await supabase
    .from('sos_events')
    .insert({ vehicle_id, lat, lng, message, severity: 'critical' })
    .select('*, vehicle:vehicles(plate, make)')
    .single()

  if (error) return json({ error: 'SOS trigger failed' }, 500)

  // Also update vehicle status to SOS
  await supabase.from('vehicle_telemetry')
    .update({ status: 'sos' })
    .eq('vehicle_id', vehicle_id)

  return json({ success: true, sos_id: data.id, message: 'SOS broadcast sent' })
}

async function handleGetSOS(req) {
  const url = new URL(req.url)
  const resolved = url.searchParams.get('resolved') === 'true'

  const { data, error } = await supabase
    .from('sos_events')
    .select(`
      *,
      vehicle:vehicles(plate, make, model, color),
      triggered_by:profiles(full_name, phone)
    `)
    .eq('is_resolved', resolved)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return json({ error: 'Fetch failed' }, 500)
  return json({ sos_events: data })
}

async function handleResolveSOS(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return json({ error: 'Invalid token' }, 401)

  let body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { sos_id, response_notes } = body
  const { error } = await supabase
    .from('sos_events')
    .update({
      is_resolved: true,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      response_notes,
    })
    .eq('id', sos_id)

  if (error) return json({ error: 'Resolve failed' }, 500)

  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'SOS:RESOLVED',
    target_type: 'sos_event',
    target_id: sos_id,
    details: { response_notes },
  })

  return json({ success: true })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export const config = { path: '/api/sos' }
