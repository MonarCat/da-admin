import { createClient } from '@supabase/supabase-js'
 
const VALID_ACTIONS = ['verified','rejected','flagged','under_review','failed']
 
export default async (req) => {
  const url = Netlify.env.get('SUPABASE_DATABASE_URL')
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return json({ error: 'Not configured' }, 503)
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
 
  const supabase = createClient(url, key)
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorised' }, 401)
 
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return json({ error: 'Invalid token' }, 401)
 
  const { data: adminProfile } = await supabase.from('profiles').select('role,full_name').eq('id', user.id).single()
  if (!['admin','super_admin','government','fleet_manager'].includes(adminProfile?.role)) return json({ error: 'Forbidden' }, 403)
 
  try {
    const { vehicle_id, action, note } = await req.json()
    if (!vehicle_id) return json({ error: 'vehicle_id required' }, 400)
    if (!VALID_ACTIONS.includes(action)) return json({ error: `action must be: ${VALID_ACTIONS.join(', ')}` }, 400)
 
    const { data: vehicle } = await supabase.from('vehicles').select('verification_status,plate,owner_id').eq('id', vehicle_id).single()
    if (!vehicle) return json({ error: 'Vehicle not found' }, 404)
 
    await supabase.from('vehicles').update({ verification_status:action, verified_by:user.id, verified_at:new Date().toISOString(), verification_note:note||null }).eq('id', vehicle_id)
 
    await supabase.from('verification_log').insert({ vehicle_id, admin_id:user.id, action, note:note||null, previous_status:vehicle.verification_status })
 
    const msg = { verified:'✅ Your vehicle has been verified and is now active on the D.A network.', rejected:'❌ Your vehicle registration was rejected.', flagged:'⚠️ Your vehicle has been flagged for review.', under_review:'🔍 Your vehicle is under review.', failed:'❌ Your vehicle registration has failed validation.' }
 
    await supabase.from('notifications').insert({
      type:'vehicle_status_update', title:`${vehicle.plate} — ${action.replace('_',' ').toUpperCase()}`,
      body: (msg[action]||'Status updated.') + (note ? ` Note: ${note}` : ''),
      vehicle_id, from_user_id:user.id, to_role:'driver',
    })
 
    await supabase.from('notifications').update({ read:true, read_at:new Date().toISOString() }).eq('vehicle_id', vehicle_id).eq('type','vehicle_registered')
 
    return json({ ok:true, action, vehicle_plate:vehicle.plate, admin:adminProfile.full_name })
  } catch(e) { console.error('verify-vehicle:', e.message); return json({ error:e.message }, 500) }
}
 
function json(data, status=200) { return new Response(JSON.stringify(data), { status, headers:{'Content-Type':'application/json'} }) }
export const config = { path: '/api/verify-vehicle' }
