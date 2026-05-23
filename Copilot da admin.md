# COPILOT PROMPT — MonarCat/da-admin
**Live URL:** https://da-admin-beige.vercel.app
**Supabase:** wklhcmaodxatavuoduhd.supabase.co
**Super_admin UUID:** a7a26e70-f360-4c02-9424-a8770374a206
**Stack:** Vite 5 + React 18 (ESM "type":"module"), Tailwind CSS 3, @supabase/supabase-js
**Routing:** State-based via `view` variable in Dashboard.jsx — NO react-router-dom. Do not add it.
**Fonts already in index.html:** Orbitron · Share Tech Mono · Rajdhani · Exo 2
**Leaflet CSS already in index.html:** unpkg.com/leaflet@1.9.4

---

## ABSOLUTE RULES
1. No react-router-dom. No useNavigate. Routing is `view` state only.
2. ESM throughout — use `import`/`export default`, never `require()`.
3. Never hardcode secrets. ANTHROPIC_API_KEY and SUPABASE_SERVICE_ROLE_KEY are server-side env vars (no VITE_ prefix).
4. Do not touch netlify.toml or netlify/functions/ — legacy, leave as-is.
5. The 002_auth_schema.sql is already applied. Do not re-run it.
6. Status colours are fixed constants — use exactly these everywhere:
   TRACKING/ONLINE → #00FF8A | STANDBY → #FF8C00 | OFFLINE/DENIED → #FF3838
   DIM TEXT → #3A7A5A | PANEL SURFACE → #020806 | BORDER → #0B2A1C | APP BG → #040D0A
7. Fonts: Orbitron (logos/titles) · Share Tech Mono (all monospace/terminal) · Rajdhani (labels) · Exo 2 (body). No others.
8. Leaflet is loaded globally via index.html script tag. Access as window.L. Do NOT import it from npm.
9. clearance_level in profiles table is 1–10. Super_admin = 10.

---

## TASK 1 — vercel.json (repo root)

Create this file. Without it, the /api directory is not recognised as serverless functions
and any direct URL navigation returns 404 on Vercel.

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)",     "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin",  "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type,Authorization,X-Operator-UUID" }
      ]
    }
  ]
}
```

---

## TASK 2 — Install @anthropic-ai/sdk

```bash
npm install @anthropic-ai/sdk
```

Commit the updated package.json and package-lock.json.

---

## TASK 3 — api/ai-agent.js (Vercel serverless function)

File path: api/ai-agent.js in the repo root (not inside src/).
Vercel auto-detects files in api/ as serverless functions.

```javascript
// api/ai-agent.js
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
        unit_id:      { type: 'string', description: 'Vehicle plate number or ID' },
        anomaly_type: { type: 'string', enum: ['convoy','route_deviation','signal_loss','speed_anomaly','geofence_breach'] },
        confidence:   { type: 'number', description: '0.0 to 1.0' },
        notes:        { type: 'string' }
      },
      required: ['unit_id','anomaly_type','confidence']
    }
  }
];

const SHADOW_TOOLS = [
  {
    name: 'escalate_shadow_mesh',
    description: 'Recommend Shadow Mesh pursuit phase escalation (1–6). Super_admin only.',
    input_schema: {
      type: 'object',
      properties: {
        target_unit:       { type: 'string' },
        recommended_phase: { type: 'number', minimum: 1, maximum: 6 },
        justification:     { type: 'string' }
      },
      required: ['target_unit','recommended_phase','justification']
    }
  },
  {
    name: 'query_unit_history',
    description: 'Retrieve movement history for a vehicle.',
    input_schema: {
      type: 'object',
      properties: {
        unit_id:    { type: 'string' },
        hours_back: { type: 'number', default: 24 }
      },
      required: ['unit_id']
    }
  }
];

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const operatorUUID = req.headers['x-operator-uuid'];
  if (!operatorUUID) return res.status(401).json({ error: 'Missing X-Operator-UUID header' });

  // Fetch clearance_level from profiles — use service role to bypass RLS
  let clearanceLevel = 1;
  const { data: profile } = await supabase
    .from('profiles')
    .select('clearance_level, role')
    .eq('id', operatorUUID)
    .single();
  if (profile) clearanceLevel = profile.clearance_level ?? 1;

  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Augment last user message with live operational context
  let augmented = [...messages];
  if (context && augmented.length > 0) {
    const last = augmented[augmented.length - 1];
    if (last.role === 'user') {
      augmented[augmented.length - 1] = {
        ...last,
        content: `[SYSTEM CONTEXT]
Active units: ${context.activeUnits ?? 'unknown'}
Anomalies flagged: ${context.anomalyCount ?? 0}
Shadow Mesh phase: ${context.meshPhase ?? 1}
Operator clearance: L${clearanceLevel} / ${(profile?.role ?? 'operator').toUpperCase()}
Super_admin: ${operatorUUID === SUPER_ADMIN_UUID ? 'YES' : 'NO'}

[OPERATOR QUERY]
${typeof last.content === 'string' ? last.content : JSON.stringify(last.content)}`
      };
    }
  }

  const tools = clearanceLevel >= 10
    ? [...BASE_TOOLS, ...SHADOW_TOOLS]
    : BASE_TOOLS;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: augmented
    });

    return res.status(200).json({
      content:     response.content,
      stop_reason: response.stop_reason,
      usage:       response.usage,
      clearance:   clearanceLevel
    });
  } catch (err) {
    console.error('[ai-agent]', err.message);
    return res.status(500).json({ error: 'AI agent unavailable', detail: err.message });
  }
}
```

**Add in Vercel dashboard → da-admin → Settings → Environment Variables:**
```
ANTHROPIC_API_KEY          = sk-ant-...          (server only)
SUPABASE_URL               = https://wklhcmaodxatavuoduhd.supabase.co  (server only)
SUPABASE_SERVICE_ROLE_KEY  = eyJ...              (server only — never expose)
VITE_SUPABASE_URL          = https://wklhcmaodxatavuoduhd.supabase.co  (all envs)
VITE_SUPABASE_ANON_KEY     = eyJ...              (all envs)
```

**Create src/services/aiAgent.js:**
```javascript
// src/services/aiAgent.js
import { supabase } from '../lib/supabase.js'; // adjust path to your supabase client

