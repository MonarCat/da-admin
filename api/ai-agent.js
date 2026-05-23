import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SUPER_ADMIN_UUID = 'a7a26e70-f360-4c02-9424-a8770374a206';

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
    description: 'Recommend Shadow Mesh pursuit phase escalation (1–6). Super_admin only.',
    input_schema: {
      type: 'object',
      properties: {
        target_unit: { type: 'string' },
        recommended_phase: { type: 'number', minimum: 1, maximum: 6 },
        justification: { type: 'string' },
      },
      required: ['target_unit', 'recommended_phase', 'justification'],
    },
  },
  {
    name: 'query_unit_history',
    description: 'Retrieve movement history for a vehicle.',
    input_schema: {
      type: 'object',
      properties: {
        unit_id: { type: 'string' },
        hours_back: { type: 'number', default: 24 },
      },
      required: ['unit_id'],
    },
  },
];

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing server configuration' });
  }

  const operatorUUID = req.headers['x-operator-uuid'];
  if (!operatorUUID) return res.status(401).json({ error: 'Missing X-Operator-UUID header' });

  let clearanceLevel = 1;
  let role = 'operator';
  const { data: profile } = await supabase
    .from('profiles')
    .select('clearance_level, role')
    .eq('id', operatorUUID)
    .single();
  if (profile) {
    clearanceLevel = profile.clearance_level ?? 1;
    role = profile.role ?? role;
  }

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
Super_admin: ${operatorUUID === SUPER_ADMIN_UUID ? 'YES' : 'NO'}

[OPERATOR QUERY]
${typeof last.content === 'string' ? last.content : JSON.stringify(last.content)}`,
      };
    }
  }

  const tools = clearanceLevel >= 10 ? [...BASE_TOOLS, ...SHADOW_TOOLS] : BASE_TOOLS;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: augmented,
    });

    return res.status(200).json({
      content: response.content,
      stop_reason: response.stop_reason,
      usage: response.usage,
      clearance: clearanceLevel,
    });
  } catch (err) {
    console.error('[ai-agent]', err.message);
    return res.status(500).json({ error: 'AI agent unavailable', detail: err.message });
  }
}
