/**
 * CustomEvent bridge between ISOLATED and MAIN world content scripts on Overleaf.
 *
 * The ISOLATED world script (sidebar UI) sends commands to the MAIN world script
 * (which has access to CodeMirror's EditorView) via CustomEvents on document.
 */

import type { BridgeCommand, BridgeResponse } from '../types/overleaf';

const COMMAND_EVENT = 'releaf:command';
const RESPONSE_EVENT = 'releaf:response';

let nextId = 0;

/** Send a command to the main-world bridge and await the response */
export function sendBridgeCommand<T = unknown>(command: BridgeCommand): Promise<T> {
  const id = String(++nextId);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      document.removeEventListener(RESPONSE_EVENT, handler);
      reject(new Error(`Bridge command timed out: ${command.action}`));
    }, 5000);

    function handler(e: Event) {
      const detail = (e as CustomEvent<BridgeResponse>).detail;
      if (detail.id !== id) return;
      clearTimeout(timeout);
      document.removeEventListener(RESPONSE_EVENT, handler);
      resolve(detail.result as T);
    }

    document.addEventListener(RESPONSE_EVENT, handler);
    document.dispatchEvent(
      new CustomEvent(COMMAND_EVENT, { detail: { id, ...command } })
    );
  });
}

export { COMMAND_EVENT, RESPONSE_EVENT };
