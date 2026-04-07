/**
 * Content script for claude.ai pages.
 * Lightweight — just signals that a claude.ai tab is open.
 * The actual API calls go through the background service worker.
 */

export default defineContentScript({
  matches: ['https://claude.ai/*'],
  runAt: 'document_idle',

  main() {
    // Notify the background worker that a claude.ai tab is active
    chrome.runtime.sendMessage({ type: 'CLAUDE_TAB_ACTIVE' });

    // Re-notify periodically in case the service worker restarts
    setInterval(() => {
      chrome.runtime.sendMessage({ type: 'CLAUDE_TAB_ACTIVE' }).catch(() => {
        // Extension context invalidated — tab will be cleaned up
      });
    }, 30_000);
  },
});
