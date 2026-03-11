import React from 'react'

const STATUS_COLOR = {
  pending:  'var(--accent)',
  sent:     'var(--yellow)',
  executed: 'var(--green)',
  failed:   'var(--red)',
}

export default function CommandLog({ commands }) {
  return (
    <div style={{ height: 152, borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 3, color: 'var(--tdim)' }}>COMMAND LOG</span>
        {commands.some(c => c.status === 'pending') && (
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 5px var(--accent)', animation: 'pulse 1.2s infinite' }}/>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '3px 8px' }}>
        {commands.length === 0 && (
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, color: 'var(--tdim)', textAlign: 'center', padding: '20px 0', letterSpacing: 2 }}>NO COMMANDS ISSUED</div>
        )}
        {commands.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 3px', borderRadius: 3, animation: c.status==='pending'?'cmdPend 1.4s infinite':'none' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_COLOR[c.status] || 'var(--tdim)', flexShrink: 0 }}/>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: 'var(--tmid)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.plate} · {c.cmdType?.replace(/_/g,' ').toUpperCase()}
            </span>
            <span style={{ fontSize: 8, color: STATUS_COLOR[c.status] || 'var(--tdim)', flexShrink: 0 }}>{c.status?.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
