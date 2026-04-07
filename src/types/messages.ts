import type { SessionStatus } from './claude';
import type { ContextScope } from './overleaf';

/** Chat message stored in history */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/** Messages between content scripts and background worker */
export type BackgroundMessage =
  | { type: 'CHECK_SESSION' }
  | { type: 'SESSION_STATUS'; status: SessionStatus; orgId?: string }
  | { type: 'SEND_PROMPT'; projectId: string; prompt: string }
  | { type: 'STREAM_CHUNK'; chunk: string }
  | { type: 'STREAM_DONE' }
  | { type: 'STREAM_ERROR'; error: string }
  | { type: 'DELETE_CONVERSATION'; projectId: string };
