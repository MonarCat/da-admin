import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

export function useTelemetry(user, vehicles, isDemo) {
  const intervalRef = useRef(null)
  const watchRef    = useRef(null)
  const posRef      = useRef(null)

  useEffect(() => {
    // Only run for real authenticated users with at least one verified vehicle
    if (isDemo || !user?.id || user.id === 'demo') return
    if (!vehicles?.length) return
    if (!navigator.geolocation) return

    const verifiedVehicles = vehicles.filter(v => v.verification_status === 'verified')
    if (!verifiedVehicles.length) return

    // Watch position continuously
    watchRef.current = navigator.geolocation.watchPosition(
      pos => { posRef.current = pos },
      err => console.warn('GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    )

    // Push to Supabase every 5 seconds
    intervalRef.current = setInterval(async () => {
      if (!posRef.current) return
      const { latitude: lat, longitude: lng, speed, heading } = posRef.current.coords

      // Update all verified vehicles owned by this user
      for (const vehicle of verifiedVehicles) {
        await supabase
          .from('vehicles')
          .update({
            lat,
            lng,
            speed:        speed != null ? Math.round(speed * 3.6) : 0, // m/s → km/h
            heading:      heading || 0,
            vehicle_status: speed && speed > 1 ? 'moving' : 'parked',
            last_seen:    new Date().toISOString(),
          })
          .eq('id', vehicle.id)
          .eq('owner_id', user.id) // safety guard
      }
    }, 5000)

    return () => {
      if (watchRef.current)    navigator.geolocation.clearWatch(watchRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user?.id, vehicles?.length, isDemo])
}
