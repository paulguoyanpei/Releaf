/**
 * Claude.ai internal API client.
 *
 * All claude.ai API logic is isolated in this single file so that
 * when undocumented endpoints change, only this file needs updating.
 *
 * This runs in the background service worker. Fetch calls to claude.ai
 * automatically include session cookies via host_permissions.
 */

import type { ClaudeOrganization, ClaudeConversation } from '../types/claude';

const BASE_URL = 'https://claude.ai';

/** Common headers for all API requests */
function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/** Get the user's organizations. Also serves as a session check. */
export async function getOrganizations(): Promise<ClaudeOrganization[]> {
  const res = await fetch(`${BASE_URL}/api/organizations`, {
    headers: headers(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Session check failed: ${res.status}`);
  return res.json();
}

/** Create a new conversation for a project */
export async function createConversation(
  orgId: string,
  name: string
): Promise<ClaudeConversation> {
  const res = await fetch(
    `${BASE_URL}/api/organizations/${orgId}/chat_conversations`,
    {
      method: 'POST',
      headers: headers(),
      credentials: 'include',
      body: JSON.stringify({ uuid: crypto.randomUUID(), name }),
    }
  );
  if (!res.ok) throw new Error(`Create conversation failed: ${res.status}`);
  return res.json();
}

/**
 * Send a message and return a ReadableStream of completion text chunks.
 *
 * The response is Server-Sent Events. Each event's `data:` field contains
 * JSON with a `completion` field that represents the incremental text.
 */
export async function sendMessageStream(
  orgId: string,
  conversationId: string,
  prompt: string
): Promise<ReadableStream<string>> {
  const res = await fetch(
    `${BASE_URL}/api/organizations/${orgId}/chat_conversations/${conversationId}/completion`,
    {
      method: 'POST',
      headers: {
        ...headers(),
        Accept: 'text/event-stream',
      },
      credentials: 'include',
      body: JSON.stringify({
        prompt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        attachments: [],
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Send message failed: ${res.status} ${text}`);
  }

  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<string>({
    async pull(controller) {
      let buffer = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.completion) {
              controller.enqueue(json.completion);
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

/** Delete a conversation */
export async function deleteConversation(
  orgId: string,
  conversationId: string
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/organizations/${orgId}/chat_conversations/${conversationId}`,
    {
      method: 'DELETE',
      headers: headers(),
      credentials: 'include',
    }
  );
  if (!res.ok) throw new Error(`Delete conversation failed: ${res.status}`);
}
