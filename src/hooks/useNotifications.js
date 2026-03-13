import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

export function useNotifications(isDemo = false) {
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread]               = useState(0)
  const channelRef = useRef(null)

  useEffect(() => {
    if (isDemo) {
      // Demo notifications
      const demoNotifs = [
        { id:'dn-1', type:'vehicle_registered', title:'New vehicle: KCA 001X', body:'Demo Driver registered a 2019 Toyota Fielder — Private', read:false, created_at: new Date(Date.now()-60000).toISOString(), vehicle_id:'demo-1' },
        { id:'dn-2', type:'vehicle_registered', title:'New vehicle: KBZ 442K', body:'Demo Driver 2 registered a 2020 Nissan X-Trail — Private', read:true,  created_at: new Date(Date.now()-3600000).toISOString(), vehicle_id:'demo-2' },
      ]
      setNotifications(demoNotifs)
      setUnread(demoNotifs.filter(n => !n.read).length)
      return
    }

    loadNotifications()

    // Real-time — new notification comes in instantly
    channelRef.current = supabase
      .channel('admin-notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: 'to_role=eq.admin'
      }, payload => {
        setNotifications(prev => [payload.new, ...prev])
        setUnread(prev => prev + 1)
      })
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [isDemo])

  async function loadNotifications() {
    try {
      const { data } = await supabase
        .from('notifications')
        .select(`
          *,
          vehicle:vehicles(plate, make, model, year, color, registration_category, plate_format_valid),
          from_user:profiles!from_user_id(full_name, phone, role)
        `)
        .eq('to_role', 'admin')
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) {
        setNotifications(data)
        setUnread(data.filter(n => !n.read).length)
      }
    } catch {}
  }

  async function markRead(notificationId) {
    if (isDemo) {
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ))
      setUnread(prev => Math.max(0, prev - 1))
      return
    }
    try {
      await supabase.from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ))
      setUnread(prev => Math.max(0, prev - 1))
    } catch {}
  }

  async function markAllRead() {
    if (isDemo) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnread(0)
      return
    }
    try {
      await supabase.from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('to_role', 'admin').eq('read', false)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnread(0)
    } catch {}
  }

  return { notifications, unread, markRead, markAllRead, reload: loadNotifications }
}
