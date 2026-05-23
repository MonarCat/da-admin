import { useEffect, useRef, useState } from 'react';
import { queryAgent } from '../../services/aiAgent.js';

const BOOT = [
  { type: 'dim', text: '> boot sequence complete' },
  { type: 'dim', text: '> mesh link established' },
  { type: 'active', text: '> awaiting operator query' },
];
const LC = { dim: '#2A5A42', active: '#00C896', warn: '#FF8C00', operator: '#00FF8A', error: '#FF3838' };

export default function AITerminal({ context }) {
  const [log, setLog] = useState(BOOT);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  async function submit(e) {
    e.preventDefault();
    if (!input.trim() || busy) return;

    const q = input.trim();
    setInput('');
    setBusy(true);
    const msg = { role: 'user', content: q };
    const newHist = [...hist, msg];
    setHist(newHist);
    setLog((l) => [...l, { type: 'operator', text: `> [OPERATOR] ${q}` }]);
    try {
      const res = await queryAgent({ messages: newHist, context });
      const text = res.content?.find((b) => b.type === 'text')?.text ?? '[NO RESPONSE]';
      setHist((h) => [...h, { role: 'assistant', content: text }]);
      for (const line of text.split('\n').filter((lineText) => lineText.trim())) {
        await new Promise((r) => setTimeout(r, 80));
        setLog((l) => [...l, { type: 'active', text: `> ${line}` }]);
      }
    } catch (err) {
      setLog((l) => [...l, { type: 'error', text: `> [ERROR] ${err.message}` }]);
    }
    setBusy(false);
  }

  return (
    <div style={{ background: '#020806', border: '1px solid #0B2A1C', borderRadius: 4, padding: '8px 10px' }}>
      <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, letterSpacing: '0.12em', color: '#3A7A5A', marginBottom: 5 }}>AI AGENT  //  CLAUDE SONNET</div>
      <div style={{ height: 130, overflowY: 'auto', fontSize: 10, lineHeight: 1.8 }}>
        {log.map((l, i) => (
          <div key={i} style={{ fontFamily: "'Share Tech Mono',monospace", color: LC[l.type] ?? '#00C896' }}>
            {l.text}
          </div>
        ))}
        {busy && (
          <div style={{ fontFamily: "'Share Tech Mono',monospace", color: '#00FF8A' }}>
            {'> '}
            <span className="tac-blink">█</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 5, marginTop: 8, borderTop: '1px solid #0B2A1C', paddingTop: 6, alignItems: 'center' }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", color: '#00FF8A', fontSize: 10 }}>&gt;</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          placeholder="enter query..."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: '#00FF8A', letterSpacing: '0.04em' }}
        />
        <button type="submit" disabled={busy} className="tac-btn" style={{ padding: '2px 8px', fontSize: 9 }}>
          SEND
        </button>
      </form>
    </div>
  );
}
