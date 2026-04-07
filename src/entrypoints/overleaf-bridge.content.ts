/**
 * Main-world content script for Overleaf.
 * Runs in the page's JS context to access CodeMirror 6 EditorView directly.
 * Communicates with the ISOLATED world sidebar via CustomEvents.
 */

import { COMMAND_EVENT, RESPONSE_EVENT } from '../messaging/bridge-events';

export default defineContentScript({
  matches: ['https://www.overleaf.com/project/*'],
  world: 'MAIN',
  runAt: 'document_idle',

  main() {
    /** Find the active CodeMirror EditorView */
    function getEditorView(): any | null {
      const cmEditor = document.querySelector('.cm-editor');
      if (!cmEditor) return null;
      const cmContent = cmEditor.querySelector('.cm-content') as any;
      return cmContent?.cmView?.view ?? null;
    }

    /** Handle commands from the ISOLATED world */
    document.addEventListener(COMMAND_EVENT, (e: Event) => {
      const { id, action, payload } = (e as CustomEvent).detail;
      const view = getEditorView();
      let result: unknown = null;

      if (!view) {
        document.dispatchEvent(
          new CustomEvent(RESPONSE_EVENT, { detail: { id, result: null } })
        );
        return;
      }

      switch (action) {
        case 'getSelection': {
          const { from, to } = view.state.selection.main;
          result = from !== to ? view.state.sliceDoc(from, to) : '';
          break;
        }
        case 'getDocument': {
          result = view.state.doc.toString();
          break;
        }
        case 'getCursorPosition': {
          result = view.state.selection.main.head;
          break;
        }
        case 'insertAtCursor': {
          const pos = view.state.selection.main.head;
          view.dispatch({ changes: { from: pos, insert: payload.text } });
          result = true;
          break;
        }
        case 'replaceSelection': {
          const sel = view.state.selection.main;
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: payload.text },
          });
          result = true;
          break;
        }
        case 'replaceRange': {
          view.dispatch({
            changes: { from: payload.from, to: payload.to, insert: payload.text },
          });
          result = true;
          break;
        }
        case 'replaceDocument': {
          const length = view.state.doc.length;
          view.dispatch({
            changes: { from: 0, to: length, insert: payload.text },
          });
          result = true;
          break;
        }
      }

      document.dispatchEvent(
        new CustomEvent(RESPONSE_EVENT, { detail: { id, result } })
      );
    });

    // Signal that the bridge is ready
    document.dispatchEvent(new CustomEvent('releaf:bridge-ready'));
  },
});
