// src/lib/vehicleConfig.js
export const STATUS_CONFIG = {
  moving:  { color: '#00ff9d', bgColor: 'rgba(0,255,157,0.1)', icon: '🚗', label: 'MOVING' },
  parked:  { color: '#ffc82c', bgColor: 'rgba(255,200,44,0.1)', icon: '🚙', label: 'PARKED' },
  stalled: { color: '#ffc82c', bgColor: 'rgba(255,200,44,0.08)', icon: '⚠️', label: 'STALLED' },
  sos:     { color: '#ff2d44', bgColor: 'rgba(255,45,68,0.12)', icon: '🚨', label: 'SOS' },
  offline: { color: '#2a4055', bgColor: 'rgba(42,64,85,0.1)', icon: '⚫', label: 'OFFLINE' },
}

export function getTimeSince(dateStr) {
  if (!dateStr) return 'N/A'
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}
