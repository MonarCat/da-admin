# Dashboard.jsx patch — add Users tab

## 1. Add import at top of Dashboard.jsx
```js
import UserManagement from '../components/auth/UserManagement.jsx'
```

## 2. Update VIEWS array — add users entry
```js
const VIEWS = [
  { id: 'map',   label: 'LIVE MAP',  icon: <Map size={13}/> },
  { id: 'fleet', label: 'FLEET',     icon: <List size={13}/> },
  { id: 'sos',   label: 'SOS',       icon: <AlertTriangle size={13}/> },
  { id: 'stats', label: 'NETWORK',   icon: <Activity size={13}/> },
  { id: 'users', label: 'USERS',     icon: <Users size={13}/> },   // ADD THIS
]
```

## 3. Add Users import from lucide-react
Change:
```js
import { Map, List, AlertTriangle, Activity, Eye, LogOut, Cpu } from 'lucide-react'
```
To:
```js
import { Map, List, AlertTriangle, Activity, Eye, LogOut, Cpu, Users } from 'lucide-react'
```

## 4. Add Users view in the center section (after NetworkStats line)
Add after:
```jsx
{view === 'stats' && <NetworkStats stats={stats} vehicles={vehicles} />}
```

Add:
```jsx
{view === 'users' && <UserManagement currentUser={user} session={session} />}
```

## 5. Update Dashboard props to accept session
Change:
```js
export default function Dashboard({ user, onSignOut }) {
```
To:
```js
export default function Dashboard({ user, session, onSignOut }) {
```
