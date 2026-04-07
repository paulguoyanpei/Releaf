/**
 * Parse the Overleaf project file tree from the DOM.
 * Uses ARIA-based selectors for stability across Overleaf versions.
 */

import type { ProjectFile } from '../types/overleaf';

const TEXT_EXTENSIONS = ['.tex', '.bib', '.cls', '.sty', '.bst', '.txt', '.md', '.bbl'];

/** Parse visible file tree items from the Overleaf sidebar */
export function parseFileTree(): ProjectFile[] {
  const files: ProjectFile[] = [];
  const items = document.querySelectorAll(
    '.file-tree-inner li[role="treeitem"]'
  );

  for (const item of items) {
    // Skip folders (they have nested lists or expand buttons)
    if (item.querySelector('ul') || item.querySelector('[aria-expanded]')) {
      continue;
    }

    const nameEl =
      item.querySelector('.item-name-button span') ??
      item.querySelector('[class*="name"]');
    const name = nameEl?.textContent?.trim() ?? '';
    if (!name) continue;

    // Only include text-based files
    const ext = name.substring(name.lastIndexOf('.'));
    if (!TEXT_EXTENSIONS.includes(ext)) continue;

    // Build path from parent folder structure
    const path = buildFilePath(item, name);
    files.push({ name, path });
  }

  return files;
}

/** Walk up the DOM tree to reconstruct the full file path */
function buildFilePath(item: Element, fileName: string): string {
  const parts: string[] = [fileName];
  let current = item.parentElement;

  while (current) {
    if (current.matches('li[role="treeitem"]')) {
      const folderName =
        current.querySelector(':scope > .item-name-button span')?.textContent?.trim() ??
        current.querySelector(':scope > [class*="name"]')?.textContent?.trim();
      if (folderName) parts.unshift(folderName);
    }
    if (current.matches('.file-tree-inner')) break;
    current = current.parentElement;
  }

  return parts.join('/');
}

/** Click a file in the tree to make it the active editor file */
export async function switchToFile(file: ProjectFile): Promise<void> {
  const items = document.querySelectorAll(
    '.file-tree-inner li[role="treeitem"]'
  );

  for (const item of items) {
    const nameEl = item.querySelector('.item-name-button span') ??
      item.querySelector('[class*="name"]');
    if (nameEl?.textContent?.trim() === file.name) {
      const button = item.querySelector('.item-name-button') as HTMLElement | null;
      button?.click();
      // Wait for CodeMirror to load the new file
      await new Promise((resolve) => setTimeout(resolve, 300));
      return;
    }
  }
}
