// GET  /api/vehicles        — full fleet with telemetry
// GET  /api/vehicles?id=x   — single vehicle detail
// GET  /api/vehicles?stats=true — network stats
// POST /api/vehicles        — register new vehicle
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  // Netlify's integration sets SUPABASE_DATABASE_URL (not SUPABASE_URL)
  const url = Netlify.env.get('SUPABASE_DATABASE_URL')
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  let db
  try { db = getSupabase() }
  catch (e) { return json({ error: e.message }, 500) }

  const url    = new URL(req.url)
  const id     = url.searchParams.get('id')
  const stats  = url.searchParams.get('stats') === 'true'

  // ── GET ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    if (stats) {
      const { data: rows } = await db.from('vehicle_telemetry').select('status, mesh_hops')
      const total  = rows?.length || 0
      const active = rows?.filter(r => r.status !== 'offline').length || 0
      const moving = rows?.filter(r => r.status === 'moving').length || 0
      const sos    = rows?.filter(r => r.status === 'sos').length || 0
      const hops   = total ? (rows.reduce((a, r) => a + (r.mesh_hops || 0), 0) / total).toFixed(1) : 0
      return json({ total, active, moving, sos, avg_mesh_hops: hops })
    }

    if (id) {
      const { data, error } = await db
        .from('vehicles')
        .select('*, owner:profiles(full_name,phone,role,organization), telemetry:vehicle_telemetry(*)')
        .eq('id', id)
        .single()
      if (error) return json({ error: 'Vehicle not found' }, 404)
      return json(data)
    }

    const { data, error } = await db
      .from('vehicles')
      .select('*, owner:profiles(full_name,phone), telemetry:vehicle_telemetry(status,lat,lng,speed,heading,fuel_level,engine_on,doors_locked,autopilot_on,bluetooth_active,current_route,mesh_hops,last_seen)')
      .eq('is_active', true)
      .order('plate')
    if (error) return json({ error: 'Fetch failed' }, 500)

    const vehicles = data.map(v => ({
      ...v,
      ...(v.telemetry?.[0] || {}),
      telemetry: undefined
    }))
    return json({ vehicles, total: vehicles.length })
  }

  // ── POST ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const { plate, make, model, year, color, vin, subscription_tier, owner_id } = body
    if (!plate || !make) return json({ error: 'plate and make required' }, 400)
    const { data, error } = await db
      .from('vehicles')
      .insert({ plate, make, model, year, color, vin, subscription_tier, owner_id })
      .select().single()
    if (error) {
      if (error.code === '23505') return json({ error: 'Plate already registered' }, 409)
      return json({ error: 'Failed to register vehicle' }, 500)
    }
    return json({ success: true, vehicle: data }, 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config = { path: '/api/vehicles' }
