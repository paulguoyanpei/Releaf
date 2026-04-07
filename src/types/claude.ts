/** Organization returned by GET /api/organizations */
export interface ClaudeOrganization {
  uuid: string;
  name: string;
  [key: string]: unknown;
}

/** Conversation metadata */
export interface ClaudeConversation {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/** SSE event data from the completion stream */
export interface ClaudeStreamEvent {
  completion: string;
  stop_reason: string | null;
  model: string;
  [key: string]: unknown;
}

/** Session status for the UI indicator */
export type SessionStatus = 'connected' | 'checking' | 'disconnected';
