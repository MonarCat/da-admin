// src/hooks/useAdminVehicles.js
// Real-time vehicle state — powered by Supabase subscriptions

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useAdminVehicles() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [sosAlerts, setSosAlerts] = useState([])
  const [commandLog, setCommandLog] = useState([])
  const [networkStats, setNetworkStats] = useState({
    total: 0, active: 0, moving: 0, sos: 0, avg_mesh_hops: 0
  })
  const channelRef = useRef(null)
  const sosChannelRef = useRef(null)

  // ── Initial fetch ──────────────────────────────────────────
  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch('/api/vehicles')
      const data = await res.json()
      if (data.vehicles) {
        setVehicles(data.vehicles)
        computeStats(data.vehicles)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSOS = useCallback(async () => {
    try {
      const res = await fetch('/api/sos')
      const data = await res.json()
      setSosAlerts(data.sos_events || [])
    } catch {}
  }, [])

  const fetchCommandLog = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('vehicle_commands')
        .select('*, vehicle:vehicles(plate), issued_by:profiles(full_name,role)')
        .order('issued_at', { ascending: false })
        .limit(30)
      setCommandLog(data || [])
    } catch {}
  }, [])

  // ── Real-time subscriptions ────────────────────────────────
  useEffect(() => {
    fetchVehicles()
    fetchSOS()
    fetchCommandLog()

    // Subscribe to all telemetry changes
    channelRef.current = supabase
      .channel('admin-telemetry')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vehicle_telemetry' },
        (payload) => {
          setVehicles(prev => {
            const updated = prev.map(v =>
              v.id === payload.new.vehicle_id
                ? { ...v, ...payload.new }
                : v
            )
            computeStats(updated)
            // Keep selected in sync
            if (selectedVehicle?.id === payload.new.vehicle_id) {
              setSelectedVehicle(s => ({ ...s, ...payload.new }))
            }
            return updated
          })
        }
      )
      .subscribe()

    // Subscribe to new SOS events
    sosChannelRef.current = supabase
      .channel('admin-sos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sos_events' },
        (payload) => {
          setSosAlerts(prev => [payload.new, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sos_events' },
        (payload) => {
          setSosAlerts(prev =>
            prev.map(s => s.id === payload.new.id ? payload.new : s)
              .filter(s => !s.is_resolved)
          )
        }
      )
      .subscribe()

    // Subscribe to command status updates
    supabase
      .channel('admin-commands')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_commands' },
        () => fetchCommandLog()
      )
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
      sosChannelRef.current?.unsubscribe()
    }
  }, [])

  // ── Stats ──────────────────────────────────────────────────
  function computeStats(v) {
    const total = v.length
    const active = v.filter(x => x.status !== 'offline').length
    const moving = v.filter(x => x.status === 'moving').length
    const sos = v.filter(x => x.status === 'sos').length
    const avgHops = v.reduce((a, x) => a + (x.mesh_hops || 0), 0) / (total || 1)
    setNetworkStats({ total, active, moving, sos, avg_mesh_hops: avgHops.toFixed(1) })
  }

  // ── Command issuer ─────────────────────────────────────────
  const issueCommand = useCallback(async (vehicleId, commandType, payload = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const res = await fetch('/api/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ vehicle_id: vehicleId, command_type: commandType, payload }),
    })

    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Command failed')

    await fetchCommandLog()
    return result
  }, [fetchCommandLog])

  // ── SOS resolution ─────────────────────────────────────────
  const resolveSOS = useCallback(async (sosId, notes) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/sos', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ sos_id: sosId, response_notes: notes }),
    })
    if (res.ok) fetchSOS()
  }, [fetchSOS])

  return {
    vehicles,
    loading,
    error,
    selectedVehicle,
    setSelectedVehicle,
    sosAlerts,
    commandLog,
    networkStats,
    issueCommand,
    resolveSOS,
    refresh: fetchVehicles,
  }
}

// ── useCommandIssuance — per-vehicle command state ─────────────
export function useCommandIssuance(issueCommand) {
  const [pendingCommand, setPendingCommand] = useState(null)
  const [commandResult, setCommandResult] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)

  const requestCommand = useCallback((vehicleId, commandType, payload, label, isDangerous = false) => {
    if (isDangerous) {
      setConfirmDialog({ vehicleId, commandType, payload, label })
    } else {
      executeCommand(vehicleId, commandType, payload)
    }
  }, [])

  const executeCommand = useCallback(async (vehicleId, commandType, payload = {}) => {
    setPendingCommand(commandType)
    setCommandResult(null)
    try {
      const result = await issueCommand(vehicleId, commandType, payload)
      setCommandResult({ success: true, message: result.message })
    } catch (e) {
      setCommandResult({ success: false, message: e.message })
    } finally {
      setPendingCommand(null)
      setTimeout(() => setCommandResult(null), 4000)
    }
  }, [issueCommand])

  const confirmCommand = useCallback(() => {
    if (confirmDialog) {
      executeCommand(confirmDialog.vehicleId, confirmDialog.commandType, confirmDialog.payload)
      setConfirmDialog(null)
    }
  }, [confirmDialog, executeCommand])

  return {
    pendingCommand,
    commandResult,
    confirmDialog,
    requestCommand,
    confirmCommand,
    cancelConfirm: () => setConfirmDialog(null),
  }
}
