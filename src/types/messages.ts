import type { SessionStatus } from './claude';
import type { ContextScope } from './overleaf';

/** Chat message stored in history */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/** Checkpoint for rollback: captures state after each assistant reply */
export interface Checkpoint {
  /** Number of messages at this point */
  messageCount: number;
  /** Document content snapshot, null if no edits were applied this turn */
  docContent: string | null;
  /** Timestamp for display */
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
