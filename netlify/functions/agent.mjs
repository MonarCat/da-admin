import { createClient } from '@supabase/supabase-js'
 
export default async (req) => {
  const url = Netlify.env.get('SUPABASE_DATABASE_URL')
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url||!key) return json({ error:'Not configured' }, 503)
  if (req.method !== 'POST') return json({ error:'POST only' }, 405)
 
  const supabase = createClient(url, key)
  const token = req.headers.get('authorization')?.replace('Bearer ','')
  if (!token) return json({ error:'Unauthorised' }, 401)
 
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return json({ error:'Invalid token' }, 401)
 
  const { data: profile } = await supabase.from('profiles').select('role,clearance_level').eq('id',user.id).single()
  if (!['admin','super_admin'].includes(profile?.role)) return json({ error:'Forbidden' }, 403)
 
  const { skill, params={} } = await req.json()
  const { data: session } = await supabase.from('agent_sessions').insert({ agent_name:skill, triggered_by:'manual', input:params, status:'running' }).select().single()
 
  let output={}, status='completed'
  try {
    switch(skill) {
      case 'da-fleet-summary': {
        const { data:v } = await supabase.from('vehicles').select('vehicle_status,verification_status').eq('is_active',true)
        const s = { total:v?.length||0, moving:v?.filter(x=>x.vehicle_status==='moving').length||0, parked:v?.filter(x=>x.vehicle_status==='parked').length||0, sos:v?.filter(x=>x.vehicle_status==='sos').length||0, stalled:v?.filter(x=>x.vehicle_status==='stalled').length||0, pending:v?.filter(x=>x.verification_status==='pending').length||0, verified:v?.filter(x=>x.verification_status==='verified').length||0, generated_at:new Date().toISOString() }
        const parts=[]; if(s.sos>0)parts.push(`⚠️ ${s.sos} SOS`); if(s.moving>0)parts.push(`${s.moving} moving`); if(s.parked>0)parts.push(`${s.parked} parked`); if(s.pending>0)parts.push(`${s.pending} pending verification`)
        output={summary:s, narrative:parts.length?parts.join(' • '):'Fleet nominal'}; break
      }
      case 'da-sos-check': {
        const { data:sos } = await supabase.from('vehicles').select('plate,make,model,lat,lng,last_seen,owner:profiles!owner_id(full_name,phone)').eq('vehicle_status','sos').eq('is_active',true)
        output={sos_count:sos?.length||0,vehicles:sos||[]}; break
      }
      case 'da-locate': {
        const { plate } = params; if(!plate) throw new Error('plate required')
        const { data:v } = await supabase.from('vehicles').select('plate,make,model,vehicle_status,lat,lng,speed,last_seen,owner:profiles!owner_id(full_name,phone)').ilike('plate',plate.trim()).maybeSingle()
        if(!v) throw new Error(`${plate} not found`)
        output={vehicle:v, maps_url:v.lat?`https://maps.google.com/?q=${v.lat},${v.lng}`:null}; break
      }
      case 'da-pending-verifications': {
        const { data:pend } = await supabase.from('vehicles').select('id,plate,make,model,registration_category,created_at,owner:profiles!owner_id(full_name,phone)').eq('verification_status','pending').eq('is_active',true).order('created_at',{ascending:true})
        output={count:pend?.length||0,vehicles:pend||[]}; break
      }
      default: throw new Error(`Unknown skill: ${skill}`)
    }
  } catch(e) { status='failed'; output={error:e.message} }
 
  await supabase.from('agent_sessions').update({ status, output, completed_at:new Date().toISOString() }).eq('id', session.id)
  return json({ skill, status, output, session_id:session.id })
}
 
function json(data, status=200) { return new Response(JSON.stringify(data), { status, headers:{'Content-Type':'application/json'} }) }
export const config = { path: '/api/agent' }
