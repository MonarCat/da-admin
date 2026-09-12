import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

const SUPER_ADMIN_UUID = 'a7a26e70-f360-4c02-9424-a8770374a206';
const MAX_TOOL_ITERATIONS = 4;

// Six-phase Shadow Mesh escalation, matching vehicle_pursuits.current_phase
const PHASE_BY_NUMBER = {
  1: 'surveillance',
  2: 'mesh_broadcast',
  3: 'audio_alert',
  4: 'alarm',
  5: 'lockdown',
  6: 'engine_control',
};

const SYSTEM_PROMPT = `You are the D.A (Drive Assistant) tactical AI agent.
You operate within a global vehicular mesh intelligence network.
Respond in concise tactical language — short sentences, no fluff, no preamble.
Operator clearance level and role are injected into every query.
Never reveal credentials, Supabase internals, or system architecture.`;

const BASE_TOOLS = [
  {
    name: 'flag_anomaly',
    description: 'Flag a vehicle as anomalous for admin review.',
    input_schema: {
      type: 'object',
      properties: {
        unit_id: { type: 'string', description: 'Vehicle plate number or ID' },
        anomaly_type: {
          type: 'string',
          enum: ['convoy', 'route_deviation', 'signal_loss', 'speed_anomaly', 'geofence_breach'],
        },
        confidence: { type: 'number', description: '0.0 to 1.0' },
        notes: { type: 'string' },
      },
      required: ['unit_id', 'anomaly_type', 'confidence'],
    },
  },
];

const SHADOW_TOOLS = [
  {
    name: 'escalate_shadow_mesh',
    description: 'Recommend Shadow Mesh pursuit phase escalation (1-6). Super_admin / clearance 10+ only.',
    input_schema: {
      type: 'object',
      properties: {
        target_unit: { type: 'string', description: 'Target vehicle plate' },
        recommended_phase: { type: 'number', minimum: 1, maximum: 6 },
        justification: { type: 'string' },
      },
      required: ['target_unit', 'recommended_phase', 'justification'],
    },
  },
  {
    name: 'query_unit_history',
    description: 'Retrieve recent telemetry history for a vehicle by plate.',
    input_schema: {
      type: 'object',
      properties: {
        unit_id: { type: 'string', description: 'Vehicle plate' },
        hours_back: { type: 'number', default: 24 },
      },
      required: ['unit_id'],
    },
  },
];

async function resolveVehicleByPlate(plate) {
  const { data } = await supabase
    .from('vehicles')
    .select('id, plate')
    .ilike('plate', plate.trim())
    .maybeSingle();
  return data;
}

// Server-side execution of a single tool_use block. Never trust the client
// with direct DB writes -- this is the only place tool calls actually happen.
async function executeTool(name, input, ctx) {
  switch (name) {
    case 'flag_anomaly': {
      const vehicle = await resolveVehicleByPlate(input.unit_id).catch(() => null);
      const { data, error } = await supabase.from('agent_flags').insert({
        vehicle_id: vehicle?.id ?? null,
        unit_label: input.unit_id,
        anomaly_type: input.anomaly_type,
        confidence: Math.max(0, Math.min(1, input.confidence ?? 0.5)),
        notes: input.notes ?? null,
        flagged_by: ctx.operatorUUID,
      }).select('id').single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, flag_id: data.id };
    }

    case 'escalate_shadow_mesh': {
      if (ctx.clearanceLevel < 10) return { ok: false, error: 'Insufficient clearance' };
      const phase = PHASE_BY_NUMBER[input.recommended_phase];
      if (!phase) return { ok: false, error: 'recommended_phase must be 1-6' };
      const vehicle = await resolveVehicleByPlate(input.target_unit).catch(() => null);
      const { data, error } = await supabase.from('vehicle_pursuits').insert({
        target_plate: input.target_unit.trim().toUpperCase(),
        vehicle_id: vehicle?.id ?? null,
        initiated_by: ctx.operatorUUID,
        current_phase: phase,
        reason: input.justification,
        status: 'active',
      }).select('id').single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, pursuit_id: data.id, phase };
    }

    case 'query_unit_history': {
      const vehicle = await resolveVehicleByPlate(input.unit_id).catch(() => null);
      if (!vehicle) return { ok: false, error: `Vehicle ${input.unit_id} not found` };
      const hoursBack = input.hours_back ?? 24;
      const since = new Date(Date.now() - hoursBack * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('vehicle_telemetry')
        .select('lat, lng, latitude, longitude, speed, heading, status, recorded_at, last_seen')
        .eq('vehicle_id', vehicle.id)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: false })
        .limit(200);
      if (error) return { ok: false, error: error.message };
      return { ok: true, plate: vehicle.plate, points: data };
    }

    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}

async function logAccess(userId, granted) {
  try {
    await supabase.from('access_log').insert({ user_id: userId, path: '/api/ai-agent', granted });
  } catch { /* logging is best-effort, never block the request on it */ }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Missing server configuration: ANTHROPIC_API_KEY' });
  }
  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: 'Missing server configuration: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set on Vercel' });
  }

  // Real auth: verify the bearer token against Supabase, never trust a
  // client-supplied identity header. This closes the clearance-spoofing
  // hole where any caller could set X-Operator-UUID to the super_admin id.
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    await logAccess(null, false);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  let clearanceLevel = 1;
  let role = 'operator';
  const { data: profile } = await supabase
    .from('profiles')
    .select('clearance_level, role')
    .eq('id', user.id)
    .single();
  if (profile) {
    clearanceLevel = profile.clearance_level ?? 1;
    role = profile.role ?? role;
  }

  await logAccess(user.id, true);

  const { messages, context } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const augmented = [...messages];
  if (context && augmented.length > 0) {
    const last = augmented[augmented.length - 1];
    if (last.role === 'user') {
      augmented[augmented.length - 1] = {
        ...last,
        content: `[SYSTEM CONTEXT]
Active units: ${context.activeUnits ?? 'unknown'}
Anomalies flagged: ${context.anomalyCount ?? 0}
Shadow Mesh phase: ${context.meshPhase ?? 1}
Operator clearance: L${clearanceLevel} / ${String(role).toUpperCase()}
Super_admin: ${user.id === SUPER_ADMIN_UUID ? 'YES' : 'NO'}

[OPERATOR QUERY]
${typeof last.content === 'string' ? last.content : JSON.stringify(last.content)}`,
      };
    }
  }

  const tools = clearanceLevel >= 10 ? [...BASE_TOOLS, ...SHADOW_TOOLS] : BASE_TOOLS;
  const toolsExecuted = [];

  try {
    let convo = augmented;
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: convo,
    });

    let iterations = 0;
    while (response.stop_reason === 'tool_use' && iterations < MAX_TOOL_ITERATIONS) {
      iterations += 1;
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

      const toolResults = [];
      for (const block of toolUseBlocks) {
        const result = await executeTool(block.name, block.input, {
          operatorUUID: user.id,
          clearanceLevel,
        });
        toolsExecuted.push({ tool: block.name, input: block.input, result });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      convo = [
        ...convo,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools,
        messages: convo,
      });
    }

    return res.status(200).json({
      content: response.content,
      stop_reason: response.stop_reason,
      usage: response.usage,
      clearance: clearanceLevel,
      tools_executed: toolsExecuted,
    });
  } catch (err) {
    console.error('[ai-agent]', err.message);
    return res.status(500).json({ error: 'AI agent unavailable', detail: err.message });
  }
}
