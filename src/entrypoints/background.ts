/**
 * Background service worker.
 * Routes messages between content scripts and proxies API calls to claude.ai.
 * Manages streaming responses over long-lived port connections.
 */

import {
  getOrganizations,
  createConversation,
  sendMessageStream,
  deleteConversation,
} from '../lib/claude-api';
import { KEYS } from '../utils/storage-keys';
import type { CheckSessionResponse } from '../messaging/protocol';
import type { PortMessage } from '../messaging/protocol';

export default defineBackground(() => {
  let cachedOrgId: string | null = null;

  // --- One-shot message handler ---
  chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (message.type === 'CHECK_SESSION') {
      checkSession().then(sendResponse);
      return true; // async response
    }

    if (message.type === 'DELETE_CONVERSATION') {
      handleDeleteConversation(message.projectId).then(sendResponse);
      return true;
    }

    if (message.type === 'OPEN_CLAUDE_TAB') {
      chrome.tabs.create({ url: 'https://claude.ai' });
      return false;
    }
  });

  // --- Port-based streaming handler ---
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'claude-stream') return;

    port.onMessage.addListener(async (msg: PortMessage) => {
      if (msg.type === 'SEND_PROMPT') {
        await handleStreamPrompt(port, msg.projectId, msg.prompt);
      }
    });
  });

  /** Check if the user is logged into claude.ai */
  async function checkSession(): Promise<CheckSessionResponse> {
    try {
      const orgs = await getOrganizations();
      if (orgs.length > 0) {
        cachedOrgId = orgs[0].uuid;
        await chrome.storage.local.set({ [KEYS.ORG_ID]: cachedOrgId });
        return { status: 'connected', orgId: cachedOrgId };
      }
      return { status: 'disconnected' };
    } catch {
      cachedOrgId = null;
      return { status: 'disconnected' };
    }
  }

  /** Get or create a conversation for a project */
  async function getOrCreateConversation(projectId: string): Promise<string> {
    const key = KEYS.conversationId(projectId);
    const stored = await chrome.storage.local.get(key);
    if (stored[key]) return stored[key] as string;

    const orgId = await ensureOrgId();
    const conv = await createConversation(orgId, `Releaf: ${projectId}`);
    await chrome.storage.local.set({ [key]: conv.uuid });
    return conv.uuid;
  }

  /** Ensure we have an org ID */
  async function ensureOrgId(): Promise<string> {
    if (cachedOrgId) return cachedOrgId;
    const stored = await chrome.storage.local.get(KEYS.ORG_ID);
    if (stored[KEYS.ORG_ID]) {
      cachedOrgId = stored[KEYS.ORG_ID] as string;
      return cachedOrgId;
    }
    const session = await checkSession();
    if (session.orgId) return session.orgId;
    throw new Error('Not logged in to claude.ai');
  }

  /** Handle a streaming prompt request over a port */
  async function handleStreamPrompt(
    port: chrome.runtime.Port,
    projectId: string,
    prompt: string
  ): Promise<void> {
    try {
      const orgId = await ensureOrgId();
      const convId = await getOrCreateConversation(projectId);
      const stream = await sendMessageStream(orgId, convId, prompt);
      const reader = stream.getReader();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        try {
          port.postMessage({ type: 'STREAM_CHUNK', chunk: value });
        } catch {
          // Port disconnected
          reader.cancel();
          return;
        }
      }

      port.postMessage({ type: 'STREAM_DONE' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      try {
        port.postMessage({ type: 'STREAM_ERROR', error: message });
      } catch {
        // Port already disconnected
      }
    }
  }

  /** Delete a conversation for cleanup */
  async function handleDeleteConversation(projectId: string): Promise<{ ok: boolean }> {
    try {
      const orgId = await ensureOrgId();
      const key = KEYS.conversationId(projectId);
      const stored = await chrome.storage.local.get(key);
      const convId = stored[key] as string | undefined;
      if (convId) {
        await deleteConversation(orgId, convId);
        await chrome.storage.local.remove(key);
      }
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
});
