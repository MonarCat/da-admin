// POST  /api/sos  — vehicle triggers SOS
// GET   /api/sos  — fetch unresolved SOS events
// PATCH /api/sos  — admin resolves SOS
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
  let db
  try { db = getSupabase() } catch (e) { return json({ error: e.message }, 500) }

  // ── POST: vehicle triggers SOS ──────────────────────────
  if (req.method === 'POST') {
    let body
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const { vehicle_id, lat, lng, message } = body
    if (!vehicle_id || !lat || !lng) return json({ error: 'vehicle_id, lat, lng required' }, 400)

    const { data, error } = await db.from('sos_events')
      .insert({ vehicle_id, lat, lng, message, severity: 'critical' })
      .select('id').single()
    if (error) return json({ error: 'SOS trigger failed' }, 500)

    // Mark vehicle as SOS status
    await db.from('vehicle_telemetry').update({ status: 'sos' }).eq('vehicle_id', vehicle_id)

    return json({ success: true, sos_id: data.id })
  }

  // ── GET: fetch SOS events ───────────────────────────────
  if (req.method === 'GET') {
    const resolved = new URL(req.url).searchParams.get('resolved') === 'true'
    const { data, error } = await db.from('sos_events')
      .select('*, vehicle:vehicles(plate,make,model,color), triggered_by:profiles(full_name,phone)')
      .eq('is_resolved', resolved)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return json({ error: 'Fetch failed' }, 500)
    return json({ sos_events: data })
  }

  // ── PATCH: admin resolves SOS ───────────────────────────
  if (req.method === 'PATCH') {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
    const { data: { user }, error: authErr } = await db.auth.getUser(auth.replace('Bearer ', ''))
    if (authErr || !user) return json({ error: 'Invalid token' }, 401)

    let body
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const { sos_id, response_notes } = body
    if (!sos_id) return json({ error: 'sos_id required' }, 400)

    const { error } = await db.from('sos_events').update({
      is_resolved:    true,
      resolved_by:    user.id,
      resolved_at:    new Date().toISOString(),
      response_notes: response_notes || 'Resolved',
    }).eq('id', sos_id)

    if (error) return json({ error: 'Resolve failed' }, 500)

    await db.from('audit_log').insert({
      user_id: user.id, action: 'SOS:RESOLVED',
      target_type: 'sos_event', target_id: sos_id,
      details: { response_notes },
    })

    return json({ success: true })
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config = { path: '/api/sos' }
