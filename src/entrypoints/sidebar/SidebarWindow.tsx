import { useState, useEffect } from 'react';
import { ChatTab } from '../../components/sidebar/ChatTab';
import { SettingsTab } from '../../components/sidebar/SettingsTab';

type Tab = 'chat' | 'settings';

/**
 * Standalone sidebar rendered in its own chrome.windows.create popup.
 * Reuses the same ChatTab/SettingsTab components as the content script sidebar.
 * The projectId is passed via URL search params from the background script.
 */
export function SidebarWindow() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProjectId(params.get('projectId'));
  }, []);

  return (
    <div className="sidebar-window-root">
      <div className="sidebar-header">
        <h1>Releaf</h1>
        {projectId && <span className="project-id">{projectId.slice(0, 8)}...</span>}
      </div>
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'chat' ? <ChatTab /> : <SettingsTab />}
      </div>
    </div>
  );
}
