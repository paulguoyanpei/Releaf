/** Chrome storage key constants */
export const KEYS = {
  ORG_ID: 'claude_org_id',
  SESSION_STATUS: 'claude_session_status',
  SYSTEM_PROMPT_GLOBAL: 'system_prompt_global',
  SIDEBAR_WIDTH: 'sidebar_width',
  SIDEBAR_MODE: 'sidebar_mode',
  systemPrompt: (projectId: string) => `system_prompt_${projectId}`,
  chatHistory: (projectId: string) => `chat_history_${projectId}`,
  conversationId: (projectId: string) => `conv_id_${projectId}`,
  fileSnapshots: (projectId: string) => `file_snapshots_${projectId}`,
  contextScope: (projectId: string) => `context_scope_${projectId}`,
} as const;

/** Extract Overleaf project ID from URL (works in both Overleaf page and standalone window) */
export function getProjectId(): string | null {
  // Check URL search params first (standalone window mode)
  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get('projectId');
  if (fromParam) return fromParam;
  // Overleaf URL pattern
  const match = window.location.pathname.match(/\/project\/([a-f0-9]+)/);
  return match ? match[1] : null;
}
