import { useState } from 'react';
import type { ChatMessage as ChatMessageType } from '../../types/messages';
import { DiffViewer } from './DiffViewer';
import { getSelection } from '../../lib/overleaf-editor';
import { insertAtCursor, replaceSelection } from '../../lib/overleaf-editor';

interface Props {
  message: ChatMessageType;
  isStreaming: boolean;
}

type DiffAction = 'insert' | 'replace' | 'comment' | null;

export function ChatMessage({ message, isStreaming }: Props) {
  const [diffAction, setDiffAction] = useState<DiffAction>(null);
  const [originalText, setOriginalText] = useState('');

  const isAssistant = message.role === 'assistant';

  /** Extract the LaTeX code from the response, or use the full response */
  function getProposedText(): string {
    // Try to extract code block content
    const codeBlockMatch = message.content.match(/```(?:latex|tex)?\s*\n([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();
    return message.content.trim();
  }

  async function handleAction(action: DiffAction) {
    if (action === 'insert') {
      setOriginalText('');
      setDiffAction('insert');
    } else if (diffAction === 'replace') {
      const sel = await getSelection();
      setOriginalText(sel || '');
      setDiffAction('replace');
    } else if (action === 'comment') {
      setOriginalText('');
      setDiffAction('comment');
    }
  }

  async function handleAcceptDiff() {
    const proposed = getProposedText();
    if (diffAction === 'insert') {
      await insertAtCursor(proposed);
    } else if (diffAction === 'replace') {
      await replaceSelection(proposed);
    } else if (diffAction === 'comment') {
      const commented = proposed
        .split('\n')
        .map((line) => `% ${line}`)
        .join('\n');
      await insertAtCursor(commented);
    }
    setDiffAction(null);
  }

  return (
    <div className={`chat-message ${message.role}`}>
      <span className="role">{message.role}</span>
      <div className="content">
        {message.content}
        {isStreaming && <span className="streaming-indicator" />}
      </div>

      {isAssistant && !isStreaming && message.content && (
        <>
          <div className="message-actions">
            <button className="action-btn" onClick={() => handleAction('insert')}>
              Insert at cursor
            </button>
            <button className="action-btn" onClick={() => handleAction('replace')}>
              Replace selection
            </button>
            <button className="action-btn" onClick={() => handleAction('comment')}>
              Add as comment
            </button>
          </div>

          {diffAction && (
            <DiffViewer
              original={originalText}
              proposed={diffAction === 'comment'
                ? getProposedText().split('\n').map(l => `% ${l}`).join('\n')
                : getProposedText()
              }
              onAccept={handleAcceptDiff}
              onReject={() => setDiffAction(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
