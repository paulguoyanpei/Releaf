/**
 * Diff computation using diff-match-patch.
 * Used to show inline diffs before applying changes.
 */

import DiffMatchPatch from 'diff-match-patch';

const dmp = new DiffMatchPatch();

export interface DiffSegment {
  type: 'equal' | 'insert' | 'delete';
  text: string;
}

/** Compute a list of diff segments between original and proposed text */
export function computeDiff(original: string, proposed: string): DiffSegment[] {
  const diffs = dmp.diff_main(original, proposed);
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map(([op, text]) => ({
    type: op === 0 ? 'equal' : op === 1 ? 'insert' : 'delete',
    text,
  }));
}

/** Check if the proposed text is actually different from the original */
export function hasDifferences(original: string, proposed: string): boolean {
  return original !== proposed;
}
