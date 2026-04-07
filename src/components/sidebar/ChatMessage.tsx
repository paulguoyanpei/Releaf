import { useState } from 'react';
import type { ChatMessage as ChatMessageType } from '../../types/messages';
import { DiffViewer } from './DiffViewer';
import { EditConfirmPanel } from './EditConfirmPanel';
import { getSelection, getDocument, replaceRange } from '../../lib/overleaf-editor';
import { insertAtCursor, replaceSelection } from '../../lib/overleaf-editor';
import { parseEditBlocks, hasEditBlocks, stripEditBlocks } from '../../lib/edit-parser';
import type { EditBlock } from '../../lib/edit-parser';

interface Props {
  message: ChatMessageType;
  isStreaming: boolean;
  onRollback?: () => void;
}

type DiffAction = 'insert' | 'replace' | 'comment' | null;

export function ChatMessage({ message, isStreaming, onRollback }: Props) {
  const [diffAction, setDiffAction] = useState<DiffAction>(null);
  const [originalText, setOriginalText] = useState('');

  const isAssistant = message.role === 'assistant';
  const editBlocks = isAssistant && !isStreaming ? parseEditBlocks(message.content) : [];
  const hasEdits = editBlocks.length > 0;
  const displayContent = hasEdits ? stripEditBlocks(message.content) : message.content;

  /** Extract the LaTeX code from the response, or use the full response */
  function getProposedText(): string {
    const codeBlockMatch = message.content.match(/```(?:latex|tex)?\s*\n([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();
    return message.content.trim();
  }

  async function handleAction(action: DiffAction) {
    if (action === 'insert') {
      setOriginalText('');
      setDiffAction('insert');
    } else if (action === 'replace') {
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

  /** Apply structured edit blocks by searching document content and replacing */
  async function handleApplyEdits(blocks: EditBlock[]) {
    for (const block of blocks) {
      // Get current document content
      const doc = await getDocument();
      if (!doc) continue;

      // Apply replacements in reverse order (to preserve offsets)
      const sorted = block.replacements
        .map((repl) => {
          const idx = doc.indexOf(repl.search);
          return { ...repl, index: idx };
        })
        .filter((r) => r.index !== -1)
        .sort((a, b) => b.index - a.index); // reverse order

      for (const repl of sorted) {
        await replaceRange(repl.index, repl.index + repl.search.length, repl.replace);
      }
    }
  }

  return (
    <div className={`chat-message ${message.role}`}>
      <span className="role">{message.role}</span>
      <div className="content">
        {displayContent}
        {isStreaming && <span className="streaming-indicator" />}
      </div>

      {isAssistant && !isStreaming && message.content && (
        <>
          {/* Structured edit blocks → confirmation panel */}
          {hasEdits && (
            <EditConfirmPanel
              editBlocks={editBlocks}
              onConfirm={handleApplyEdits}
              onReject={() => {}}
            />
          )}

          {/* Manual actions (always available as fallback) */}
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
            {onRollback && (
              <button className="action-btn rollback-btn" onClick={onRollback} title="Rollback to this point">
                ↩ Rollback
              </button>
            )}
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
