import type { SessionStatus } from '../types/claude';

/**
 * Type-safe message protocol between extension scripts.
 *
 * Content script → Background: chrome.runtime.sendMessage
 * Background → Content script: chrome.tabs.sendMessage or port.postMessage
 */

// --- Request/Response messages (one-shot via sendMessage) ---

export interface CheckSessionRequest {
  type: 'CHECK_SESSION';
}

export interface CheckSessionResponse {
  status: SessionStatus;
  orgId?: string;
}

export interface DeleteConversationRequest {
  type: 'DELETE_CONVERSATION';
  projectId: string;
}

// --- Streaming messages (via port) ---

export interface SendPromptMessage {
  type: 'SEND_PROMPT';
  projectId: string;
  prompt: string;
}

export interface StreamChunkMessage {
  type: 'STREAM_CHUNK';
  chunk: string;
}

export interface StreamDoneMessage {
  type: 'STREAM_DONE';
}

export interface StreamErrorMessage {
  type: 'STREAM_ERROR';
  error: string;
}

export type PortMessage =
  | SendPromptMessage
  | StreamChunkMessage
  | StreamDoneMessage
  | StreamErrorMessage;
