import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

export function useNotifications(isDemo = false) {
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread]               = useState(0)
  const channelRef                        = useRef(null)

  useEffect(() => {
    if (isDemo) {
      const demoNotifs = [
        {
          id: 'dn-1', type: 'vehicle_registered',
          title: 'New vehicle: KCA 001X',
          body: 'Demo Driver registered a 2019 Toyota Fielder (Private) — awaiting verification',
          read: false, created_at: new Date(Date.now() - 60000).toISOString(),
          vehicle_id: 'demo-1',
          vehicle: { plate:'KCA 001X', make:'Toyota', model:'Fielder', year:2019, color:'Silver', registration_category:'private' },
          from_user: { full_name:'Demo Driver', phone:'+254 700 000 001', role:'driver' },
        },
        {
          id: 'dn-2', type: 'vehicle_registered',
          title: 'New vehicle: KBZ 442K',
          body: 'Demo Driver 2 registered a 2020 Nissan X-Trail (Private) — awaiting verification',
          read: false, created_at: new Date(Date.now() - 3600000).toISOString(),
          vehicle_id: 'demo-2',
          vehicle: { plate:'KBZ 442K', make:'Nissan', model:'X-Trail', year:2020, color:'Black', registration_category:'private' },
          from_user: { full_name:'Demo Driver 2', phone:'+254 700 000 002', role:'driver' },
        },
      ]
      setNotifications(demoNotifs)
      setUnread(2)
      return
    }

    // Load existing notifications immediately
    load()

    // Realtime — no filter on channel, filter in handler
    // Filtering on the channel itself causes missed events in some Supabase versions
    channelRef.current = supabase
      .channel('admin-notif-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new
          if (n.to_role !== 'admin') return  // only admin-targeted
          // Enrich with joined data then prepend
          enrichAndPrepend(n)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        () => load()  // reload on any update (read status changes)
      )
      .subscribe((status) => {
        console.log('Notifications channel:', status)
      })

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [isDemo])

  async function load() {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          vehicle:vehicles(
            plate, make, model, year, color,
            registration_category, plate_format_valid, verification_status
          ),
          from_user:profiles!from_user_id(full_name, phone, role)
        `)
        .eq('to_role', 'admin')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Notifications load error:', error.message)
        return
      }

      setNotifications(data || [])
      setUnread((data || []).filter(n => !n.read).length)
    } catch (e) {
      console.error('Notifications exception:', e)
    }
  }

  // Enrich a raw realtime payload with joined data then prepend to list
  async function enrichAndPrepend(raw) {
    try {
      const { data } = await supabase
        .from('notifications')
        .select(`
          *,
          vehicle:vehicles(
            plate, make, model, year, color,
            registration_category, plate_format_valid, verification_status
          ),
          from_user:profiles!from_user_id(full_name, phone, role)
        `)
        .eq('id', raw.id)
        .single()

      if (data) {
        setNotifications(prev => [data, ...prev.filter(n => n.id !== data.id)])
        if (!data.read) setUnread(prev => prev + 1)
      }
    } catch (e) {
      console.error('Enrich notification error:', e)
    }
  }

  async function markRead(notificationId) {
    if (isDemo) {
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n))
      setUnread(prev => Math.max(0, prev - 1))
      return
    }
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
      if (error) { console.error('markRead error:', error.message); return }
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n))
      setUnread(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error('markRead exception:', e)
    }
  }

  async function markAllRead() {
    if (isDemo) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnread(0)
      return
    }
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('to_role', 'admin')
        .eq('read', false)
      if (error) { console.error('markAllRead error:', error.message); return }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnread(0)
    } catch (e) {
      console.error('markAllRead exception:', e)
    }
  }

  return { notifications, unread, markRead, markAllRead, reload: load }
}
