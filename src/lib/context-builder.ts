/**
 * Assembles the full prompt sent to Claude, including:
 * - System prompt (writing style, venue conventions)
 * - Project context (file contents)
 * - Current selection (if any)
 * - User instruction
 */

import type { ProjectFile, ContextScope } from '../types/overleaf';

export interface ContextInput {
  systemPrompt: string;
  scope: ContextScope;
  files: ProjectFile[];
  currentFileName: string;
  selectedText: string;
  userPrompt: string;
}

/** Build the full prompt string */
export function buildPrompt(input: ContextInput): string {
  const parts: string[] = [];

  // System instructions
  if (input.systemPrompt.trim()) {
    parts.push(`<system>\n${input.systemPrompt.trim()}\n</system>`);
  }

  parts.push(
    '<instructions>',
    'You are an expert LaTeX writing assistant embedded in the Overleaf editor.',
    'Always preserve valid LaTeX syntax.',
    '',
    'When you need to modify the document, use the following structured format for EACH file you want to change.',
    'You may include multiple SEARCH/REPLACE pairs in one EDIT block, and multiple EDIT blocks for different files.',
    'The SEARCH text must exactly match existing content in the file (including whitespace).',
    '',
    '<<<EDIT file="filename.tex"',
    '<<<SEARCH',
    'exact text to find in the file',
    '===',
    'new text to replace it with',
    'REPLACE>>>',
    'EDIT>>>',
    '',
    'You can also include a brief explanation outside the EDIT blocks.',
    'If the user only asks a question and no edit is needed, just answer normally without EDIT blocks.',
    '</instructions>'
  );

  // Project context
  if (input.files.length > 0) {
    parts.push('<project-context>');
    for (const file of input.files) {
      if (file.content) {
        parts.push(`\\file{${file.path}}\n${file.content}\n\\endfile`);
      } else {
        parts.push(`\\file{${file.path}} [unchanged since last message]`);
      }
    }
    parts.push('</project-context>');
  }

  // Current file indicator
  parts.push(`<current-file>${input.currentFileName}</current-file>`);

  // Selection context
  if (input.selectedText) {
    parts.push(`<selected-text>\n${input.selectedText}\n</selected-text>`);
  }

  // User instruction
  parts.push(`<user-request>\n${input.userPrompt}\n</user-request>`);

  return parts.join('\n\n');
}

/** Rough token estimate (~4 chars per token) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
