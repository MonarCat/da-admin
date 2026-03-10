// src/components/map/AdminMap.jsx
import React, { useEffect, useRef } from 'react'

const STATUS_CONFIG = {
  moving:  { color: '#00ff9d', icon: '🚗', label: 'MOVING' },
  parked:  { color: '#ffc82c', icon: '🚙', label: 'PARKED' },
  stalled: { color: '#ffc82c', icon: '⚠️', label: 'STALLED' },
  sos:     { color: '#ff2d44', icon: '🚨', label: 'SOS' },
  offline: { color: '#2a4055', icon: '⚫', label: 'OFFLINE' },
}

let L = null

export default function AdminMap({ vehicles, selectedVehicle, onVehicleSelect }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const linesRef = useRef([])

  useEffect(() => {
    if (mapInstanceRef.current) return
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => { L = window.L; initMap() }
    document.head.appendChild(script)
    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
    }
  }, [])

  function initMap() {
    if (!mapRef.current || !L) return
    const map = L.map(mapRef.current, { center: [-1.2921, 36.8219], zoom: 12, zoomControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(map)
    mapInstanceRef.current = map
    vehicles.forEach(v => addMarker(map, v))
  }

  useEffect(() => {
    if (!mapInstanceRef.current || !L) return
    vehicles.forEach(v => addMarker(mapInstanceRef.current, v))
    Object.keys(markersRef.current).forEach(id => {
      if (!vehicles.find(v => v.id === id)) { markersRef.current[id].remove(); delete markersRef.current[id] }
    })
    linesRef.current.forEach(l => l.remove()); linesRef.current = []
    drawLines(mapInstanceRef.current, vehicles)
  }, [vehicles])

  useEffect(() => {
    if (!mapInstanceRef.current || !L) return
    vehicles.forEach(v => {
      if (markersRef.current[v.id]) markersRef.current[v.id].setIcon(createIcon(v, selectedVehicle?.id === v.id))
    })
  }, [selectedVehicle])

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedVehicle) return
    mapInstanceRef.current.panTo([selectedVehicle.lat, selectedVehicle.lng], { animate: true, duration: 0.8 })
  }, [selectedVehicle?.id])

  function createIcon(v, isSelected) {
    if (!L) return
    const cfg = STATUS_CONFIG[v.status] || STATUS_CONFIG.offline
    const size = isSelected ? 54 : 38
    const html = `
      <div style="width:${size}px;height:${size}px;position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="
          position:absolute;inset:0;border-radius:50%;
          border:${isSelected ? '2px' : '1.5px'} solid ${cfg.color};
          background:${cfg.color}15;
          box-shadow:0 0 ${isSelected ? '20px' : '8px'} ${cfg.color}60;
          ${v.status === 'sos' ? 'animation:sosPulse 0.7s ease-in-out infinite;' : ''}
        "></div>
        <div style="
          position:absolute;inset:-7px;border-radius:50%;
          border:1px solid ${cfg.color};opacity:0.2;
          animation:ripple ${v.status === 'sos' ? '0.7' : '2.5'}s ease-out infinite;
        "></div>
        <span style="font-size:${isSelected ? '16px' : '13px'};position:relative;z-index:1;">${cfg.icon}</span>
        <div style="
          position:absolute;top:calc(100% + 4px);left:50%;transform:translateX(-50%);
          background:rgba(2,7,13,0.95);border:1px solid ${isSelected ? cfg.color : 'var(--border,#0a1f33)'};
          border-radius:3px;padding:1px 6px;
          font-family:'Share Tech Mono',monospace;font-size:8px;white-space:nowrap;
          color:${isSelected ? cfg.color : '#b8ccd8'};letter-spacing:1px;pointer-events:none;
        ">${v.plate}</div>
        ${v.speed > 0 ? `<div style="position:absolute;top:-3px;left:50%;transform:translateX(-50%) rotate(${v.heading||0}deg);width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-bottom:7px solid ${cfg.color};opacity:0.7;"></div>` : ''}
      </div>`
    return L.divIcon({ html, className: 'da-vehicle-marker', iconSize: [size, size], iconAnchor: [size/2, size/2] })
  }

  function addMarker(map, v) {
    if (!L || !v.lat || !v.lng) return
    const isSelected = selectedVehicle?.id === v.id
    if (markersRef.current[v.id]) {
      markersRef.current[v.id].setLatLng([v.lat, v.lng])
      markersRef.current[v.id].setIcon(createIcon(v, isSelected))
    } else {
      const m = L.marker([v.lat, v.lng], { icon: createIcon(v, isSelected), zIndexOffset: v.status === 'sos' ? 1000 : 0 })
      m.on('click', () => onVehicleSelect(v))
      m.addTo(map)
      markersRef.current[v.id] = m
    }
  }

  function drawLines(map, vehicles) {
    if (!L) return
    const active = vehicles.filter(v => v.status === 'moving')
    active.forEach((v1, i) => {
      active.filter((_, j) => j !== i)
        .sort((a, b) => Math.hypot(a.lat - v1.lat, a.lng - v1.lng) - Math.hypot(b.lat - v1.lat, b.lng - v1.lng))
        .slice(0, 2)
        .forEach(v2 => {
          const l = L.polyline([[v1.lat, v1.lng], [v2.lat, v2.lng]], { color: '#00d4ff', weight: 0.6, opacity: 0.1, dashArray: '5 5' })
          l.addTo(map); linesRef.current.push(l)
        })
    })
    vehicles.filter(v => v.status === 'sos').forEach(sos => {
      vehicles.filter(v => v.id !== sos.id).slice(0, 3).forEach(v => {
        const l = L.polyline([[sos.lat, sos.lng], [v.lat, v.lng]], { color: '#ff2d44', weight: 1, opacity: 0.3, dashArray: '4 4' })
        l.addTo(map); linesRef.current.push(l)
      })
    })
  }

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div className="grid-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }} />
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <div className="scanlines scan-beam" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 800 }} />
      <div style={{
        position: 'absolute', bottom: '12px', left: '10px',
        background: 'rgba(2,7,13,0.9)', border: '1px solid var(--border)',
        borderRadius: '5px', padding: '8px 10px', zIndex: 500,
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: v.color, boxShadow: `0 0 4px ${v.color}` }} />
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '8px', color: 'var(--text-dim)', letterSpacing: '1px' }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
