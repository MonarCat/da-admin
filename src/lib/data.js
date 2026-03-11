// Vehicle status display config
export const STATUS = {
  moving:  { color:'#00ff9d', bg:'rgba(0,255,157,0.1)',  label:'MOVING',  dot:'🟢' },
  parked:  { color:'#ffc82c', bg:'rgba(255,200,44,0.1)', label:'PARKED',  dot:'🟡' },
  stalled: { color:'#ff8c00', bg:'rgba(255,140,0,0.1)',  label:'STALLED', dot:'🟠' },
  sos:     { color:'#ff2d44', bg:'rgba(255,45,68,0.12)', label:'SOS',     dot:'🔴' },
  offline: { color:'#2a4055', bg:'rgba(42,64,85,0.1)',   label:'OFFLINE', dot:'⚫' },
}

export function timeSince(d) {
  if (!d) return '—'
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  return `${Math.floor(s/3600)}h ago`
}

// 8 Nairobi demo vehicles
export const MOCK = [
  { id:'v1', plate:'KCA 001X', make:'Toyota', model:'Noah',     year:2019, color:'Silver', tier:'premium',    status:'moving',  lat:-1.2864, lng:36.8172, speed:87,  heading:45,  fuel:68, engine:true,  locked:true,  autopilot:false, bt:true,  route:'Thika Road',     hops:2, seen:new Date().toISOString(),            owner:{name:'James Omondi',  phone:'+254712345678'} },
  { id:'v2', plate:'KBZ 442K', make:'Nissan', model:'X-Trail',  year:2021, color:'White',  tier:'premium',    status:'sos',     lat:-1.3041, lng:36.8260, speed:0,   heading:0,   fuel:12, engine:true,  locked:false, autopilot:false, bt:false, route:'Mombasa Road',   hops:1, seen:new Date().toISOString(),            owner:{name:'Mary Wanjiku',  phone:'+254723456789'}, msg:'Flat tyre, need help!' },
  { id:'v3', plate:'KDG 218A', make:'Subaru', model:'Forester', year:2018, color:'Black',  tier:'free',       status:'parked',  lat:-1.2921, lng:36.8219, speed:0,   heading:180, fuel:55, engine:false, locked:true,  autopilot:false, bt:false, route:'CBD',            hops:3, seen:new Date(Date.now()-300000).toISOString(), owner:{name:'Peter Kamau',   phone:'+254734567890'} },
  { id:'v4', plate:'KCJ 731F', make:'Toyota', model:'Prado',    year:2020, color:'Blue',   tier:'fleet',      status:'moving',  lat:-1.2755, lng:36.8095, speed:62,  heading:270, fuel:80, engine:true,  locked:true,  autopilot:false, bt:true,  route:'Ngong Road',     hops:2, seen:new Date().toISOString(),            owner:{name:'Grace Achieng', phone:'+254745678901'} },
  { id:'v5', plate:'KDD 904C', make:'Mazda',  model:'CX-5',     year:2022, color:'Red',    tier:'premium',    status:'moving',  lat:-1.2989, lng:36.8340, speed:104, heading:90,  fuel:43, engine:true,  locked:true,  autopilot:true,  bt:true,  route:'Uhuru Highway',  hops:1, seen:new Date().toISOString(),            owner:{name:'Samuel Mutua',  phone:'+254756789012'} },
  { id:'v6', plate:'KBT 556M', make:'Honda',  model:'CR-V',     year:2017, color:'Grey',   tier:'free',       status:'stalled', lat:-1.3200, lng:36.7980, speed:0,   heading:135, fuel:5,  engine:false, locked:true,  autopilot:false, bt:false, route:'Langata Road',   hops:4, seen:new Date(Date.now()-720000).toISOString(), owner:{name:'Diana Njeri',   phone:'+254767890123'} },
  { id:'v7', plate:'KCF 882T', make:'VW',     model:'Tiguan',   year:2023, color:'White',  tier:'fleet',      status:'moving',  lat:-1.2690, lng:36.8450, speed:75,  heading:30,  fuel:91, engine:true,  locked:true,  autopilot:false, bt:true,  route:'Outer Ring Rd',  hops:2, seen:new Date().toISOString(),            owner:{name:'Brian Otieno',  phone:'+254778901234'} },
  { id:'v8', plate:'KDA 119P', make:'Toyota', model:'Hilux',    year:2020, color:'Navy',   tier:'government', status:'moving',  lat:-1.3120, lng:36.8510, speed:91,  heading:200, fuel:70, engine:true,  locked:true,  autopilot:false, bt:false, route:'Eastern Bypass', hops:3, seen:new Date().toISOString(),            owner:{name:'Fatuma Hassan', phone:'+254789012345'} },
]

export function simulate(vehicles) {
  return vehicles.map(v => {
    if (v.status !== 'moving') return v
    const r = (v.heading * Math.PI) / 180
    const step = (v.speed / 111000 / 3600) * 2.5
    return {
      ...v,
      lat: v.lat + Math.cos(r) * step + (Math.random() - 0.5) * 0.00008,
      lng: v.lng + Math.sin(r) * step + (Math.random() - 0.5) * 0.00008,
      speed: Math.max(20, Math.min(130, v.speed + (Math.random() - 0.5) * 5)),
      seen: new Date().toISOString(),
    }
  })
}