export async function queryAgent({ messages, context }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const res = await fetch('/api/ai-agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Operator-UUID': user.id
    },
    body: JSON.stringify({ messages, context })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Agent request failed');
  }
  return res.json();
}
```

---

## TASK 4 — src/components/ShadowOpsGuard.jsx

NOT a route guard. A wrapper component used inside Dashboard.jsx's view === 'shadow-ops' branch.
Checks clearance_level from profiles table. Logs every attempt to access_log table.

```jsx
// src/components/ShadowOpsGuard.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js'; // adjust path

const SUPER_ADMIN_UUID = 'a7a26e70-f360-4c02-9424-a8770374a206';

async function logAttempt(userId, granted) {
  supabase.from('access_log').insert({
    user_id: userId,
    path: 'shadow-ops',
    granted,
    attempted_at: new Date().toISOString()
  }).then(() => {}).catch(() => {});
}

const S = {
  screen: {
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    height:'100%', minHeight:400, background:'#040D0A',
    fontFamily:"'Share Tech Mono','Courier New',monospace"
  },
  title: { fontSize:22, fontWeight:700, letterSpacing:'0.18em', color:'#00FF8A', margin:0 },
  sub:   { fontSize:11, letterSpacing:'0.1em', color:'#3A7A5A', marginTop:12 },
  btn:   {
    marginTop:28, background:'transparent', border:'1px solid #3A7A5A', color:'#00C896',
    fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:'0.12em',
    padding:'8px 20px', cursor:'pointer', borderRadius:4
  }
};

export default function ShadowOpsGuard({ children, onBack }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus('denied'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('clearance_level')
        .eq('id', user.id)
        .single();

      const granted = profile?.clearance_level >= 10 || user.id === SUPER_ADMIN_UUID;
      await logAttempt(user.id, granted);
      setStatus(granted ? 'granted' : 'denied');
    })();
  }, []);

  if (status === 'checking') return (
    <div style={S.screen}>
      <p style={S.title}>VERIFYING CLEARANCE</p>
      <p style={S.sub}>STAND BY...</p>
    </div>
  );

  if (status === 'denied') return (
    <div style={S.screen}>
      <p style={{ ...S.title, color:'#FF3838' }}>ACCESS DENIED</p>
      <p style={S.sub}>CLEARANCE LEVEL INSUFFICIENT — ATTEMPT LOGGED</p>
      {onBack && <button style={S.btn} onClick={onBack}>RETURN TO DASHBOARD</button>}
    </div>
  );

  return children;
}
```

---

## TASK 5 — Supabase: access_log table

Run in Supabase SQL Editor for project wklhcmaodxatavuoduhd:

```sql
create table if not exists access_log (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  path         text not null,
  granted      boolean not null default false,
  attempted_at timestamptz not null default now()
);

alter table access_log enable row level security;

create policy "insert own attempt"
  on access_log for insert
  with check (auth.uid() = user_id);

create policy "super_admin reads all"
  on access_log for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and clearance_level >= 10
    )
  );
