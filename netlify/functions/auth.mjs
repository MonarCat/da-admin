import { createClient } from '@supabase/supabase-js'

export default async (req) => {
  // Guard — if env vars missing, return clear error instead of 502
  const url = Netlify.env.get('SUPABASE_DATABASE_URL')
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!url || !key) {
    return json({
      error: 'Supabase env vars not configured on this Netlify site',
      hint: 'Add SUPABASE_DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify → Site configuration → Environment variables'
    }, 503)
  }

  const supabase = createClient(url, key)
  const path = new URL(req.url).pathname

  if (req.method === 'GET' && path.endsWith('/me')) {
    try {
      const token = req.headers.get('authorization')?.replace('Bearer ', '')
      if (!token) return json({ error: 'No token' }, 401)

      const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
      if (userErr || !user) return json({ error: 'Invalid token' }, 401)

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profErr || !profile) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
        const { data: newProfile, error: createErr } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: name,
            phone: user.user_metadata?.phone || null,
            role: 'driver',
            is_active: true,
            clearance_level: 1,
            avatar_initials: name[0].toUpperCase(),
          })
          .select()
          .single()
        if (createErr) return json({ error: createErr.message }, 500)
        return json({ user, profile: newProfile })
      }

      // Try org — skip silently if table missing
      let org = null
      if (profile.org_id) {
        try {
          const { data } = await supabase
            .from('organizations')
            .select('name, type, license_tier')
            .eq('id', profile.org_id)
            .single()
          org = data
        } catch {}
      }

      return json({ user, profile: { ...profile, org } })

    } catch (e) {
      console.error('/api/auth/me error:', e.message)
      return json({ error: e.message }, 500)
    }
  }

  return json({ error: 'Not found' }, 404)
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config = { path: '/api/auth/*' }
