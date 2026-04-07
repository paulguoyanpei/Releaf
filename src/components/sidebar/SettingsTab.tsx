import { useState, useEffect } from 'react';
import type { SessionStatus } from '../../types/claude';
import type { ContextScope } from '../../types/overleaf';
import { ContextToggle } from './ContextToggle';
import { SystemPromptEditor } from './SystemPromptEditor';
import { getProjectId, KEYS } from '../../utils/storage-keys';

export function SettingsTab() {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('checking');
  const [scope, setScope] = useState<ContextScope>('current-file');
  const projectId = getProjectId();

  // Check session on mount and periodically
  useEffect(() => {
    checkSession();
    const interval = setInterval(checkSession, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Load context scope
  useEffect(() => {
    if (!projectId) return;
    chrome.storage.local.get(KEYS.contextScope(projectId)).then((result) => {
      const saved = result[KEYS.contextScope(projectId)] as ContextScope | undefined;
      if (saved) setScope(saved);
    });
  }, [projectId]);

  async function checkSession() {
    setSessionStatus('checking');
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_SESSION' });
      setSessionStatus(response.status);
    } catch {
      setSessionStatus('disconnected');
    }
  }

  function openClaudeTab() {
    chrome.runtime.sendMessage({ type: 'OPEN_CLAUDE_TAB' });
  }

  function clearChatHistory() {
    if (!projectId) return;
    chrome.storage.local.remove(KEYS.chatHistory(projectId));
    // Force reload by dispatching a custom event
    window.dispatchEvent(new CustomEvent('releaf:clear-chat'));
  }

  const statusLabels: Record<SessionStatus, string> = {
    connected: 'Connected to claude.ai',
    checking: 'Checking session...',
    disconnected: 'Not connected',
  };

  return (
    <div className="settings-panel">
      {/* Session Status */}
      <div className="settings-section">
        <h3>Claude.ai Session</h3>
        <div className="status-row">
          <span className={`status-dot ${sessionStatus}`} />
          <span>{statusLabels[sessionStatus]}</span>
        </div>
        {sessionStatus === 'disconnected' && (
          <button className="open-claude-btn" onClick={openClaudeTab} style={{ marginTop: '8px' }}>
            Open claude.ai
          </button>
        )}
      </div>

      {/* Context Scope */}
      <div className="settings-section">
        <h3>Context Scope</h3>
        <ContextToggle scope={scope} onChange={setScope} />
      </div>

      {/* System Prompt */}
      <div className="settings-section">
        <h3>System Prompt</h3>
        <SystemPromptEditor />
      </div>

      {/* Chat Management */}
      <div className="settings-section">
        <h3>Chat History</h3>
        <button className="open-claude-btn" onClick={clearChatHistory}>
          Clear chat history
        </button>
      </div>
    </div>
  );
}