```

---

## TASK 6 — src/styles/tactical.css (create new file)

```css
/* src/styles/tactical.css */
:root {
  --tac-bg:      #040D0A;
  --tac-surface: #020806;
  --tac-border:  #0B2A1C;
  --tac-dim:     #0A2218;
  --tac-green:   #00FF8A;
  --tac-mid:     #00C896;
  --tac-muted:   #3A7A5A;
  --tac-amber:   #FF8C00;
  --tac-red:     #FF3838;
  --font-display:'Orbitron', sans-serif;
  --font-mono:   'Share Tech Mono', 'Courier New', monospace;
  --font-label:  'Rajdhani', sans-serif;
  --font-body:   'Exo 2', sans-serif;
}
* { box-sizing: border-box; }
body { background: var(--tac-bg); color: var(--tac-mid); font-family: var(--font-body); margin: 0; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: var(--tac-surface); }
::-webkit-scrollbar-thumb { background: var(--tac-border); border-radius: 2px; }
@keyframes tacBlink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes tacPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
.tac-blink { animation: tacBlink 1s step-end infinite; }
.tac-classified { animation: tacPulse 1.4s ease-in-out infinite; color: var(--tac-red); }
.tac-panel { background: var(--tac-surface); border: 1px solid var(--tac-border); border-radius: 4px; }
.tac-panel-header {
  font-family: var(--font-label); font-size: 10px; letter-spacing: 0.14em;
  color: var(--tac-muted); text-transform: uppercase;
  border-bottom: 1px solid var(--tac-border); padding: 6px 10px;
  display: flex; justify-content: space-between; align-items: center;
}
.tac-btn {
  background: transparent; border: 1px solid var(--tac-border); color: var(--tac-mid);
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.12em;
  padding: 4px 12px; cursor: pointer; border-radius: 3px; text-transform: uppercase;
}
.tac-btn:hover { border-color: var(--tac-green); color: var(--tac-green); }
.tac-btn.danger { border-color: var(--tac-red); color: var(--tac-red); }
/* Leaflet tactical overrides */
.leaflet-container { background: #020806 !important; }
.leaflet-tile { filter: brightness(0.4) saturate(0.3) hue-rotate(120deg); }
.leaflet-popup-content-wrapper {
  background: #040D0A !important; color: #00C896 !important;
  border: 1px solid #0B2A1C !important; border-radius: 3px !important;
  font-family: 'Share Tech Mono', monospace !important; font-size: 11px !important;
}
.leaflet-popup-tip { background: #040D0A !important; }
```

**Import in src/main.jsx** — add after existing imports:
```javascript
import './styles/tactical.css';
```

**Check index.html** — if Leaflet JS script is missing, add before </body>:
```html
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV/XN/WLs=" crossorigin=""></script>
```

---

## TASK 7 — src/components/tactical/TacticalHeader.jsx

```jsx
// src/components/tactical/TacticalHeader.jsx
import { useEffect, useState } from 'react';

const NAV_VIEWS = [
  { id:'map',   label:'LIVE MAP' },
  { id:'fleet', label:'FLEET'    },
  { id:'sos',   label:'SOS'      },
  { id:'stats', label:'NETWORK'  },
  { id:'users', label:'USERS'    },
];
const SHADOW_VIEW = { id:'shadow-ops', label:'SHADOW OPS' };

export default function TacticalHeader({ user, profile, view, setView, onSignOut }) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(
      [new Date().getHours(), new Date().getMinutes(), new Date().getSeconds()]
        .map(v => String(v).padStart(2,'0')).join(':')
    );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isSuperAdmin = profile?.clearance_level >= 10;
  const navItems = isSuperAdmin ? [...NAV_VIEWS, SHADOW_VIEW] : NAV_VIEWS;

  return (
    <div style={{ background:'#020806', borderBottom:'1px solid #0B2A1C', padding:'0 14px', display:'flex', alignItems:'stretch', justifyContent:'space-between', height:52, flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <div>
          <div style={{ fontFamily:'Orbitron,sans-serif', fontSize:13, fontWeight:700, letterSpacing:'0.18em', color:'#00FF8A' }}>[ D·A ] DRIVE ASSISTANT</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:'0.1em', color:'#3A7A5A', marginTop:1 }}>TACTICAL OPERATIONS CENTER  //  v2.4.1-ALPHA</div>
        </div>
        <div style={{ display:'flex', alignItems:'stretch', height:'100%' }}>
          {navItems.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              background:'transparent', border:'none',
              borderBottom: view===v.id
                ? `2px solid ${v.id==='shadow-ops'?'#FF3838':'#00FF8A'}`
                : '2px solid transparent',
              color: view===v.id
                ? (v.id==='shadow-ops'?'#FF3838':'#00FF8A')
                : (v.id==='shadow-ops'?'#7A3A3A':'#3A7A5A'),
              fontFamily:"'Rajdhani',sans-serif", fontSize:11, fontWeight:600,
              letterSpacing:'0.1em', padding:'0 14px', cursor:'pointer', textTransform:'uppercase'
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div className="tac-classified" style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, fontWeight:700, letterSpacing:'0.14em' }}>
          ■ TOP SECRET // RESTRICTED ■
        </div>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:'0.06em', color:'#3A7A5A', marginTop:2 }}>
          {profile?.badge_number ? `BADGE: ${profile.badge_number}` : `UID: ${(user?.id??'--------').slice(0,8).toUpperCase()}…`}
          &nbsp;//&nbsp;L{profile?.clearance_level??1}&nbsp;//&nbsp;{(profile?.role??'OPERATOR').toUpperCase()}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:20, fontWeight:700, color:'#00FF8A', letterSpacing:'0.06em', lineHeight:1 }}>{time}</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:'0.08em', color:'#3A7A5A', marginTop:2 }}>NBI-LOCAL  //  MESH: ACTIVE</div>
        </div>
        <button onClick={onSignOut} className="tac-btn danger" style={{ fontSize:9, padding:'3px 10px' }}>LOGOUT</button>
      </div>
    </div>
  );
}
```

---

## TASK 8 — src/components/tactical/TacticalFooter.jsx

```jsx
// src/components/tactical/TacticalFooter.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

