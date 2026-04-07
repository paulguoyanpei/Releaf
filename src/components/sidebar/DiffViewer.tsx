import { useState } from 'react';
import { computeDiff } from '../../lib/diff-engine';

interface Props {
  original: string;
  proposed: string;
  onAccept: (text: string) => void;
  onReject: () => void;
}

export function DiffViewer({ original, proposed, onAccept, onReject }: Props) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(proposed);
  const segments = computeDiff(original, proposed);

  // For pure insertions (no original text), just show the proposed text
  const isPureInsert = !original;

  return (
    <div className="diff-viewer">
      {editing ? (
        <textarea
          className="system-prompt-textarea"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          style={{ minHeight: '80px' }}
        />
      ) : isPureInsert ? (
        <span className="diff-insert">{proposed}</span>
      ) : (
        segments.map((seg, i) => (
          <span
            key={i}
            className={seg.type === 'insert' ? 'diff-insert' : seg.type === 'delete' ? 'diff-delete' : ''}
          >
            {seg.text}
          </span>
        ))
      )}

      <div className="diff-actions">
        <button
          className="action-btn diff-accept"
          onClick={() => onAccept(editing ? editText : proposed)}
        >
          Accept
        </button>
        <button className="action-btn diff-reject" onClick={onReject}>
          Reject
        </button>
        <button
          className="action-btn diff-edit-btn"
          onClick={() => {
            setEditing(!editing);
            setEditText(proposed);
          }}
        >
          {editing ? 'Preview' : 'Edit'}
        </button>
      </div>
    </div>
  );
}
