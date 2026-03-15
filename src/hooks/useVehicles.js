import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { DEMO_VEHICLES } from '../utils/vehicleOptions.js'
 
export function useVehicles(isDemo = false) {
  const [vehicles, setVehicles]        = useState([])
  const [selectedVehicle, setSelected] = useState(null)
  const [sosAlerts, setSosAlerts]      = useState([])
  const [commandLog, setCommandLog]    = useState([])
  const [loading, setLoading]          = useState(true)
  const channelRef = useRef(null)
 
  const status = v => v.vehicle_status || v.status
  const networkStats = {
    active: vehicles.length, moving: vehicles.filter(v=>status(v)==='moving').length,
    parked: vehicles.filter(v=>status(v)==='parked').length, sos: sosAlerts.length,
    offline: vehicles.filter(v=>status(v)==='offline').length,
  }
 
  useEffect(() => {
    if (isDemo) {
      setVehicles(DEMO_VEHICLES)
      setSosAlerts(DEMO_VEHICLES.filter(v => v.vehicle_status === 'sos'))
      setLoading(false); return
    }
    loadAll()
    channelRef.current = supabase.channel('admin-vehicles-feed')
      .on('postgres_changes', { event:'*', schema:'public', table:'vehicles' }, loadAll)
      .on('postgres_changes', { event:'*', schema:'public', table:'sos_events' }, loadSOS)
      .subscribe(s => console.log('Vehicles channel:', s))
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [isDemo])
 
  async function loadAll() {
    try {
      const { data, error } = await supabase.from('vehicles')
        .select('*, owner:profiles!owner_id(full_name, phone, role)')
        .eq('is_active', true).order('updated_at', { ascending: false })
      if (!error && data) { setVehicles(data); setSosAlerts(data.filter(v => status(v)==='sos')) }
    } catch {} finally { setLoading(false) }
  }
 
  async function loadSOS() {
    try {
      const { data } = await supabase.from('sos_events').select('*, vehicle:vehicles(plate,make,model)')
        .eq('resolved', false).order('created_at', { ascending: false })
      if (data) setSosAlerts(data)
    } catch {}
  }
 
  async function issueCommand(vehicleId, command, params = {}) {
    if (isDemo) {
      const e = { id:Date.now(), vehicle_id:vehicleId, command, status:'demo-sent', timestamp:new Date().toISOString(), note:'Demo mode' }
      setCommandLog(prev => [e, ...prev].slice(0,50)); return e
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/command', {
        method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session?.access_token}` },
        body: JSON.stringify({ vehicle_id:vehicleId, command, params })
      })
      const result = await res.json()
      setCommandLog(prev => [{ id:Date.now(), vehicle_id:vehicleId, command, status:res.ok?'sent':'failed', timestamp:new Date().toISOString(), ...result }, ...prev].slice(0,50))
      return result
    } catch(e) { setCommandLog(prev => [{ id:Date.now(), vehicle_id:vehicleId, command, status:'error', error:e.message, timestamp:new Date().toISOString() }, ...prev].slice(0,50)) }
  }
 
  async function resolveSOS(sosId) {
    if (isDemo) { setSosAlerts(prev => prev.filter(s => s.id !== sosId)); return }
    try { await supabase.from('sos_events').update({ resolved:true, resolved_at:new Date().toISOString() }).eq('id', sosId); await loadSOS() } catch {}
  }
 
  return { vehicles, loading, networkStats, selectedVehicle, setSelectedVehicle:setSelected, sosAlerts, commandLog, issueCommand, resolveSOS, refresh: isDemo ? ()=>{} : loadAll }
}