export default function TacticalFooter() {
  const [dbOk, setDbOk] = useState(null);
  const [sync, setSync] = useState('--:--:--');

  useEffect(() => {
    const ping = async () => {
      const { error } = await supabase.from('profiles').select('id',{count:'exact',head:true});
      setDbOk(!error);
      setSync(new Date().toTimeString().slice(0,8));
    };
    ping();
    const id = setInterval(ping, 30000);
    return () => clearInterval(id);
  }, []);

  const dot = ok => <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background: ok===null?'#3A7A5A':ok?'#00FF8A':'#FF3838', marginRight:5, verticalAlign:'middle' }} />;

  return (
    <div style={{ background:'#020806', borderTop:'1px solid #0B2A1C', padding:'5px 16px', display:'flex', alignItems:'center', gap:20, flexShrink:0 }}>
      {[
        [`SUPABASE: ${dbOk===null?'CHECKING':dbOk?'ONLINE':'ERROR'}`, dbOk],
        ['VERCEL: LIVE', true],
        ['MESH: ACTIVE', true],
      ].map(([label, ok]) => (
        <span key={label} style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:'0.09em', color:'#3A7A5A' }}>
          {dot(ok)}{label}
        </span>
      ))}
      <span style={{ marginLeft:'auto', fontFamily:"'Share Tech Mono',monospace", fontSize:9, letterSpacing:'0.08em', color:'#1A4A32' }}>
        LAST SYNC: {sync}  //  INTERVAL: 30S  //  BUILD: DA-2.4.1  //  MONARCAT
      </span>
    </div>
  );
}
```

---

## TASK 9 — src/components/tactical/UnitRoster.jsx

```jsx
// src/components/tactical/UnitRoster.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

function toCallsign(plate) {
  if (!plate) return '???';
  const p = plate.replace(/\s/g,'').toUpperCase();
  const L = p.match(/^[A-Z]+/)?.[0]??'';
  const N = p.slice(L.length).match(/\d+/)?.[0]??'';
  const S = p.slice(L.length+N.length);
  return [L,N,S].filter(Boolean).join('·');
}

const SC = { active:'#00FF8A', tracking:'#00FF8A', standby:'#FF8C00', inactive:'#FF8C00', offline:'#FF3838' };
const SL = { active:'TRACKING', tracking:'TRACKING', standby:'STANDBY', inactive:'STANDBY', offline:'OFFLINE' };
const ZONES = ['ALL','CBD','WESTLANDS','EASTLANDS','KAREN','SOUTH B','EMBAKASI'];

