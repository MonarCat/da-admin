// POST /api/verify-vehicle
// Ported from the old (never actually deployed) Netlify function -- same
// logic, adapted to Vercel's (req, res) signature.
import { createClient } from '@supabase/supabase-js';

// Accept either name: the old Netlify functions used
// SUPABASE_DATABASE_URL, newer code expects SUPABASE_URL. Support both so a
// mismatch in Vercel's configured env var names doesn't crash the function.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_DATABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Lazy client: constructing this at module scope with a missing/undefined
// URL throws immediately on cold start, crashing the whole invocation with
// an opaque FUNCTION_INVOCATION_FAILED before any of our own error handling
// runs. Build it inside the handler instead, after checking config exists.
let supabase = null;
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return supabase;
}

const VALID_ACTIONS = ['verified', 'rejected', 'flagged', 'under_review'];
const ALLOWED_ROLES = ['admin', 'super_admin', 'government', 'fleet_manager'];

const STATUS_MESSAGES = {
  verified: 'Your vehicle has been verified and is now active on the D.A network.',
  rejected: 'Your vehicle registration was rejected.',
  flagged: 'Your vehicle has been flagged for review.',
  under_review: 'Your vehicle is under review by our team.',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: 'Missing server configuration: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set on Vercel' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorised' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: adminProfile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single();

  if (!adminProfile || !ALLOWED_ROLES.includes(adminProfile.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { vehicle_id, action, note } = req.body || {};
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id required' });
  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` });
  }

  try {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('verification_status, plate, owner_id')
      .eq('id', vehicle_id)
      .single();

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    await supabase.from('vehicles').update({
      verification_status: action,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      verification_note: note || null,
    }).eq('id', vehicle_id);

    await supabase.from('verification_log').insert({
      vehicle_id,
      admin_id: user.id,
      action,
      note: note || null,
      previous_status: vehicle.verification_status,
    });

    await supabase.from('notifications').insert({
      type: 'vehicle_status_update',
      title: `${vehicle.plate} - ${action.replace('_', ' ').toUpperCase()}`,
      body: STATUS_MESSAGES[action] + (note ? ` Note: ${note}` : ''),
      vehicle_id,
      from_user_id: user.id,
      to_role: 'driver',
    });

    await supabase.from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('vehicle_id', vehicle_id)
      .eq('type', 'vehicle_registered');

    return res.status(200).json({
      ok: true,
      action,
      vehicle_plate: vehicle.plate,
      admin: adminProfile.full_name,
    });
  } catch (e) {
    console.error('verify-vehicle error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

export const config = { path: '/api/verify-vehicle' };
