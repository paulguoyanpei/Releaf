import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { ContextToggle } from './ContextToggle';
import type { ChatMessage as ChatMessageType, Checkpoint } from '../../types/messages';
import type { ContextScope } from '../../types/overleaf';
import { getSelection, getDocument, replaceDocument } from '../../lib/overleaf-editor';
import { parseFileTree, switchToFile } from '../../lib/overleaf-filetree';
import { buildPrompt, estimateTokens } from '../../lib/context-builder';
import { filterChangedFiles } from '../../lib/snapshot-tracker';
import { hasEditBlocks } from '../../lib/edit-parser';
import { getProjectId, KEYS } from '../../utils/storage-keys';
import type { PortMessage } from '../../messaging/protocol';

const MAX_CHECKPOINTS = 20;

export function ChatTab() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [scope, setScope] = useState<ContextScope>('current-file');
  const [isStreaming, setIsStreaming] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const checkpointsRef = useRef<Checkpoint[]>([]);
  const projectId = getProjectId();

  // Load chat history and settings on mount
  useEffect(() => {
    if (!projectId) return;
    chrome.storage.local.get([
      KEYS.chatHistory(projectId),
      KEYS.contextScope(projectId),
    ]).then((result) => {
      const history = result[KEYS.chatHistory(projectId)] as ChatMessageType[] | undefined;
      if (history) setMessages(history);
      const savedScope = result[KEYS.contextScope(projectId)] as ContextScope | undefined;
      if (savedScope) setScope(savedScope);
    });
    chrome.storage.sync.get(KEYS.SYSTEM_PROMPT_GLOBAL).then((result) => {
      const prompt = result[KEYS.SYSTEM_PROMPT_GLOBAL] as string | undefined;
      if (prompt) setSystemPrompt(prompt);
    });
  }, [projectId]);

  // Save chat history when it changes
  useEffect(() => {
    if (!projectId || messages.length === 0) return;
    chrome.storage.local.set({
      [KEYS.chatHistory(projectId)]: messages.slice(-100),
    });
  }, [messages, projectId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for clear-chat events (from Settings tab or New Session button)
  useEffect(() => {
    function handleClear() {
      setMessages([]);
      checkpointsRef.current = [];
      if (projectId) {
        chrome.storage.local.remove(KEYS.chatHistory(projectId));
        chrome.runtime.sendMessage({ type: 'DELETE_CONVERSATION', projectId });
      }
    }
    window.addEventListener('releaf:clear-chat', handleClear);
    return () => window.removeEventListener('releaf:clear-chat', handleClear);
  }, [projectId]);

  // Poll for selection changes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const sel = await getSelection();
        setSelectedText(sel || '');
      } catch {
        // Bridge not ready yet
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /** Create a checkpoint after assistant reply completes */
  const createCheckpoint = useCallback(async (messageCount: number, assistantContent: string) => {
    // Only snapshot the document if this reply contains edit blocks
    let docContent: string | null = null;
    if (hasEditBlocks(assistantContent)) {
      try {
        docContent = await getDocument();
      } catch {
        // Bridge not available (standalone window)
      }
    }

    const cp: Checkpoint = { messageCount, docContent, timestamp: Date.now() };
    const cps = checkpointsRef.current;
    cps.push(cp);
    // Evict oldest if over limit
    if (cps.length > MAX_CHECKPOINTS) {
      cps.splice(0, cps.length - MAX_CHECKPOINTS);
    }
  }, []);

  /** Rollback to a checkpoint corresponding to messageCount */
  const handleRollback = useCallback(async (targetMessageCount: number) => {
    // Find the checkpoint
    const cps = checkpointsRef.current;
    const cpIndex = cps.findIndex((cp) => cp.messageCount === targetMessageCount);
    if (cpIndex === -1) return;
    const checkpoint = cps[cpIndex];

    // Truncate messages
    setMessages((prev) => prev.slice(0, checkpoint.messageCount));

    // Restore document if we have a snapshot
    if (checkpoint.docContent !== null) {
      try {
        await replaceDocument(checkpoint.docContent);
      } catch {
        // Bridge not available
      }
    }

    // Remove checkpoints after this one
    cps.splice(cpIndex + 1);

    // Delete Claude conversation so next message starts fresh
    if (projectId) {
      chrome.runtime.sendMessage({ type: 'DELETE_CONVERSATION', projectId });
    }
  }, [projectId]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming || !projectId) return;

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    // Gather context
    let files = [];
    const currentDoc = await getDocument().catch(() => '');
    const currentFileName = document.querySelector('.toolbar-filename')?.textContent?.trim() || 'main.tex';

    if (scope === 'full-project') {
      const tree = parseFileTree();
      for (const file of tree) {
        if (file.name === currentFileName) {
          files.push({ ...file, content: currentDoc });
        } else {
          await switchToFile(file);
          const content = await getDocument().catch(() => '');
          files.push({ ...file, content });
        }
      }
      const currentFile = tree.find((f) => f.name === currentFileName);
      if (currentFile) await switchToFile(currentFile);
      files = await filterChangedFiles(projectId, files);
    } else {
      files = [{ name: currentFileName, path: currentFileName, content: currentDoc }];
    }

    const fullPrompt = buildPrompt({
      systemPrompt,
      scope,
      files,
      currentFileName,
      selectedText,
      userPrompt: userMessage.content,
    });

    // Create assistant message placeholder
    const assistantMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    // Stream via port
    const port = chrome.runtime.connect({ name: 'claude-stream' });
    portRef.current = port;

    port.onMessage.addListener((msg: PortMessage) => {
      if (msg.type === 'STREAM_CHUNK') {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === 'assistant') {
            last.content += msg.chunk;
          }
          return updated;
        });
      } else if (msg.type === 'STREAM_DONE') {
        setIsStreaming(false);
        port.disconnect();
        portRef.current = null;

        // Create checkpoint after reply completes
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant') {
            createCheckpoint(prev.length, lastMsg.content);
          }
          return prev;
        });
      } else if (msg.type === 'STREAM_ERROR') {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === 'assistant') {
            last.content = `Error: ${msg.error}`;
          }
          return updated;
        });
        setIsStreaming(false);
        port.disconnect();
        portRef.current = null;
      }
    });

    port.postMessage({ type: 'SEND_PROMPT', projectId, prompt: fullPrompt });
  }, [input, isStreaming, projectId, scope, selectedText, systemPrompt, createCheckpoint]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  /** Find the checkpoint for a given assistant message index */
  function getCheckpointForMessage(msgIndex: number): Checkpoint | undefined {
    // The checkpoint's messageCount is the messages.length after the assistant reply,
    // which equals msgIndex + 1
    return checkpointsRef.current.find((cp) => cp.messageCount === msgIndex + 1);
  }

  return (
    <>
      <ContextToggle scope={scope} onChange={setScope} />
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ color: '#585b70', textAlign: 'center', marginTop: '40px' }}>
            Select text in the editor or type a prompt to get started.
          </div>
        )}
        {messages.map((msg, idx) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && msg === messages[messages.length - 1] && msg.role === 'assistant'}
            onRollback={
              msg.role === 'assistant' && !isStreaming && getCheckpointForMessage(idx)
                ? () => handleRollback(idx + 1)
                : undefined
            }
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        {selectedText && (
          <div className="selection-preview">
            <div className="label">Selected text</div>
            {selectedText.length > 200 ? selectedText.slice(0, 200) + '...' : selectedText}
          </div>
        )}
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Ask about your LaTeX... (Ctrl+Enter to send)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isStreaming}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? '...' : 'Send'}
          </button>
          <button
            className="new-session-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('releaf:clear-chat'))}
            disabled={isStreaming || messages.length === 0}
            title="Clear chat and start a new session"
          >
            +
          </button>
        </div>
      </div>
    </>
  );
}
