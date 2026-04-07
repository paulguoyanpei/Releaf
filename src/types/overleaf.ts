/** Represents a file in the Overleaf project tree */
export interface ProjectFile {
  name: string;
  path: string;
  content?: string;
}

/** Context scope: all .tex files or just the active one */
export type ContextScope = 'full-project' | 'current-file';

/** Commands the sidebar sends to the main-world bridge */
export type BridgeCommand =
  | { action: 'getSelection' }
  | { action: 'getDocument' }
  | { action: 'getCursorPosition' }
  | { action: 'insertAtCursor'; payload: { text: string } }
  | { action: 'replaceSelection'; payload: { text: string } }
  | { action: 'replaceRange'; payload: { from: number; to: number; text: string } }
  | { action: 'replaceDocument'; payload: { text: string } };

/** Response from the bridge */
export interface BridgeResponse {
  id: string;
  result: unknown;
}
