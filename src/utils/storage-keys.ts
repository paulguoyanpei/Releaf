/** Chrome storage key constants */
export const KEYS = {
  ORG_ID: 'claude_org_id',
  SESSION_STATUS: 'claude_session_status',
  SYSTEM_PROMPT_GLOBAL: 'system_prompt_global',
  systemPrompt: (projectId: string) => `system_prompt_${projectId}`,
  chatHistory: (projectId: string) => `chat_history_${projectId}`,
  conversationId: (projectId: string) => `conv_id_${projectId}`,
  fileSnapshots: (projectId: string) => `file_snapshots_${projectId}`,
  contextScope: (projectId: string) => `context_scope_${projectId}`,
} as const;

/** Extract Overleaf project ID from URL */
export function getProjectId(): string | null {
  const match = window.location.pathname.match(/\/project\/([a-f0-9]+)/);
  return match ? match[1] : null;
}
