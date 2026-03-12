import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  Netlify.env.get('SUPABASE_DATABASE_URL'),
  Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
)

export default async (req) => {
  const path = new URL(req.url).pathname

  if (req.method === 'GET' && path.endsWith('/me')) {
    try {
      const token = req.headers.get('authorization')?.replace('Bearer ', '')
      if (!token) return json({ error: 'No token' }, 401)

      const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
      if (userErr || !user) return json({ error: 'Invalid token' }, 401)

      // Get profile without joining organizations (in case table is missing)
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profErr || !profile) {
        // Auto-create profile if missing
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

        if (createErr) return json({ error: 'Profile error: ' + createErr.message }, 500)
        return json({ user, profile: newProfile })
      }

      // Try to fetch org separately — skip silently if organizations table missing
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

export const config = {
  path: '/api/auth/*'
}
