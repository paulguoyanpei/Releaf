import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { ContextToggle } from './ContextToggle';
import type { ChatMessage as ChatMessageType } from '../../types/messages';
import type { ContextScope } from '../../types/overleaf';
import { getSelection, getDocument } from '../../lib/overleaf-editor';
import { parseFileTree, switchToFile } from '../../lib/overleaf-filetree';
import { buildPrompt, estimateTokens } from '../../lib/context-builder';
import { filterChangedFiles } from '../../lib/snapshot-tracker';
import { getProjectId, KEYS } from '../../utils/storage-keys';
import type { PortMessage } from '../../messaging/protocol';

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
      // Read each file's content
      for (const file of tree) {
        if (file.name === currentFileName) {
          files.push({ ...file, content: currentDoc });
        } else {
          await switchToFile(file);
          const content = await getDocument().catch(() => '');
          files.push({ ...file, content });
        }
      }
      // Switch back to original file
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
  }, [input, isStreaming, projectId, scope, selectedText, systemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <ContextToggle scope={scope} onChange={setScope} />
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ color: '#585b70', textAlign: 'center', marginTop: '40px' }}>
            Select text in the editor or type a prompt to get started.
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} isStreaming={isStreaming && msg === messages[messages.length - 1] && msg.role === 'assistant'} />
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
        </div>
      </div>
    </>
  );
}
