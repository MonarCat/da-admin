import { createClient } from '@supabase/supabase-js'

export default async (req) => {
  const url = Netlify.env.get('SUPABASE_DATABASE_URL')
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return json({ error: 'Not configured' }, 503)

  const supabase = createClient(url, key)
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  // Auth check — must be admin or super_admin
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorised' }, 401)

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return json({ error: 'Invalid token' }, 401)

  const { data: profile } = await supabase
    .from('profiles').select('role, clearance_level').eq('id', user.id).single()

  if (!['admin','super_admin'].includes(profile?.role)) {
    return json({ error: 'Forbidden' }, 403)
  }

  const { skill, params = {} } = await req.json()

  // Log agent session start
  const { data: session } = await supabase
    .from('agent_sessions')
    .insert({ agent_name: skill, triggered_by: 'manual', input: params, status: 'running' })
    .select().single()

  let output = {}
  let status = 'completed'

  try {
    switch (skill) {

      // ── SKILL: Fleet status summary ──────────────────
      case 'da-fleet-summary': {
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('vehicle_status, verification_status, fleet_id')
          .eq('is_active', true)

        const summary = {
          total:        vehicles?.length || 0,
          moving:       vehicles?.filter(v => v.vehicle_status === 'moving').length || 0,
          parked:       vehicles?.filter(v => v.vehicle_status === 'parked').length || 0,
          sos:          vehicles?.filter(v => v.vehicle_status === 'sos').length || 0,
          stalled:      vehicles?.filter(v => v.vehicle_status === 'stalled').length || 0,
          pending:      vehicles?.filter(v => v.verification_status === 'pending').length || 0,
          verified:     vehicles?.filter(v => v.verification_status === 'verified').length || 0,
          generated_at: new Date().toISOString(),
        }
        output = { summary, narrative: buildNarrative(summary) }
        break
      }

      // ── SKILL: SOS active alerts ─────────────────────
      case 'da-sos-check': {
        const { data: sos } = await supabase
          .from('vehicles')
          .select('plate, make, model, lat, lng, last_seen, owner:profiles!owner_id(full_name, phone)')
          .eq('vehicle_status', 'sos')
          .eq('is_active', true)
        output = { sos_count: sos?.length || 0, vehicles: sos || [] }
        break
      }

      // ── SKILL: Locate vehicle ────────────────────────
      case 'da-locate': {
        const { plate } = params
        if (!plate) throw new Error('plate param required')
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('plate, make, model, vehicle_status, lat, lng, speed, last_seen, owner:profiles!owner_id(full_name, phone)')
          .ilike('plate', plate.trim())
          .maybeSingle()
        if (!vehicle) throw new Error(`Vehicle ${plate} not found`)
        output = { vehicle, maps_url: vehicle.lat ? `https://maps.google.com/?q=${vehicle.lat},${vehicle.lng}` : null }
        break
      }

      // ── SKILL: Pending verifications count ──────────
      case 'da-pending-verifications': {
        const { data: pending } = await supabase
          .from('vehicles')
          .select('id, plate, make, model, registration_category, created_at, owner:profiles!owner_id(full_name, phone)')
          .eq('verification_status', 'pending')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
        output = { count: pending?.length || 0, vehicles: pending || [] }
        break
      }

      default:
        throw new Error(`Unknown skill: ${skill}`)
    }
  } catch (e) {
    status = 'failed'
    output = { error: e.message }
  }

  // Update agent session with result
  await supabase.from('agent_sessions')
    .update({ status, output, completed_at: new Date().toISOString() })
    .eq('id', session.id)

  return json({ skill, status, output, session_id: session.id })
}

function buildNarrative(s) {
  const parts = []
  if (s.sos > 0)     parts.push(`⚠️ ${s.sos} SOS alert${s.sos>1?'s':''} active`)
  if (s.stalled > 0) parts.push(`${s.stalled} stalled`)
  if (s.moving > 0)  parts.push(`${s.moving} moving`)
  if (s.parked > 0)  parts.push(`${s.parked} parked`)
  if (s.pending > 0) parts.push(`${s.pending} awaiting verification`)
  return parts.length ? parts.join(' · ') : 'Fleet nominal — no active alerts'
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export const config = { path: '/api/agent' }
