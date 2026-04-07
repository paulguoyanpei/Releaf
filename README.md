# Releaf

AI-powered writing assistant for Overleaf. *Releaf* the stress of academic writing.

The alpha version uses your existing claude.ai session — no API key, no backend, no extra subscription.

## Features

- **Chat sidebar** injected into Overleaf with persistent per-project history
- **Context-aware** — sends full project or current file as context to Claude
- **Diff-based insertion** — preview changes before applying, with accept/reject/edit
- **Collaboration-safe** — edits go through CodeMirror's transaction system, fully compatible with Overleaf collaboration and version history
- **LaTeX-aware** — prompts are structured to preserve valid LaTeX syntax
- **Text selection** — selected editor text is auto-quoted into the chat input
- **System prompts** — persistent instructions for writing style, venue conventions, etc.
- **Smart context tracking** — only re-sends changed files to stay within token limits

## Install

```bash
npm install
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `.output/chrome-mv3` directory

## Usage

1. Log into [claude.ai](https://claude.ai) in the same browser (Free, Pro, or Max)
2. Open an Overleaf project — the AI sidebar appears on the right
3. Check the green status dot in Settings to confirm connection
4. Select text in the editor and/or type a prompt, then send

### Action buttons on each response

- **Insert at cursor** — inserts at current cursor position
- **Replace selection** — replaces selected text in the editor
- **Add as comment** — inserts as `% ` commented LaTeX

All actions show a diff preview first. You can accept, reject, or edit before applying.

## Development

```bash
npm run dev          # Dev mode with HMR
npm run build        # Production build
npm run typecheck    # TypeScript type checking
npm run zip          # Package for distribution
```

## Architecture

The extension uses five scripts across three execution contexts:

- **Background service worker** — proxies API calls to claude.ai with session cookies, streams responses over ports
- **Overleaf content script (ISOLATED)** — renders the Shadow DOM sidebar with React
- **Overleaf bridge (MAIN world)** — accesses CodeMirror 6 `EditorView` for reading/writing the editor
- **Claude.ai content script** — lightweight session presence signal
- **Popup** — quick connection status display

Communication between the sidebar and the editor bridge uses `CustomEvent`. Communication with the background worker uses `chrome.runtime.connect` ports for streaming.

## Limitations (Alpha)

- Chrome only (no Firefox/Safari)
- claude.ai session bridging relies on undocumented internal endpoints
- Single LLM (Claude only)
- No citation assistant, rebuttal mode, or structured review pipeline

## License

MIT
