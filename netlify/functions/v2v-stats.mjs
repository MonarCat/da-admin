import { createClient } from '@supabase/supabase-js'
 
export default async (req) => {
  const supabase = createClient(Netlify.env.get('SUPABASE_DATABASE_URL'), Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  const [evRes, cvRes] = await Promise.all([
    supabase.from('v2v_events').select('event_type,severity,lat,lng,created_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(200),
    supabase.from('convoys').select('*, members:convoy_members(count)').eq('status','active'),
  ])
  const events=evRes.data||[], convoys=cvRes.data||[]
  return new Response(JSON.stringify({
    active_events:events.length, critical_events:events.filter(e=>e.severity>=2).length,
    hard_braking:events.filter(e=>e.event_type==='hard_braking').length,
    hazard_count:events.filter(e=>e.event_type==='hazard').length,
    active_convoys:convoys.length, convoy_vehicles:convoys.reduce((s,c)=>s+(c.members?.[0]?.count||0),0),
    event_heatmap:events.filter(e=>e.lat&&e.lng).map(e=>({lat:e.lat,lng:e.lng,type:e.event_type,severity:e.severity})),
  }), { headers:{'Content-Type':'application/json'} })
}
export const config = { path: '/api/v2v-stats' }
