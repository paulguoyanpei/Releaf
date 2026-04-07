import { useState, useEffect } from 'react';
import type { SessionStatus } from '../../types/claude';

export function App() {
  const [status, setStatus] = useState<SessionStatus>('checking');

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'CHECK_SESSION' }).then((res) => {
      setStatus(res.status);
    }).catch(() => {
      setStatus('disconnected');
    });
  }, []);

  const dotClass = status === 'connected' ? 'ok' : status === 'checking' ? 'wait' : 'no';
  const label = status === 'connected'
    ? 'Connected to claude.ai'
    : status === 'checking'
    ? 'Checking...'
    : 'Not connected';

  return (
    <>
      <h1>Releaf</h1>
      <div className="status">
        <span className={`dot ${dotClass}`} />
        <span>{label}</span>
      </div>
      <p>
        Open an Overleaf project to see the AI sidebar.
        {status === 'disconnected' && (
          <> Make sure you're logged into <a href="https://claude.ai" target="_blank" style={{ color: '#cba6f7' }}>claude.ai</a>.</>
        )}
      </p>
    </>
  );
}