export default function UnitRoster({ onSelectVehicle }) {
  const [vehicles, setVehicles] = useState([]);
  const [zone, setZone] = useState('ALL');
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from('vehicles')
      .select('id,plate_number,status,zone,owner_name,last_seen')
      .order('status').limit(200);
    if (data) setVehicles(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel('unit-roster')
      .on('postgres_changes',{event:'*',schema:'public',table:'vehicles'},load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const filtered = zone==='ALL' ? vehicles : vehicles.filter(v=>(v.zone??'').toUpperCase().includes(zone));
  const counts = vehicles.reduce((a,v)=>{ const k=SL[v.status]??'OFFLINE'; a[k]=(a[k]??0)+1; return a; },{});

  return (
    <div style={{ display:'flex', flexDirection:'column', borderRight:'1px solid #0B2A1C', width:185, minWidth:185, height:'100%', background:'#040D0A' }}>
      <div className="tac-panel-header" style={{ borderRadius:0 }}>
        <span>UNIT ROSTER</span>
        <span style={{ background:'#0A2218', border:'1px solid #0B2A1C', padding:'1px 7px', borderRadius:3, fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#00C896' }}>{vehicles.length}</span>
      </div>
      <div style={{ padding:'6px 8px', borderBottom:'1px solid #0B2A1C', display:'flex', flexWrap:'wrap', gap:3 }}>
        {ZONES.map(z=>(
          <button key={z} onClick={()=>setZone(z)} style={{
            background:'transparent', cursor:'pointer',
            border:`1px solid ${z===zone?'#00FF8A':'#0B2A1C'}`,
            color: z===zone?'#00FF8A':'#3A7A5A',
            fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:'0.08em',
            padding:'2px 5px', borderRadius:2
          }}>{z}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'4px 0' }}>
        {loading ? (
          <div style={{ padding:'12px 10px', fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#3A7A5A' }}>LOADING UNITS...</div>
        ) : filtered.map(v=>{
          const color = SC[v.status]??'#FF3838';
          return (
            <div key={v.id} onClick={()=>onSelectVehicle?.(v)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 10px', cursor:'pointer', borderBottom:'1px solid #040D0A' }}
              onMouseEnter={e=>e.currentTarget.style.background='#0A2218'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}
            >
              <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color, letterSpacing:'0.04em' }}>
                <span style={{ marginRight:4, fontSize:8 }}>●</span>{toCallsign(v.plate_number)}
              </span>
              <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:9, color, letterSpacing:'0.07em', fontWeight:600 }}>
                {SL[v.status]??'OFFLINE'}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ borderTop:'1px solid #0B2A1C', padding:'8px 10px' }}>
        {[['TRACKING','#00FF8A'],['STANDBY','#FF8C00'],['OFFLINE','#FF3838']].map(([l,c])=>(
          <div key={l} style={{ display:'flex', justifyContent:'space-between', fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:c, padding:'2px 0' }}>
            <span>{l}</span><span style={{ fontWeight:700 }}>{counts[l]??0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## TASK 10 — src/components/tactical/TacticalMap.jsx

Leaflet is on window.L (loaded via index.html). Do NOT import from npm.
Uses CartoDB Dark Matter tiles. Queries vehicles table for positions.
Adjust column names (latitude/longitude) to match your actual vehicles schema.

```jsx
// src/components/tactical/TacticalMap.jsx
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

const L = window.L;
const SC = { active:'#00FF8A', tracking:'#00FF8A', standby:'#FF8C00', offline:'#FF3838' };

function divIcon(color, selected=false) {
  const s = selected?12:8;
  return L.divIcon({
    html:`<div style="width:${s}px;height:${s}px;border-radius:50%;background:${color};border:1px solid ${color};box-shadow:0 0 ${selected?10:4}px ${color}${selected?'':'40'};"></div>`,
    className:'', iconSize:[s,s], iconAnchor:[s/2,s/2]
  });
}

export default function TacticalMap({ selectedVehicle }) {
  const mapRef  = useRef(null);
  const mapInst = useRef(null);
  const markers = useRef({});
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!L || !mapRef.current || mapInst.current) return;
    const map = L.map(mapRef.current, { center:[-1.286389,36.817223], zoom:12, zoomControl:false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { attribution:'&copy; CartoDB', subdomains:'abcd', maxZoom:19 }).addTo(map);
    L.control.zoom({ position:'bottomright' }).addTo(map);
    mapInst.current = map;

    async function loadPos() {
      // IMPORTANT: adjust select columns to match your actual vehicles table schema
      const { data } = await supabase
        .from('vehicles')
        .select('id,plate_number,status,latitude,longitude,owner_name,speed')
        .not('latitude','is',null).not('longitude','is',null);
      if (!data) return;
      setCount(data.length);
      data.forEach(v => {
        const color = SC[v.status]??'#FF3838';
        const cs = (v.plate_number??v.id.slice(0,8)).replace(/\s/g,'').toUpperCase();
        const popup = `<div style="font-family:'Share Tech Mono',monospace;font-size:11px;background:#040D0A;color:#00C896;padding:8px;min-width:150px;line-height:1.8;">
          <div style="color:#00FF8A;font-weight:700;">${cs}</div>
          <div style="color:#3A7A5A;">STATUS: <span style="color:${color};">${(v.status??'UNKNOWN').toUpperCase()}</span></div>
          ${v.owner_name?`<div style="color:#3A7A5A;">OP: ${v.owner_name.toUpperCase()}</div>`:''}
          ${v.speed!=null?`<div style="color:#3A7A5A;">SPEED: ${v.speed} KM/H</div>`:''}
        </div>`;
        if (markers.current[v.id]) {
          markers.current[v.id].setLatLng([v.latitude,v.longitude]).setIcon(divIcon(color));
        } else {
          markers.current[v.id] = L.marker([v.latitude,v.longitude],{icon:divIcon(color)})
            .bindPopup(popup).addTo(mapInst.current);
        }
      });
    }
    loadPos();
    const iv = setInterval(loadPos,30000);
    return () => { clearInterval(iv); map.remove(); mapInst.current=null; };
  }, []);

  useEffect(() => {
    if (!selectedVehicle?.latitude || !mapInst.current) return;
    mapInst.current.flyTo([selectedVehicle.latitude,selectedVehicle.longitude],15,{duration:1.2});
  }, [selectedVehicle]);

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, height:'100%', borderRight:'1px solid #0B2A1C' }}>
      <div className="tac-panel-header" style={{ borderRadius:0 }}>
        <span>TACTICAL GRID  //  NAIROBI METRO</span>
        <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#00FF8A' }}>● LIVE — {count} UNITS</span>
      </div>
      <div ref={mapRef} style={{ flex:1 }} />
    </div>
  );
}
```

---

## TASK 11 — src/components/tactical/ShadowMeshTracker.jsx

```jsx
// src/components/tactical/ShadowMeshTracker.jsx
import { useState } from 'react';

const PHASES = [
  {n:1,code:'PH.1',label:'SURVEILLANCE'   },
  {n:2,code:'PH.2',label:'MONITORING'     },
  {n:3,code:'PH.3',label:'INTERCEPT READY'},
  {n:4,code:'PH.4',label:'ACTIVE PURSUIT' },
  {n:5,code:'PH.5',label:'CONTAINMENT'    },
  {n:6,code:'PH.6',label:'TERMINATION'    },
];

export default function ShadowMeshTracker({ currentPhase=1, isSuperAdmin, onEscalate }) {
  const [phase, setPhase] = useState(currentPhase);
  const cur = PHASES.find(p=>p.n===phase)??PHASES[0];

  function escalate() {
    if (!isSuperAdmin || phase>=6) return;
    const next = PHASES[phase];
    if (!window.confirm(`ESCALATE TO ${next.code}: ${next.label}?\nThis action will be logged.`)) return;
    setPhase(phase+1);
    onEscalate?.(phase+1);
  }

  return (
    <div style={{ background:'#020806', border:'1px solid #0B2A1C', borderRadius:4, padding:'8px 10px' }}>
      <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:9, letterSpacing:'0.14em', color:'#3A7A5A', marginBottom:5 }}>SHADOW MESH STATUS</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:5 }}>
        <span style={{ fontFamily:'Orbitron,sans-serif', fontSize:22, fontWeight:700, color:'#00FF8A' }}>{cur.code}</span>
        <span style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:9, letterSpacing:'0.1em', color:'#3A7A5A' }}>{cur.label}</span>
      </div>
      <div style={{ display:'flex', gap:3, marginBottom:6 }}>
        {PHASES.map(p=>(
          <div key={p.n} style={{ flex:1, height:3, borderRadius:2, background:p.n<=phase?'#00FF8A':'#0A2218' }} />
        ))}
      </div>
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:8, letterSpacing:'0.06em', color:'#3A7A5A' }}>
        ESCALATION: MANUAL  //  AUTH: SUPER_ADMIN
      </div>
      {isSuperAdmin && phase<6 && (
        <button onClick={escalate} style={{
          marginTop:8, width:'100%', background:'transparent',
          border:'1px solid #FF3838', color:'#FF3838',
          fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:'0.1em',
          padding:'4px 0', cursor:'pointer', borderRadius:3
        }}>ESCALATE → {PHASES[phase]?.code}</button>
      )}
    </div>
  );
}
```

---

## TASK 12 — src/components/tactical/AITerminal.jsx

```jsx
// src/components/tactical/AITerminal.jsx
import { useState, useRef, useEffect } from 'react';
import { queryAgent } from '../../services/aiAgent.js';

const BOOT = [
  { type:'dim',    text:'> boot sequence complete'  },
  { type:'dim',    text:'> mesh link established'   },
  { type:'active', text:'> awaiting operator query' },
];
const LC = { dim:'#2A5A42', active:'#00C896', warn:'#FF8C00', operator:'#00FF8A', error:'#FF3838' };

export default function AITerminal({ user, context }) {
  const [log, setLog]     = useState(BOOT);
  const [input, setInput] = useState('');
  const [busy, setBusy]   = useState(false);
  const [hist, setHist]   = useState([]);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}); }, [log]);

  async function submit(e) {
    e.preventDefault();
    if (!input.trim()||busy) return;
    const q = input.trim(); setInput(''); setBusy(true);
    const msg = {role:'user',content:q};
    const newHist = [...hist,msg];
    setHist(newHist);
    setLog(l=>[...l,{type:'operator',text:`> [OPERATOR] ${q}`}]);
    try {
      const res = await queryAgent({messages:newHist,context});
      const text = res.content?.find(b=>b.type==='text')?.text??'[NO RESPONSE]';
      setHist(h=>[...h,{role:'assistant',content:text}]);
      for (const line of text.split('\n').filter(l=>l.trim())) {
        await new Promise(r=>setTimeout(r,80));
        setLog(l=>[...l,{type:'active',text:`> ${line}`}]);
      }
    } catch(err) {
      setLog(l=>[...l,{type:'error',text:`> [ERROR] ${err.message}`}]);
    }
    setBusy(false);
  }

  return (
    <div style={{ background:'#020806', border:'1px solid #0B2A1C', borderRadius:4, padding:'8px 10px' }}>
      <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:9, letterSpacing:'0.12em', color:'#3A7A5A', marginBottom:5 }}>AI AGENT  //  CLAUDE SONNET</div>
      <div style={{ height:130, overflowY:'auto', fontSize:10, lineHeight:1.8 }}>
        {log.map((l,i)=>(
          <div key={i} style={{ fontFamily:"'Share Tech Mono',monospace", color:LC[l.type]??'#00C896' }}>{l.text}</div>
        ))}
        {busy && <div style={{ fontFamily:"'Share Tech Mono',monospace", color:'#00FF8A' }}>{'> '}<span className="tac-blink">█</span></div>}
        <div ref={endRef}/>
      </div>
      <form onSubmit={submit} style={{ display:'flex', gap:5, marginTop:8, borderTop:'1px solid #0B2A1C', paddingTop:6, alignItems:'center' }}>
        <span style={{ fontFamily:"'Share Tech Mono',monospace", color:'#00FF8A', fontSize:10 }}>&gt;</span>
        <input value={input} onChange={e=>setInput(e.target.value)} disabled={busy} placeholder="enter query..."
          style={{ flex:1, background:'transparent', border:'none', outline:'none', fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#00FF8A', letterSpacing:'0.04em' }}/>
        <button type="submit" disabled={busy} className="tac-btn" style={{ padding:'2px 8px', fontSize:9 }}>SEND</button>
      </form>
    </div>
  );
}
```

---

## TASK 13 — src/components/tactical/IntelFeed.jsx

```jsx
// src/components/tactical/IntelFeed.jsx
export default function IntelFeed({ vehicles=[] }) {
  const offline  = vehicles.filter(v=>v.status==='offline');
  const standby  = vehicles.filter(v=>['standby','inactive'].includes(v.status));
  const tracking = vehicles.filter(v=>['active','tracking'].includes(v.status));
  const items = [
    ...offline.map(v=>({ level:'red',   icon:'⚠', text:`SIGNAL LOST: ${v.plate_number??v.id.slice(0,8)}` })),
    ...standby.map(v=>({ level:'amber', icon:'◑', text:`STANDBY: ${v.plate_number??v.id.slice(0,8)}` })),
    { level:'green', icon:'✓', text:`MESH SYNC NOMINAL  //  ${tracking.length} TRACKING` },
  ];
  const C = { red:'#FF3838', amber:'#FF8C00', green:'#00C896' };
  return (
    <div style={{ background:'#020806', border:'1px solid #0B2A1C', borderRadius:4, padding:'8px 10px' }}>
      <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:9, letterSpacing:'0.12em', color:'#3A7A5A', marginBottom:5 }}>INTEL FEED</div>
      {items.slice(0,6).map((item,i)=>(
        <div key={i} style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:C[item.level], padding:'2px 0' }}>
          <span style={{ marginRight:6 }}>{item.icon}</span>{item.text}
        </div>
      ))}
    </div>
  );
}
```

---

## TASK 14 — src/components/tactical/OpsPanel.jsx

```jsx
// src/components/tactical/OpsPanel.jsx
import ShadowMeshTracker from './ShadowMeshTracker.jsx';
import AITerminal from './AITerminal.jsx';
import IntelFeed from './IntelFeed.jsx';

export default function OpsPanel({ user, profile, vehicles=[] }) {
  const context = {
    activeUnits:  vehicles.filter(v=>['active','tracking'].includes(v.status)).length,
    anomalyCount: 0,
    meshPhase:    1,
  };
  return (
    <div style={{ width:215, minWidth:215, height:'100%', background:'#040D0A', display:'flex', flexDirection:'column', overflowY:'auto', padding:10, gap:8 }}>
      <ShadowMeshTracker currentPhase={1} isSuperAdmin={profile?.clearance_level>=10} />
      <AITerminal user={user} context={context} />
      <IntelFeed vehicles={vehicles} />
    </div>
  );
}
```

---

## TASK 15 — src/components/tactical/ShadowOpsView.jsx

```jsx
// src/components/tactical/ShadowOpsView.jsx
import ShadowMeshTracker from './ShadowMeshTracker.jsx';
import AITerminal from './AITerminal.jsx';

export default function ShadowOpsView({ user, profile }) {
  return (
    <div style={{ height:'100%', background:'#040D0A', display:'flex', flexDirection:'column', alignItems:'center', padding:24, gap:20 }}>
      <div style={{ fontFamily:'Orbitron,sans-serif', fontSize:11, letterSpacing:'0.2em', color:'#FF3838' }}>
        ■ CLASSIFIED — SHADOW MESH COMMAND ■
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, width:'100%', maxWidth:900 }}>
        <ShadowMeshTracker currentPhase={1} isSuperAdmin={profile?.clearance_level>=10} onEscalate={p=>console.log('Phase:',p)} />
        <AITerminal user={user} context={{ meshPhase:1, activeUnits:0, anomalyCount:0 }} />
      </div>
      <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:'#3A7A5A', letterSpacing:'0.08em', textAlign:'center' }}>
        MIHU INTELLIGENCE MODULE — PENDING HARDWARE CONNECTION<br/>
        SIMULATION MODE AVAILABLE IN NEXT BUILD
      </div>
    </div>
  );
}
```

---

## TASK 16 — Wire everything into Dashboard.jsx

Add these imports at the top of Dashboard.jsx:
```jsx
import TacticalHeader  from './tactical/TacticalHeader.jsx';
import TacticalFooter  from './tactical/TacticalFooter.jsx';
import UnitRoster      from './tactical/UnitRoster.jsx';
import TacticalMap     from './tactical/TacticalMap.jsx';
import OpsPanel        from './tactical/OpsPanel.jsx';
import ShadowOpsGuard  from './ShadowOpsGuard.jsx';
import ShadowOpsView   from './tactical/ShadowOpsView.jsx';
```

Add to existing state (near other useState calls):
```jsx
const [selectedVehicle, setSelectedVehicle] = useState(null);
```

Replace the outer return with:
```jsx
return (
  <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#040D0A', overflow:'hidden' }}>
    <TacticalHeader user={user} profile={profile} view={view} setView={setView} onSignOut={onSignOut} />

    {['map','fleet','sos','stats','users'].includes(view) && (
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <UnitRoster onSelectVehicle={setSelectedVehicle} />
        <div style={{ flex:1, overflow:'auto', borderRight:'1px solid #0B2A1C' }}>
          {view==='map'   && <TacticalMap selectedVehicle={selectedVehicle} />}
          {view==='fleet' && <YourExistingFleetComponent />}
          {view==='sos'   && <YourExistingSOSComponent />}
          {view==='stats' && <YourExistingStatsComponent />}
          {view==='users' && <UserManagement currentUser={user} session={session} />}
        </div>
        <OpsPanel user={user} profile={profile} vehicles={[]} />
      </div>
    )}

    {view==='shadow-ops' && (
      <div style={{ flex:1, overflow:'hidden' }}>
        <ShadowOpsGuard onBack={()=>setView('map')}>
          <ShadowOpsView user={user} profile={profile} />
        </ShadowOpsGuard>
      </div>
    )}

    <TacticalFooter />
  </div>
);
```

Replace YourExistingFleetComponent / YourExistingSOSComponent / YourExistingStatsComponent
with the actual component names already in Dashboard.jsx. Do not rename them.

---

## ACCEPTANCE CRITERIA — da-admin
- [ ] vercel.json exists at repo root, npm run build succeeds, Vercel deploy passes
- [ ] @anthropic-ai/sdk in package.json, api/ai-agent.js responds to POST requests
- [ ] clearance_level < 10 gets BASE_TOOLS only; level 10 gets SHADOW_TOOLS
- [ ] ShadowOpsGuard shows denial screen and writes to access_log for non-super_admin
- [ ] TacticalHeader live clock ticks every second
- [ ] shadow-ops nav tab only visible when clearance_level >= 10
- [ ] UnitRoster populates from Supabase vehicles table, updates in real-time
- [ ] TacticalMap uses CartoDB dark tiles, markers are green/amber/red by status
- [ ] Clicking a roster unit pans the map to that vehicle
- [ ] AITerminal sends to /api/ai-agent, streams response line by line
- [ ] ShadowMeshTracker escalation requires confirmation, super_admin only
- [ ] TacticalFooter shows live Supabase ping status
- [ ] All existing views (fleet, sos, stats, users) still render correctly
- [ ] npm run build has zero errors
