import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

const L = window.L;
const SC = { active: '#00FF8A', tracking: '#00FF8A', moving: '#00FF8A', standby: '#FF8C00', inactive: '#FF8C00', parked: '#FF8C00', offline: '#FF3838', denied: '#FF3838', sos: '#FF3838' };

function divIcon(color, selected = false) {
  const s = selected ? 12 : 8;
  return L.divIcon({
    html: `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${color};border:1px solid ${color};box-shadow:0 0 ${selected ? 10 : 4}px ${color}${selected ? '' : '40'};"></div>`,
    className: '',
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
  });
}

function getLat(v) {
  return v.latitude ?? v.lat;
}

function getLng(v) {
  return v.longitude ?? v.lng;
}

export default function TacticalMap({ selectedVehicle }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const markers = useRef({});
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!L || !mapRef.current || mapInst.current) return undefined;
    const map = L.map(mapRef.current, { center: [-1.286389, 36.817223], zoom: 12, zoomControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB', subdomains: 'abcd', maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInst.current = map;

    async function loadPos() {
      const { data } = await supabase
        .from('vehicles')
        .select('id,plate,plate_number,status,vehicle_status,latitude,longitude,lat,lng,owner_name,speed')
        .or('latitude.not.is.null,lat.not.is.null');
      if (!data) return;

      const valid = data.filter((v) => getLat(v) != null && getLng(v) != null);
      setCount(valid.length);
      valid.forEach((v) => {
        const status = v.status || v.vehicle_status;
        const color = SC[status] ?? '#FF3838';
        const cs = (v.plate_number ?? v.plate ?? v.id.slice(0, 8)).replace(/\s/g, '').toUpperCase();
        const popup = `<div style="font-family:'Share Tech Mono',monospace;font-size:11px;background:#040D0A;color:#00C896;padding:8px;min-width:150px;line-height:1.8;">
          <div style="color:#00FF8A;font-weight:700;">${cs}</div>
          <div style="color:#3A7A5A;">STATUS: <span style="color:${color};">${(status ?? 'UNKNOWN').toUpperCase()}</span></div>
          ${v.owner_name ? `<div style="color:#3A7A5A;">OP: ${v.owner_name.toUpperCase()}</div>` : ''}
          ${v.speed != null ? `<div style="color:#3A7A5A;">SPEED: ${v.speed} KM/H</div>` : ''}
        </div>`;
        const lat = getLat(v);
        const lng = getLng(v);
        if (markers.current[v.id]) {
          markers.current[v.id].setLatLng([lat, lng]).setIcon(divIcon(color, selectedVehicle?.id === v.id));
        } else {
          markers.current[v.id] = L.marker([lat, lng], { icon: divIcon(color, selectedVehicle?.id === v.id) }).bindPopup(popup).addTo(mapInst.current);
        }
      });
    }

    loadPos();
    const iv = setInterval(loadPos, 30000);
    return () => {
      clearInterval(iv);
      map.remove();
      mapInst.current = null;
    };
  }, []);

  useEffect(() => {
    const lat = getLat(selectedVehicle ?? {});
    const lng = getLng(selectedVehicle ?? {});
    if (lat == null || lng == null || !mapInst.current) return;
    mapInst.current.flyTo([lat, lng], 15, { duration: 1.2 });
  }, [selectedVehicle]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', borderRight: '1px solid #0B2A1C' }}>
      <div className="tac-panel-header" style={{ borderRadius: 0 }}>
        <span>TACTICAL GRID  //  NAIROBI METRO</span>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#00FF8A' }}>● LIVE — {count} UNITS</span>
      </div>
      <div ref={mapRef} style={{ flex: 1 }} />
    </div>
  );
}
