// netlify/functions/verify-vehicle.mjs
// Admin endpoint to approve/reject vehicles
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = Netlify.env.get('SUPABASE_DATABASE_URL')
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let supabase
  try { supabase = getSupabase() }
  catch (e) { return json({ error: e.message }, 500) }

  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return json({ error: 'Unauthorized' }, 401)

    // Verify admin role
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !user) return json({ error: 'Invalid token' }, 401)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, clearance_level')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin', 'government', 'fleet_manager'].includes(profile.role)) {
      return json({ error: 'Insufficient clearance' }, 403)
    }

    let body
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

    const { vehicle_id, action, note } = body
    // action: 'verify' | 'reject' | 'flag'

    const statusMap = { verify: 'verified', reject: 'rejected', flag: 'flagged' }
    if (!statusMap[action]) return json({ error: 'Invalid action' }, 400)
    if (!vehicle_id) return json({ error: 'vehicle_id required' }, 400)

    const { data, error } = await supabase
      .from('vehicles')
      .update({
        verification_status: statusMap[action],
        verification_note:   note || null,
        verified_by:         user.id,
        verified_at:         new Date().toISOString(),
      })
      .eq('id', vehicle_id)
      .select()
      .single()

    if (error) throw error

    // Log to audit trail
    await supabase.from('audit_log').insert({
      admin_id:  user.id,
      action:    `vehicle_${action}`,
      target_id: vehicle_id,
      details:   { note, plate: data.plate },
    })

    return json({ success: true, vehicle: data })

  } catch (e) {
    return json({ error: e.message }, 500)
  }
}

export const config = { path: '/api/verify-vehicle' }
