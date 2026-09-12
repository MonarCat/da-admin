// POST /api/telemetry
// Real ingestion endpoint for the physical dongle / device. Not a phone
// session -- authenticated purely by a per-vehicle device_token issued at
// registration, since a headless device can't hold a Supabase user session.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALID_STATUS = ['moving', 'parked', 'stalled', 'sos', 'offline'];

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing server configuration' });
  }

  const authHeader = req.headers['authorization'] || '';
  const deviceToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!deviceToken) return res.status(401).json({ error: 'Missing device token' });

  // The token itself resolves the vehicle -- the device never needs to know
  // or send its own vehicle_id/plate, which keeps a stolen payload useless
  // without the token, and keeps device firmware trivial.
  const { data: vehicle, error: vErr } = await supabase
    .from('vehicles')
    .select('id, plate, is_active')
    .eq('device_token', deviceToken)
    .maybeSingle();

  if (vErr || !vehicle) return res.status(401).json({ error: 'Invalid device token' });
  if (!vehicle.is_active) return res.status(403).json({ error: 'Vehicle inactive' });

  const { lat, lng, speed, heading, accuracy, altitude, status, fuel_level } = req.body || {};
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng (numbers) required' });
  }

  const now = new Date().toISOString();
  const safeStatus = VALID_STATUS.includes(status) ? status : (speed > 3 ? 'moving' : 'parked');

  const { error: tErr } = await supabase.from('vehicle_telemetry').insert({
    vehicle_id: vehicle.id,
    lat, lng,
    latitude: lat, longitude: lng,
    speed: speed ?? 0,
    heading: heading ?? 0,
    altitude: altitude ?? null,
    fuel_level: fuel_level ?? null,
    status: safeStatus,
    recorded_at: now,
    last_seen: now,
  });
  if (tErr) return res.status(500).json({ error: 'Telemetry insert failed', detail: tErr.message });

  // Update the live vehicle row directly so admin/owner Realtime
  // subscriptions (which watch `vehicles`, not `vehicle_telemetry`) fire
  // immediately -- don't depend on a DB trigger existing.
  await supabase.from('vehicles').update({
    lat, lng, speed: speed ?? 0, heading: heading ?? 0,
    vehicle_status: safeStatus, last_seen: now,
  }).eq('id', vehicle.id);

  return res.status(200).json({ success: true, plate: vehicle.plate, server_time: now });
}

export const config = { path: '/api/telemetry' };
