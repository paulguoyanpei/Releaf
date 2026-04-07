/**
 * Tracks file content hashes to avoid sending unchanged files
 * to Claude on subsequent prompts.
 */

import { KEYS } from '../utils/storage-keys';
import type { ProjectFile } from '../types/overleaf';

/** Simple string hash for quick comparison */
function hashContent(content: string): number {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}

type SnapshotMap = Record<string, number>;

/** Load snapshots from storage */
async function loadSnapshots(projectId: string): Promise<SnapshotMap> {
  const key = KEYS.fileSnapshots(projectId);
  const result = await chrome.storage.local.get(key);
  return (result[key] as SnapshotMap) ?? {};
}

/** Save snapshots to storage */
async function saveSnapshots(projectId: string, snapshots: SnapshotMap): Promise<void> {
  const key = KEYS.fileSnapshots(projectId);
  await chrome.storage.local.set({ [key]: snapshots });
}

/**
 * Given files with content, mark which ones have changed since the last snapshot.
 * Returns files with `content` set only if they changed; otherwise content is undefined.
 * Updates the stored snapshots.
 */
export async function filterChangedFiles(
  projectId: string,
  files: ProjectFile[]
): Promise<ProjectFile[]> {
  const snapshots = await loadSnapshots(projectId);
  const newSnapshots: SnapshotMap = {};
  const result: ProjectFile[] = [];

  for (const file of files) {
    const content = file.content ?? '';
    const hash = hashContent(content);
    newSnapshots[file.path] = hash;

    if (snapshots[file.path] === hash) {
      // Unchanged — send without content
      result.push({ name: file.name, path: file.path });
    } else {
      // Changed or new — send with content
      result.push(file);
    }
  }

  await saveSnapshots(projectId, newSnapshots);
  return result;
}
