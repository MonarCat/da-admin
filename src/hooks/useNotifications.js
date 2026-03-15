import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
 
export function useNotifications(isDemo = false) {
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread]               = useState(0)
  const channelRef                        = useRef(null)
 
  useEffect(() => {
    if (isDemo) {
      const demo = [
        { id:'dn-1', type:'vehicle_registered', title:'New vehicle: KCA 001X', body:'Demo Driver registered a 2019 Toyota Fielder (Private)', read:false, created_at:new Date(Date.now()-60000).toISOString(), vehicle:{ plate:'KCA 001X', make:'Toyota', model:'Fielder', year:2019, color:'Silver', registration_category:'private' }, from_user:{ full_name:'Demo Driver', phone:'+254 700 000 001', role:'driver' } },
        { id:'dn-2', type:'vehicle_registered', title:'New vehicle: KBZ 442K', body:'Demo Driver 2 registered a 2020 Nissan X-Trail (Private)', read:false, created_at:new Date(Date.now()-3600000).toISOString(), vehicle:{ plate:'KBZ 442K', make:'Nissan', model:'X-Trail', year:2020, color:'Black', registration_category:'private' }, from_user:{ full_name:'Demo Driver 2', phone:'+254 700 000 002', role:'driver' } },
      ]
      setNotifications(demo); setUnread(2); return
    }
    load()
    channelRef.current = supabase.channel('admin-notif-feed')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications' },
        payload => { if (payload.new.to_role === 'admin') enrichAndPrepend(payload.new) })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'notifications' }, load)
      .subscribe(s => console.log('Notifications channel:', s))
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [isDemo])
 
  async function load() {
    try {
      const { data, error } = await supabase.from('notifications')
        .select('*, vehicle:vehicles(plate,make,model,year,color,registration_category,plate_format_valid,verification_status), from_user:profiles!from_user_id(full_name,phone,role)')
        .eq('to_role', 'admin').order('created_at', { ascending:false }).limit(100)
      if (!error && data) { setNotifications(data); setUnread(data.filter(n=>!n.read).length) }
    } catch(e) { console.error('Notifications load:', e.message) }
  }
 
  async function enrichAndPrepend(raw) {
    try {
      const { data } = await supabase.from('notifications')
        .select('*, vehicle:vehicles(plate,make,model,year,color,registration_category,plate_format_valid,verification_status), from_user:profiles!from_user_id(full_name,phone,role)')
        .eq('id', raw.id).single()
      if (data) { setNotifications(prev => [data, ...prev.filter(n=>n.id!==data.id)]); setUnread(prev => prev+1) }
    } catch {}
  }
 
  async function markRead(id) {
    if (isDemo) { setNotifications(prev => prev.map(n => n.id===id ? {...n,read:true} : n)); setUnread(prev=>Math.max(0,prev-1)); return }
    await supabase.from('notifications').update({ read:true, read_at:new Date().toISOString() }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id===id ? {...n,read:true} : n))
    setUnread(prev => Math.max(0, prev-1))
  }
 
  async function markAllRead() {
    if (isDemo) { setNotifications(prev=>prev.map(n=>({...n,read:true}))); setUnread(0); return }
    await supabase.from('notifications').update({ read:true, read_at:new Date().toISOString() }).eq('to_role','admin').eq('read',false)
    setNotifications(prev=>prev.map(n=>({...n,read:true}))); setUnread(0)
  }
 
  return { notifications, unread, markRead, markAllRead, reload: load }
}
