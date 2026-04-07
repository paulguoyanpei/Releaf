import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatTab } from './ChatTab';
import { SettingsTab } from './SettingsTab';
import { getProjectId, KEYS } from '../../utils/storage-keys';

type Tab = 'chat' | 'settings';

const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 300;
const MAX_WIDTH_RATIO = 0.5; // 50vw

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isResizing = useRef(false);

  // Load saved width
  useEffect(() => {
    chrome.storage.local.get(KEYS.SIDEBAR_WIDTH).then((result) => {
      const saved = result[KEYS.SIDEBAR_WIDTH] as number | undefined;
      if (saved && saved >= MIN_WIDTH) setWidth(saved);
    });
  }, []);

  // Save width (debounced via ref)
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveWidth = useCallback((w: number) => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      chrome.storage.local.set({ [KEYS.SIDEBAR_WIDTH]: w });
    }, 300);
  }, []);

  // Resize handlers
  // NOTE: We must attach listeners and overlay to the host page's document,
  // not the Shadow DOM's document, because mouse events outside the shadow
  // boundary won't reach shadow-internal listeners.
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;

    const hostDoc = window.document; // host page document, outside Shadow DOM

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
      const newWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, window.innerWidth - ev.clientX));
      setWidth(newWidth);
      saveWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      hostDoc.removeEventListener('mousemove', onMouseMove);
      hostDoc.removeEventListener('mouseup', onMouseUp);
      overlay.remove();
    };

    // Add transparent overlay on the HOST page to capture all mouse events
    // (prevents iframes / CodeMirror from swallowing them)
    const overlay = hostDoc.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999999;cursor:col-resize;';
    hostDoc.body.appendChild(overlay);

    hostDoc.addEventListener('mousemove', onMouseMove);
    hostDoc.addEventListener('mouseup', onMouseUp);
  }, [saveWidth]);

  const sidebarStyle = { width: `${width}px` };
  const toggleStyle = collapsed ? undefined : { right: `${width}px` };

  return (
    <>
      {/* Toggle button */}
      <button
        className={`sidebar-toggle ${collapsed ? 'collapsed' : ''}`}
        style={toggleStyle}
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Open Releaf' : 'Close Releaf'}
      >
        {collapsed ? '◀' : '▶'}
      </button>

      {/* Sidebar panel */}
      <div className={`sidebar-root ${collapsed ? 'collapsed' : ''}`} style={sidebarStyle}>
        {/* Resize handle */}
        <div className="resize-handle" onMouseDown={handleResizeStart} />

        <div className="sidebar-header">
          <h1>Releaf</h1>
          <button
            className="popout-btn"
            onClick={() => {
              chrome.runtime.sendMessage({ type: 'OPEN_SIDEBAR_WINDOW', projectId: getProjectId() });
              setCollapsed(true);
            }}
            title="Open in separate window"
          >
            ⧉
          </button>
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
