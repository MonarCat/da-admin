import React, { useEffect, useRef } from 'react'
import { STATUS } from '../../lib/data.js'

let L = null

export default function LiveMap({ vehicles, selected, onSelect }) {
  const mapRef  = useRef(null)
  const inst    = useRef(null)
  const markers = useRef({})
  const lines   = useRef([])

  useEffect(() => {
    if (inst.current || !mapRef.current) return
    if (window.L) { L = window.L; boot(); return }
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    s.onload = () => { L = window.L; boot() }
    document.head.appendChild(s)
    return () => { inst.current?.remove(); inst.current = null }
  }, [])

  function boot() {
    if (!mapRef.current || !L) return
    const map = L.map(mapRef.current, { center: [-1.2921, 36.8219], zoom: 12 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(map)
    inst.current = map
    vehicles.forEach(v => put(map, v))
  }

  useEffect(() => {
    if (!inst.current || !L) return
    vehicles.forEach(v => put(inst.current, v))
    Object.keys(markers.current).forEach(id => {
      if (!vehicles.find(v => v.id === id)) { markers.current[id].remove(); delete markers.current[id] }
    })
    lines.current.forEach(l => l.remove()); lines.current = []
    mesh(inst.current, vehicles)
  }, [vehicles])

  useEffect(() => {
    if (!inst.current || !L) return
    vehicles.forEach(v => {
      if (markers.current[v.id]) markers.current[v.id].setIcon(icon(v, selected?.id === v.id))
    })
  }, [selected])

  useEffect(() => {
    if (inst.current && selected?.lat && selected?.lng) {
      inst.current.panTo([selected.lat, selected.lng], { animate: true, duration: 0.8 })
    }
  }, [selected?.id])

  function icon(v, sel) {
    if (!L) return null
    const s   = STATUS[v.status] || STATUS.offline
    const sz  = sel ? 52 : 38
    const sos = v.status === 'sos'
    const html = `
      <div style="width:${sz}px;height:${sz}px;position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;
          border:${sel ? '2' : '1.5'}px solid ${s.color};
          background:${s.bg};
          box-shadow:0 0 ${sel ? '20' : '8'}px ${s.color}60;
          ${sos ? 'animation:sosPulse 0.7s ease-in-out infinite;' : ''}"></div>
        <div style="position:absolute;inset:-8px;border-radius:50%;
          border:1px solid ${s.color};opacity:0.18;
          animation:ripple ${sos ? '0.7' : '2.5'}s ease-out infinite;"></div>
        ${(v.speed > 0) ? `
          <div style="position:absolute;top:-5px;left:50%;
            transform:translateX(-50%) rotate(${v.heading || 0}deg);
            width:0;height:0;
            border-left:3px solid transparent;
            border-right:3px solid transparent;
            border-bottom:8px solid ${s.color};opacity:0.9;"></div>` : ''}
        <div style="position:relative;z-index:1;font-size:${sel ? '17' : '13'}px;line-height:1;">${s.dot}</div>
        <div style="position:absolute;top:calc(100% + 4px);left:50%;
          transform:translateX(-50%);
          background:rgba(2,7,13,0.95);
          border:1px solid ${sel ? s.color : 'rgba(10,31,51,0.9)'};
          border-radius:3px;padding:1px 6px;
          font-family:'Share Tech Mono',monospace;font-size:8px;
          white-space:nowrap;letter-spacing:1px;pointer-events:none;
          color:${sel ? s.color : '#b8ccd8'};">${v.plate}</div>
      </div>`
    return L.divIcon({ html, className: 'da-marker', iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] })
  }

  function put(map, v) {
    if (!L || !v.lat || !v.lng) return
    const sel = selected?.id === v.id
    if (markers.current[v.id]) {
      markers.current[v.id].setLatLng([v.lat, v.lng])
      markers.current[v.id].setIcon(icon(v, sel))
    } else {
      const m = L.marker([v.lat, v.lng], {
        icon: icon(v, sel),
        zIndexOffset: v.status === 'sos' ? 1000 : 0
      })
      m.on('click', () => onSelect(v))
      m.addTo(map)
      markers.current[v.id] = m
    }
  }

  function mesh(map, vs) {
    if (!L) return
    vs.filter(v => v.status === 'moving').forEach((v1, i, arr) => {
      arr.filter((_, j) => j !== i)
        .sort((a, b) =>
          Math.hypot(a.lat - v1.lat, a.lng - v1.lng) -
          Math.hypot(b.lat - v1.lat, b.lng - v1.lng)
        )
        .slice(0, 2)
        .forEach(v2 => {
          const l = L.polyline(
            [[v1.lat, v1.lng], [v2.lat, v2.lng]],
            { color: '#00d4ff', weight: 0.7, opacity: 0.1, dashArray: '5 5' }
          )
          l.addTo(map); lines.current.push(l)
        })
    })
    vs.filter(v => v.status === 'sos').forEach(sos => {
      vs.filter(v => v.id !== sos.id).slice(0, 3).forEach(v => {
        const l = L.polyline(
          [[sos.lat, sos.lng], [v.lat, v.lng]],
          { color: '#ff2d44', weight: 1, opacity: 0.3, dashArray: '4 4' }
        )
        l.addTo(map); lines.current.push(l)
      })
    })
  }

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div className="grid-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }} />
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <div className="scanlines scan-beam" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 800 }} />

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 12, left: 10, zIndex: 500,
        background: 'rgba(2,7,13,0.92)', border: '1px solid var(--border)',
        borderRadius: '5px', padding: '8px 10px',
      }}>
        {Object.entries(STATUS).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: v.color, boxShadow: `0 0 4px ${v.color}` }} />
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: 'var(--tdim)', letterSpacing: 1 }}>{v.label}</span>
          </div>
        ))}
      </div>

      {/* Mesh node count */}
      <div style={{
        position: 'absolute', bottom: 12, right: 50, zIndex: 500,
        background: 'rgba(2,7,13,0.92)', border: '1px solid var(--border)',
        borderRadius: '4px', padding: '5px 10px',
        fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: 'var(--tdim)',
      }}>
        📡 {vehicles.filter(v => v.status !== 'offline').length} MESH NODES
      </div>
    </div>
  )
}
