import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

export function useVehicles() {
  const [vehicles, setVehicles]         = useState([])
  const [selectedVehicle, setSelected]  = useState(null)
  const [sosAlerts, setSosAlerts]       = useState([])
  const [commandLog, setCommandLog]     = useState([])
  const [loading, setLoading]           = useState(true)
  const channelRef = useRef(null)

  const networkStats = {
    active:  vehicles.length,
    moving:  vehicles.filter(v => v.status === 'moving').length,
    parked:  vehicles.filter(v => v.status === 'parked').length,
    sos:     sosAlerts.length,
    offline: vehicles.filter(v => v.status === 'offline').length,
  }

  useEffect(() => {
    loadAll()

    // Realtime — listen to all vehicle changes
    channelRef.current = supabase
      .channel('admin-vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_events' }, loadSOS)
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  async function loadAll() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          owner:profiles(full_name, phone, role)
        `)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })

      if (!error && data) {
        setVehicles(data)
        setSosAlerts(data.filter(v => v.status === 'sos'))
      }
    } catch {}
    setLoading(false)
  }

  async function loadSOS() {
    try {
      const { data } = await supabase
        .from('sos_events')
        .select('*, vehicle:vehicles(plate, make, model)')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
      if (data) setSosAlerts(data)
    } catch {}
  }

  async function issueCommand(vehicleId, command, params = {}) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ vehicle_id: vehicleId, command, params })
      })
      const result = await res.json()
      setCommandLog(prev => [{
        id: Date.now(),
        vehicle_id: vehicleId,
        command,
        status: res.ok ? 'sent' : 'failed',
        timestamp: new Date().toISOString(),
        ...result
      }, ...prev].slice(0, 50))
      return result
    } catch (e) {
      setCommandLog(prev => [{
        id: Date.now(), vehicle_id: vehicleId, command,
        status: 'error', error: e.message, timestamp: new Date().toISOString()
      }, ...prev].slice(0, 50))
    }
  }

  async function resolveSOS(sosId) {
    try {
      await supabase
        .from('sos_events')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', sosId)
      await loadSOS()
    } catch {}
  }

  return {
    vehicles, loading, networkStats,
    selectedVehicle, setSelectedVehicle: setSelected,
    sosAlerts, commandLog,
    issueCommand, resolveSOS,
    refresh: loadAll,
  }
}
