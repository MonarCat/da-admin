import { createClient } from '@supabase/supabase-js'
 
const SUPER_ADMIN_ID = 'a7a26e70-f360-4c02-9424-a8770374a206'
const PHASE_ORDER = ['surveillance','mesh_broadcast','audio_alert','alarm','lockdown','engine_control','recovered']
const PHASE_COMMANDS = {
  surveillance:   ['ACTIVATE_TRACKING','MESH_SCAN','DASHCAM_REQUEST','LOCATE_TARGET'],
  mesh_broadcast: ['BROADCAST_NEARBY','ALERT_AUTHORITIES','BROADCAST_PLATE'],
  audio_alert:    ['AUDIO_STOLEN_WARNING','AUDIO_SIREN','PASSENGER_ANNOUNCE'],
  alarm:          ['ALARM_ACTIVATE','LIGHTS_FLASH','HORN_CONTINUOUS'],
  lockdown:       ['SAFE_STEER_INITIATE','HAZARDS_ON','LOCK_DOORS','LOCK_WINDOWS'],
  engine_control: ['ENGINE_THROTTLE_50','ENGINE_THROTTLE_25','ENGINE_CUT'],
  recovered:      ['DEACTIVATE_ALL','UNLOCK_VEHICLE','SEND_RECOVERY_REPORT'],
}
 
