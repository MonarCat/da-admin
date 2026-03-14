import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useFleets(profile, isDemo = false) {
  const [fleets, setFleets]   = useState([])
  const [loading, setLoading] = useState(true)

  const isSuperAdmin = profile?.role === 'super_admin'

  useEffect(() => {
    if (isDemo) {
      setFleets([
        { id:'demo-fleet-1', name:'D.A Master Fleet', type:'super_admin', vehicle_count:8, member_count:1 },
        { id:'demo-fleet-2', name:'Nairobi City County', type:'government', vehicle_count:3, member_count:2 },
      ])
      setLoading(false)
      return
    }
    if (profile?.id) load()
  }, [profile?.id, isDemo])

  async function load() {
    try {
      let query = supabase
        .from('fleets')
        .select(`
          *,
          vehicle_count:vehicles(count),
          member_count:fleet_members(count),
          owner:profiles!owner_id(full_name, role)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      // Super admin sees all fleets, others see only their own
      if (!isSuperAdmin) {
        query = query.eq('owner_id', profile.id)
      }

      const { data, error } = await query
      if (error) throw error
      setFleets(data || [])
    } catch (e) {
      console.error('useFleets load error:', e.message)
    } finally {
      setLoading(false)
    }
  }

  async function createFleet({ name, type, description }) {
    const { data, error } = await supabase
      .from('fleets')
      .insert({
        name, type, description,
        owner_id: profile.id,
        is_active: true,
      })
      .select()
      .single()
    if (error) throw error
    await load()
    return data
  }

  async function assignVehicleToFleet(vehicleId, fleetId) {
    const { error } = await supabase
      .from('vehicles')
      .update({ fleet_id: fleetId })
      .eq('id', vehicleId)
    if (error) throw error
    await load()
  }

  async function removeVehicleFromFleet(vehicleId) {
    const { error } = await supabase
      .from('vehicles')
      .update({ fleet_id: null })
      .eq('id', vehicleId)
    if (error) throw error
    await load()
  }

  return { fleets, loading, createFleet, assignVehicleToFleet, removeVehicleFromFleet, reload: load }
}
