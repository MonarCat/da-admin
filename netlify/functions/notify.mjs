import { createClient } from '@supabase/supabase-js'

export default async (req) => {
  const url = Netlify.env.get('SUPABASE_DATABASE_URL')
  const key = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return json({ error: 'Not configured' }, 503)

  const supabase = createClient(url, key)

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const { vehicle_id, owner_id } = await req.json()
    if (!vehicle_id || !owner_id) return json({ error: 'Missing fields' }, 400)

    // Fetch vehicle + owner details for the notification body
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('plate, make, model, year, color, registration_category')
      .eq('id', vehicle_id)
      .single()

    const { data: owner } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', owner_id)
      .single()

    if (!vehicle || !owner) return json({ error: 'Not found' }, 404)

    const catLabel = {
      private: 'Private', government: 'Government', diplomat: 'Diplomat',
      police: 'Police', military: 'KDF', psv: 'PSV', ngo: 'NGO',
      foreign: 'Foreign', commercial: 'Commercial',
    }[vehicle.registration_category] || vehicle.registration_category

    await supabase.from('notifications').insert({
      type:         'vehicle_registered',
      title:        `New vehicle: ${vehicle.plate}`,
      body:         `${owner.full_name} (${owner.phone || 'no phone'}) registered a ${vehicle.year || ''} ${vehicle.make} ${vehicle.model} — ${catLabel}`,
      vehicle_id,
      from_user_id: owner_id,
      to_role:      'admin',
    })

    return json({ ok: true })
  } catch (e) {
    console.error('notify error:', e.message)
    return json({ error: e.message }, 500)
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  })
}

export const config = { path: '/api/notify' }
