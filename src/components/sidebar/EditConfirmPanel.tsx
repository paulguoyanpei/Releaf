import { useState } from 'react';
import type { EditBlock } from '../../lib/edit-parser';
import { computeDiff } from '../../lib/diff-engine';

interface Props {
  editBlocks: EditBlock[];
  onConfirm: (blocks: EditBlock[]) => void;
  onReject: () => void;
}

/**
 * Displays all proposed edits grouped by file, with inline diffs.
 * User can toggle individual replacements on/off before confirming.
 */
export function EditConfirmPanel({ editBlocks, onConfirm, onReject }: Props) {
  // Track which replacements are enabled: [blockIdx][replIdx]
  const [enabled, setEnabled] = useState<boolean[][]>(
    editBlocks.map((b) => b.replacements.map(() => true))
  );
  const [applied, setApplied] = useState(false);

  function toggleReplacement(blockIdx: number, replIdx: number) {
    setEnabled((prev) => {
      const next = prev.map((arr) => [...arr]);
      next[blockIdx][replIdx] = !next[blockIdx][replIdx];
      return next;
    });
  }

  function handleConfirm() {
    // Filter to only enabled replacements
    const filtered: EditBlock[] = [];
    editBlocks.forEach((block, bi) => {
      const repls = block.replacements.filter((_, ri) => enabled[bi][ri]);
      if (repls.length > 0) {
        filtered.push({ file: block.file, replacements: repls });
      }
    });
    setApplied(true);
    onConfirm(filtered);
  }

  const totalChanges = enabled.flat().filter(Boolean).length;

  if (applied) {
    return (
      <div className="edit-confirm-panel">
        <div className="edit-applied-badge">Changes applied</div>
      </div>
    );
  }

  return (
    <div className="edit-confirm-panel">
      <div className="edit-confirm-header">
        <span className="edit-confirm-title">Proposed edits</span>
        <span className="edit-confirm-count">{totalChanges} change{totalChanges !== 1 ? 's' : ''}</span>
      </div>

      {editBlocks.map((block, bi) => (
        <div key={bi} className="edit-file-group">
          <div className="edit-file-name">{block.file}</div>
          {block.replacements.map((repl, ri) => {
            const segments = computeDiff(repl.search, repl.replace);
            const isEnabled = enabled[bi][ri];
            return (
              <div key={ri} className={`edit-replacement ${isEnabled ? '' : 'disabled'}`}>
                <label className="edit-toggle-row">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => toggleReplacement(bi, ri)}
                  />
                  <span className="edit-toggle-label">Change #{ri + 1}</span>
                </label>
                <div className="diff-viewer">
                  {segments.map((seg, si) => (
                    <span
                      key={si}
                      className={seg.type === 'insert' ? 'diff-insert' : seg.type === 'delete' ? 'diff-delete' : ''}
                    >
                      {seg.text}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="edit-confirm-actions">
        <button className="action-btn diff-accept" onClick={handleConfirm} disabled={totalChanges === 0}>
          Apply {totalChanges} change{totalChanges !== 1 ? 's' : ''}
        </button>
        <button className="action-btn diff-reject" onClick={onReject}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
