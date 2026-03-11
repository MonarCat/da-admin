import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { MOCK, simulate } from '../lib/data.js'

export function useVehicles() {
  const [vehicles, setVehicles] = useState(MOCK)
  const [selected, setSelected] = useState(null)
  const [sos, setSos]           = useState(MOCK.filter(v => v.status === 'sos'))
  const [cmdLog, setCmdLog]     = useState([])
  const [live, setLive]         = useState(false)
  const simRef = useRef(null)

  useEffect(() => {
    tryLive()
    return () => { if (simRef.current) clearInterval(simRef.current) }
  }, [])

  async function tryLive() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, owner:profiles(full_name,phone), t:vehicle_telemetry(*)')
        .eq('is_active', true)
        .limit(1)

      if (!error && data?.length) {
        // Real Supabase data available — load full fleet
        await loadLiveFleet()
        return
      }
    } catch {}
    // Fall back to mock simulation
    startSim()
  }

  async function loadLiveFleet() {
    const { data } = await supabase
      .from('vehicles')
      .select('*, owner:profiles(full_name,phone), t:vehicle_telemetry(*)')
      .eq('is_active', true)
    if (!data) return startSim()

    const flat = data.map(v => ({
      ...v,
      ...(v.t?.[0] || {}),
      t: undefined,
      owner: { name: v.owner?.full_name, phone: v.owner?.phone }
    }))
    setVehicles(flat)
    setSos(flat.filter(v => v.status === 'sos'))
    setLive(true)

    // Realtime subscription
    supabase.channel('telemetry')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vehicle_telemetry' }, p => {
        setVehicles(prev => prev.map(v => v.id === p.new.vehicle_id ? { ...v, ...p.new } : v))
        setSelected(s => s?.id === p.new.vehicle_id ? { ...s, ...p.new } : s)
      })
      .subscribe()

    supabase.channel('sos-ins')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_events' }, p => {
        setSos(prev => [p.new, ...prev])
      })
      .subscribe()
  }

  function startSim() {
    simRef.current = setInterval(() => {
      setVehicles(prev => {
        const next = simulate(prev)
        setSelected(s => s ? (next.find(v => v.id === s.id) || s) : null)
        return next
      })
    }, 2500)
  }

  const issueCommand = useCallback(async (vehicleId, cmdType, payload = {}) => {
    const plate = vehicles.find(v => v.id === vehicleId)?.plate || vehicleId
    const entry = { id: Date.now(), plate, cmdType, status: 'pending', at: new Date().toISOString() }
    setCmdLog(prev => [entry, ...prev].slice(0, 25))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const res = await fetch('/api/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ vehicle_id: vehicleId, command_type: cmdType, payload })
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
        updateLog(entry.id, 'sent')
        return { success: true, message: result.message }
      }
    } catch {}

    // Demo mode — simulate execution after 1.8s
    setTimeout(() => updateLog(entry.id, 'executed'), 1800)
    return { success: true, message: `[DEMO] ${cmdType} sent to ${plate}` }
  }, [vehicles])

  function updateLog(id, status) {
    setCmdLog(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  const resolveSos = useCallback(id => {
    setSos(prev => prev.filter(s => s.id !== id))
    try {
      supabase.from('sos_events').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', id)
    } catch {}
  }, [])

  const stats = {
    total:  vehicles.length,
    active: vehicles.filter(v => v.status !== 'offline').length,
    moving: vehicles.filter(v => v.status === 'moving').length,
    sos:    vehicles.filter(v => v.status === 'sos').length,
  }

  return { vehicles, selected, setSelected, sos, cmdLog, live, stats, issueCommand, resolveSos }
}
