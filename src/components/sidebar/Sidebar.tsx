import { useState } from 'react';
import { ChatTab } from './ChatTab';
import { SettingsTab } from './SettingsTab';

type Tab = 'chat' | 'settings';

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <button
        className={`sidebar-toggle ${collapsed ? 'collapsed' : ''}`}
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Open Releaf' : 'Close Releaf'}
      >
        {collapsed ? '◀' : '▶'}
      </button>

      {/* Sidebar panel */}
      <div className={`sidebar-root ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h1>Releaf</h1>
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
    </>
  );
}