export default async (req) => {
  const db  = Netlify.env.get('SUPABASE_DATABASE_URL')
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!db || !key) return json({ error: 'Not configured' }, 503)
 
  const supabase = createClient(db, key)
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorised' }, 401)
 
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user || user.id !== SUPER_ADMIN_ID) { console.error('Shadow Mesh unauthorised:', user?.id); return json({ error: 'FORBIDDEN — Super admin only' }, 403) }
 
  const path = new URL(req.url).pathname
 
  if (req.method === 'GET' && path.endsWith('/active')) {
    const { data } = await supabase.from('vehicle_pursuits')
      .select('*, vehicle:vehicles(plate,make,model,lat,lng,vehicle_status), commands:pursuit_commands(command,phase,issued_at,status)')
      .eq('status','active').order('activated_at', { ascending:false })
    return json({ pursuits: data||[] })
  }
 
  if (req.method === 'POST' && path.endsWith('/activate')) {
    const { target_plate, reason, case_reference, threat_level } = await req.json()
    if (!target_plate||!reason) return json({ error:'target_plate and reason required' }, 400)
    const { data: vehicle } = await supabase.from('vehicles').select('id,plate,make,model,lat,lng,owner_id').ilike('plate',target_plate.trim()).maybeSingle()
    const { data: pursuit } = await supabase.from('vehicle_pursuits')
      .insert({ target_plate:target_plate.toUpperCase().trim(), vehicle_id:vehicle?.id||null, initiated_by:user.id, status:'active', threat_level:threat_level||1, reason, case_reference:case_reference||null, current_phase:'surveillance' })
      .select().single()
    await supabase.from('pursuit_commands').insert({ pursuit_id:pursuit.id, command:'ACTIVATE_TRACKING', phase:'surveillance', issued_by:user.id, payload:{ target_plate, vehicle_id:vehicle?.id } })
    return json({ ok:true, pursuit, vehicle:vehicle||null })
  }
 
  if (req.method === 'POST' && path.endsWith('/command')) {
    const { pursuit_id, command, payload={} } = await req.json()
    if (!pursuit_id||!command) return json({ error:'pursuit_id and command required' }, 400)
    const { data: pursuit } = await supabase.from('vehicle_pursuits').select('*').eq('id',pursuit_id).single()
    if (!pursuit) return json({ error:'Pursuit not found' }, 404)
    if (pursuit.status !== 'active') return json({ error:`Pursuit is ${pursuit.status}` }, 400)
 
    const commandPhase = Object.entries(PHASE_COMMANDS).find(([,cmds])=>cmds.includes(command))?.[0]
    if (!commandPhase) return json({ error:`Unknown command: ${command}` }, 400)
 
    const { data: cmd } = await supabase.from('pursuit_commands').insert({ pursuit_id, command, phase:commandPhase, issued_by:user.id, payload }).select().single()
 
    const updates = { last_updated:new Date().toISOString() }
    const currentIdx = PHASE_ORDER.indexOf(pursuit.current_phase)
    const commandIdx = PHASE_ORDER.indexOf(commandPhase)
    if (commandIdx > currentIdx) updates.current_phase = commandPhase
 
    if (['BROADCAST_NEARBY','BROADCAST_PLATE'].includes(command)) {
      updates.broadcast_sent = true
      await supabase.from('mesh_alerts').insert({ pursuit_id, alert_type:'nearby_vehicle_alert', message:`⚠️ STOLEN VEHICLE ALERT — ${pursuit.target_plate} — DO NOT APPROACH — NOTIFY POLICE IMMEDIATELY`, target_plate:pursuit.target_plate, radius_km:10, lat:payload.lat||null, lng:payload.lng||null })
    }
    if (command === 'SAFE_STEER_INITIATE') updates.safe_steer_sent = true
    if (command === 'ENGINE_CUT') {
      updates.engine_cut_sent = true
      await supabase.from('mesh_alerts').insert({ pursuit_id, alert_type:'broadcast_message', message:`🚨 STOLEN VEHICLE ${pursuit.target_plate} BEING DISABLED — CLEAR THE ROAD — POLICE OPERATION`, target_plate:pursuit.target_plate, radius_km:15 })
    }
    if (command === 'DEACTIVATE_ALL') { updates.status='recovered'; updates.current_phase='recovered'; updates.recovered_at=new Date().toISOString() }
 
    await supabase.from('vehicle_pursuits').update(updates).eq('id', pursuit_id)
    return json({ ok:true, command:cmd, pursuit_phase:updates.current_phase||pursuit.current_phase })
  }
 
  if (req.method === 'POST' && path.endsWith('/vehicle-command')) {
    const { pursuit_id, vehicle_id, command, payload={} } = await req.json()
    if (!pursuit_id||!vehicle_id||!command) return json({ error:'pursuit_id, vehicle_id and command required' }, 400)
    const { data: cmd } = await supabase.from('vehicle_commands')
      .insert({ vehicle_id, pursuit_id, command, payload, issued_by:user.id, status:'pending', expires_at:new Date(Date.now()+30*60*1000).toISOString() })
      .select().single()
    return json({ ok:true, command:cmd })
  }
 
  if (req.method === 'POST' && path.endsWith('/identify')) {
    const { bt_name, bt_mac, obd_serial, plate } = await req.json()
    const results = []
    if (bt_mac) { const { data } = await supabase.from('vehicle_fingerprints').select('*, vehicle:vehicles(plate,make,model,owner:profiles!owner_id(full_name,phone))').ilike('bt_mac',bt_mac.trim()); (data||[]).forEach(r=>results.push({...r,confidence:100,match_type:'bt_mac_exact'})) }
    if (obd_serial) { const { data } = await supabase.from('vehicle_fingerprints').select('*, vehicle:vehicles(plate,make,model,owner:profiles!owner_id(full_name,phone))').ilike('obd_serial',`%${obd_serial.trim()}%`); (data||[]).forEach(r=>{if(!results.find(x=>x.vehicle_id===r.vehicle_id)) results.push({...r,confidence:98,match_type:'obd_serial'})}) }
    if (bt_name) { const { data } = await supabase.from('vehicle_fingerprints').select('*, vehicle:vehicles(plate,make,model,owner:profiles!owner_id(full_name,phone))').ilike('bt_name',`%${bt_name.trim()}%`); (data||[]).forEach(r=>{if(!results.find(x=>x.vehicle_id===r.vehicle_id)) results.push({...r,confidence:80,match_type:'bt_name_match'})}) }
    if (plate) { const { data } = await supabase.from('vehicles').select('id,plate,make,model,owner:profiles!owner_id(full_name,phone),vehicle_fingerprints(*)').ilike('plate',plate.trim()); (data||[]).forEach(r=>{if(!results.find(x=>x.vehicle?.plate===r.plate)) results.push({vehicle_id:r.id,vehicle:r,confidence:60,match_type:'plate_visual'})}) }
    results.sort((a,b)=>b.confidence-a.confidence)
    return json({ matches:results, total:results.length })
  }
 
  if (req.method === 'POST' && path.endsWith('/suspend')) {
    const { pursuit_id, reason } = await req.json()
    await supabase.from('vehicle_pursuits').update({ status:'suspended', last_updated:new Date().toISOString() }).eq('id',pursuit_id)
    return json({ ok:true })
  }
 
  return json({ error:'Not found' }, 404)
}
 
function json(data, status=200) { return new Response(JSON.stringify(data), { status, headers:{'Content-Type':'application/json'} }) }
export const config = { path: '/api/shadow-mesh/*' }
