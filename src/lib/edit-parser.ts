/**
 * Parses structured edit blocks from AI responses.
 *
 * Expected format in AI output:
 *
 * <<<EDIT file="main.tex"
 * <<<SEARCH
 * old text to find
 * ===
 * new text to replace with
 * REPLACE>>>
 * EDIT>>>
 *
 * A single EDIT block can contain multiple SEARCH/REPLACE pairs.
 */

export interface EditBlock {
  file: string;
  replacements: Replacement[];
}

export interface Replacement {
  search: string;
  replace: string;
}

/**
 * Parse all edit blocks from an AI response string.
 * Returns empty array if no structured edits found.
 */
export function parseEditBlocks(content: string): EditBlock[] {
  const blocks: EditBlock[] = [];

  // Match <<<EDIT file="...">>> ... EDIT>>>
  const editRegex = /<<<EDIT\s+file="([^"]+)"\s*\n([\s\S]*?)EDIT>>>/g;
  let editMatch: RegExpExecArray | null;

  while ((editMatch = editRegex.exec(content)) !== null) {
    const file = editMatch[1];
    const body = editMatch[2];
    const replacements: Replacement[] = [];

    // Match <<<SEARCH ... === ... REPLACE>>> within the edit block
    const replRegex = /<<<SEARCH\n([\s\S]*?)\n===\n([\s\S]*?)\nREPLACE>>>/g;
    let replMatch: RegExpExecArray | null;

    while ((replMatch = replRegex.exec(body)) !== null) {
      replacements.push({
        search: replMatch[1],
        replace: replMatch[2],
      });
    }

    if (replacements.length > 0) {
      blocks.push({ file, replacements });
    }
  }

  return blocks;
}

/**
 * Check if an AI response contains structured edit blocks.
 */
export function hasEditBlocks(content: string): boolean {
  return /<<<EDIT\s+file="/.test(content);
}

/**
 * Strip edit blocks from the AI response to get the explanation text only.
 */
export function stripEditBlocks(content: string): string {
  return content
    .replace(/<<<EDIT\s+file="[^"]+"\s*\n[\s\S]*?EDIT>>>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
