import { supabase } from '../lib/supabase.js';

export async function queryAgent({ messages, context }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const res = await fetch('/api/ai-agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Operator-UUID': user.id,
    },
    body: JSON.stringify({ messages, context }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Agent request failed');
  }

  return res.json();
}
