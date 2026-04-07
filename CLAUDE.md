# CLAUDE.md

## Project Overview

Releaf is a Chrome extension (Manifest V3) that embeds an AI-powered writing assistant into the Overleaf LaTeX editor. The alpha version uses the user's existing claude.ai web session — no API key, no backend, no extra subscription.

## Tech Stack

- **Framework**: WXT 0.18 (Vite-based Chrome extension framework)
- **UI**: React 19, inline CSS in Shadow DOM (Catppuccin Mocha theme)
- **Language**: TypeScript (strict mode, zero errors)
- **Deps**: diff-match-patch, highlight.js

## Architecture

Six scripts across three execution contexts:

| Script | World | Page | Purpose |
|--------|-------|------|---------|
| `background.ts` | Service Worker | Always | claude.ai API proxy, streaming, window management |
| `overleaf.content.ts` | ISOLATED | overleaf.com/project/* | Shadow DOM sidebar UI |
| `overleaf-bridge.content.ts` | MAIN | overleaf.com/project/* | CodeMirror 6 EditorView access |
| `claude-bridge.content.ts` | ISOLATED | claude.ai/* | Session presence signal |
| `popup/` | Extension | Popup click | Quick status display |
| `sidebar/` | Extension | Standalone window | Detached sidebar (same React components) |

**Why two Overleaf scripts**: CodeMirror's `EditorView` lives on the page's `window`, inaccessible from ISOLATED world. The MAIN-world bridge accesses it; the ISOLATED script owns the UI and communicates via `CustomEvent`.

**Message flow**:
```
Sidebar (ISOLATED) <--CustomEvent--> Bridge (MAIN, EditorView)
       |
       | chrome.runtime.connect (port)
       v
  Background Service Worker --> fetch() to claude.ai/api/* (session cookies auto-included)
```

## Key Files

- `src/lib/claude-api.ts` — All claude.ai API logic (undocumented endpoints, isolated for easy updates)
- `src/entrypoints/overleaf-bridge.content.ts` — CodeMirror 6 access via `.cmView.view`
- `src/entrypoints/background.ts` — Service worker orchestrating streaming, message routing, and sidebar window lifecycle
- `src/entrypoints/sidebar/` — Standalone window entrypoint reusing sidebar React components
- `src/lib/context-builder.ts` — Assembles LaTeX-aware prompts from project files

## Build & Dev Commands

```bash
npm install          # Install deps (runs wxt prepare)
npm run dev          # Dev mode with HMR
npm run build        # Production build to .output/chrome-mv3/
npm run typecheck    # TypeScript checking
npm run zip          # Package for Chrome Web Store
```

## Directory Structure

```
src/
  entrypoints/       # WXT entrypoints (background, content scripts, popup, sidebar)
  components/        # React components (sidebar/, common/)
  lib/               # Core logic (claude-api, editor bridge, context, diff)
  messaging/         # Extension message protocol and bridge events
  types/             # TypeScript type definitions
  utils/             # Storage keys, helpers
```

## Important Notes

- claude.ai endpoints are undocumented and may change — all API logic is in `claude-api.ts`
- The MAIN-world bridge uses `view.dispatch()` for edits, which goes through CodeMirror's transaction system and is compatible with Overleaf collaboration/version history
- Shadow DOM isolates sidebar CSS; `isolateEvents` prevents keyboard capture by CodeMirror
- **Resize handle**: mousemove/mouseup listeners must attach to the **host page** `window.document`, not the Shadow DOM's document, because mouse events outside the shadow boundary are lost
- **Standalone window**: uses `?projectId=` URL param so `getProjectId()` works outside Overleaf; editor integration (selection, insert/replace) is unavailable in this mode
- Node 18 compatible (WXT pinned to 0.18.x)
