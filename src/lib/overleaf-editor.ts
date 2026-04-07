/**
 * Wrapper over the CustomEvent bridge to the main-world script.
 * Provides a clean async API for the sidebar UI to interact with
 * the Overleaf CodeMirror 6 editor.
 */

import { sendBridgeCommand } from '../messaging/bridge-events';

/** Get the currently selected text in the editor */
export function getSelection(): Promise<string> {
  return sendBridgeCommand<string>({ action: 'getSelection' });
}

/** Get the full document content of the active file */
export function getDocument(): Promise<string> {
  return sendBridgeCommand<string>({ action: 'getDocument' });
}

/** Get the current cursor position (character offset) */
export function getCursorPosition(): Promise<number> {
  return sendBridgeCommand<number>({ action: 'getCursorPosition' });
}

/** Insert text at the current cursor position */
export function insertAtCursor(text: string): Promise<boolean> {
  return sendBridgeCommand<boolean>({ action: 'insertAtCursor', payload: { text } });
}

/** Replace the current selection with new text */
export function replaceSelection(text: string): Promise<boolean> {
  return sendBridgeCommand<boolean>({ action: 'replaceSelection', payload: { text } });
}

/** Replace a specific character range with new text */
export function replaceRange(from: number, to: number, text: string): Promise<boolean> {
  return sendBridgeCommand<boolean>({
    action: 'replaceRange',
    payload: { from, to, text },
  });
}
