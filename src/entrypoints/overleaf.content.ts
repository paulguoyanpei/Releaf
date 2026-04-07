/**
 * Isolated-world content script for Overleaf.
 * Renders the Shadow DOM sidebar with the React UI.
 */

import ReactDOM from 'react-dom/client';
import { createElement } from 'react';
import { Sidebar } from '../components/sidebar/Sidebar';

export default defineContentScript({
  matches: ['https://www.overleaf.com/project/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'releaf-sidebar',
      position: 'overlay',
      anchor: 'body',
      isolateEvents: ['keydown', 'keyup', 'keypress'],
      onMount(container) {
        // Inject Tailwind styles into shadow root
        const style = document.createElement('style');
        style.textContent = SIDEBAR_STYLES;
        container.getRootNode().appendChild(style);

        const root = ReactDOM.createRoot(container);
        root.render(createElement(Sidebar));
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});

/**
 * Inline styles for the sidebar.
 * We inline a minimal Tailwind-like utility set since Shadow DOM
 * isolates us from the page's stylesheets.
 */
const SIDEBAR_STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .sidebar-root {
    position: fixed;
    top: 0;
    right: 0;
    width: 380px;
    height: 100vh;
    background: #1e1e2e;
    color: #cdd6f4;
    display: flex;
    flex-direction: column;
    z-index: 99999;
    font-size: 13px;
    border-left: 1px solid #313244;
    transition: transform 0.2s ease;
  }

  .sidebar-root.collapsed {
    transform: translateX(100%);
  }

  /* Resize handle on the left edge */
  .resize-handle {
    position: absolute;
    top: 0;
    left: -3px;
    width: 6px;
    height: 100%;
    cursor: col-resize;
    z-index: 100000;
    background: transparent;
    transition: background 0.15s;
  }

  .resize-handle:hover,
  .resize-handle:active {
    background: #cba6f7;
  }

  .sidebar-toggle {
    position: fixed;
    top: 50%;
    right: 380px;
    transform: translateY(-50%);
    width: 24px;
    height: 48px;
    background: #1e1e2e;
    border: 1px solid #313244;
    border-right: none;
    border-radius: 6px 0 0 6px;
    color: #cdd6f4;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    font-size: 14px;
    transition: right 0.2s ease;
  }

  .sidebar-toggle.collapsed {
    right: 0;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #313244;
    gap: 4px;
  }

  .sidebar-header h1 {
    font-size: 14px;
    font-weight: 600;
    color: #cba6f7;
    margin-right: auto;
  }

  .popout-btn {
    background: none;
    border: 1px solid #313244;
    color: #6c7086;
    cursor: pointer;
    font-size: 16px;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .popout-btn:hover {
    color: #cba6f7;
    border-color: #cba6f7;
    background: #181825;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid #313244;
  }

  .tab-btn {
    flex: 1;
    padding: 8px 12px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: #6c7086;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.15s;
  }

  .tab-btn:hover {
    color: #cdd6f4;
    background: #181825;
  }

  .tab-btn.active {
    color: #cba6f7;
    border-bottom-color: #cba6f7;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  /* Chat Tab */
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .chat-message {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .chat-message .role {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .chat-message.user .role { color: #89b4fa; }
  .chat-message.assistant .role { color: #a6e3a1; }

  .chat-message .content {
    background: #181825;
    padding: 10px 12px;
    border-radius: 8px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-size: 12px;
  }

  .chat-message.user .content {
    background: #1e3a5f;
  }

  .message-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .action-btn {
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid #313244;
    background: #181825;
    color: #cdd6f4;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.15s;
  }

  .action-btn:hover {
    background: #313244;
    border-color: #cba6f7;
  }

  /* Chat Input */
  .chat-input-area {
    padding: 12px;
    border-top: 1px solid #313244;
  }

  .selection-preview {
    background: #181825;
    padding: 8px;
    margin-bottom: 8px;
    border-radius: 6px;
    font-size: 11px;
    color: #a6adc8;
    max-height: 60px;
    overflow-y: auto;
    border-left: 3px solid #89b4fa;
  }

  .selection-preview .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #89b4fa;
    margin-bottom: 4px;
  }

  .chat-input-row {
    display: flex;
    gap: 8px;
  }

  .chat-input {
    flex: 1;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #313244;
    background: #181825;
    color: #cdd6f4;
    font-size: 13px;
    font-family: inherit;
    resize: none;
    min-height: 36px;
    max-height: 120px;
    outline: none;
    transition: border-color 0.15s;
  }

  .chat-input:focus {
    border-color: #cba6f7;
  }

  .send-btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    background: #cba6f7;
    color: #1e1e2e;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: opacity 0.15s;
    white-space: nowrap;
  }

  .send-btn:hover { opacity: 0.9; }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Context Toggle */
  .context-toggle {
    display: flex;
    padding: 8px 12px;
    gap: 6px;
    border-bottom: 1px solid #313244;
  }

  .context-option {
    padding: 4px 10px;
    border-radius: 12px;
    border: 1px solid #313244;
    background: none;
    color: #6c7086;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.15s;
  }

  .context-option.active {
    background: #313244;
    color: #cba6f7;
    border-color: #cba6f7;
  }

  /* Settings Tab */
  .settings-panel {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .settings-section h3 {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #a6adc8;
    margin-bottom: 8px;
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .status-dot.connected { background: #a6e3a1; }
  .status-dot.checking { background: #f9e2af; }
  .status-dot.disconnected { background: #f38ba8; }

  .open-claude-btn {
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid #313244;
    background: #181825;
    color: #cdd6f4;
    cursor: pointer;
    font-size: 12px;
  }

  .open-claude-btn:hover {
    background: #313244;
  }

  .system-prompt-textarea {
    width: 100%;
    min-height: 100px;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #313244;
    background: #181825;
    color: #cdd6f4;
    font-size: 12px;
    font-family: inherit;
    resize: vertical;
    outline: none;
  }

  .system-prompt-textarea:focus {
    border-color: #cba6f7;
  }

  .system-prompt-textarea::placeholder {
    color: #585b70;
  }

  /* Diff Viewer */
  .diff-viewer {
    background: #181825;
    border-radius: 8px;
    padding: 10px;
    margin-top: 8px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 12px;
    line-height: 1.6;
    overflow-x: auto;
  }

  .diff-insert {
    background: #1a3d2a;
    color: #a6e3a1;
  }

  .diff-delete {
    background: #3d1a1a;
    color: #f38ba8;
    text-decoration: line-through;
  }

  .diff-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .diff-accept {
    background: #1a3d2a;
    border: 1px solid #a6e3a1;
    color: #a6e3a1;
  }

  .diff-reject {
    background: #3d1a1a;
    border: 1px solid #f38ba8;
    color: #f38ba8;
  }

  .diff-edit-btn {
    background: #313244;
    border: 1px solid #585b70;
    color: #cdd6f4;
  }

  /* Streaming indicator */
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .streaming-indicator {
    display: inline-block;
    width: 6px;
    height: 14px;
    background: #cba6f7;
    margin-left: 2px;
    animation: pulse 1s infinite;
    vertical-align: text-bottom;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #313244; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #45475a; }
`;
