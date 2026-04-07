[English](#english) | [中文](#中文)

---

<a id="english"></a>

# Releaf (Vibing Overleaf)

AI-powered writing assistant for Overleaf. *Releaf* the stress of academic writing.

The alpha version uses your existing claude.ai session — no API key, no backend, no extra subscription.

## Features

- **Resizable chat sidebar** injected into Overleaf with persistent per-project history
- **Detachable window** — pop the sidebar out into a standalone window
- **Smart editing** — AI returns structured edits; review diffs per-file, toggle individual changes, then apply
- **Checkpoint rollback** — auto-snapshots after each AI reply; one-click rollback restores chat and document
- **New session** — clear chat and start a fresh conversation instantly
- **Context-aware** — sends full project or current file as context to Claude
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
- **Rollback** — reverts chat and document to this checkpoint

All actions show a diff preview first. You can accept, reject, or edit before applying.

## Development

```bash
npm run dev          # Dev mode with HMR
npm run build        # Production build
npm run typecheck    # TypeScript type checking
npm run zip          # Package for distribution
```

## Architecture

The extension uses six scripts across three execution contexts:

- **Background service worker** — proxies API calls to claude.ai with session cookies, streams responses over ports, manages sidebar window lifecycle
- **Overleaf content script (ISOLATED)** — renders the Shadow DOM sidebar with React, resizable via drag handle
- **Overleaf bridge (MAIN world)** — accesses CodeMirror 6 `EditorView` for reading/writing the editor
- **Claude.ai content script** — lightweight session presence signal
- **Popup** — quick connection status display
- **Standalone sidebar window** — detached sidebar reusing the same React components

Communication between the sidebar and the editor bridge uses `CustomEvent`. Communication with the background worker uses `chrome.runtime.connect` ports for streaming.

## Limitations (Alpha)

- Chrome only (no Firefox/Safari)
- claude.ai session bridging relies on undocumented internal endpoints
- Single LLM (Claude only)
- No citation assistant, rebuttal mode, or structured review pipeline

## License

MIT

---

<a id="中文"></a>

# Releaf (Vibing Overleaf)

面向 Overleaf 的 AI 写作助手。*Releaf* 你的学术写作压力。

Alpha 版本直接复用浏览器中已有的 claude.ai 会话 —— 无需 API Key，无需后端，无需额外订阅。

## 功能特性

- **可调宽度的聊天侧边栏** —— 嵌入 Overleaf 页面，按项目持久化聊天记录
- **独立窗口模式** —— 将侧边栏弹出为独立窗口，方便多屏操作
- **智能编辑** —— AI 以结构化格式返回修改建议；按文件分组展示差异，可逐条开关，确认后一键应用
- **检查点回滚** —— 每轮 AI 回复后自动保存快照；一键回滚，同时恢复聊天记录和文档内容
- **一键新建会话** —— 清空聊天记录，立即开始全新对话
- **上下文感知** —— 可发送整个项目或当前文件作为上下文
- **协作安全** —— 所有编辑通过 CodeMirror 事务系统执行，完全兼容 Overleaf 协作编辑与版本历史
- **LaTeX 感知** —— 提示词经过结构化处理，确保生成合法的 LaTeX 语法
- **文本选择** —— 编辑器中选中的文本自动引用到聊天输入框
- **系统提示词** —— 可持久化设置写作风格、投稿会议规范等指令
- **智能上下文追踪** —— 仅重新发送有变更的文件，节省 token 用量

## 安装

```bash
npm install
npm run build
```

然后在 Chrome 中：
1. 打开 `chrome://extensions`
2. 开启**开发者模式**
3. 点击**加载已解压的扩展程序** → 选择 `.output/chrome-mv3` 目录

## 使用方法

1. 在同一浏览器中登录 [claude.ai](https://claude.ai)（Free、Pro 或 Max 均可）
2. 打开一个 Overleaf 项目 —— AI 侧边栏会出现在右侧
3. 在 Settings 标签页中确认绿色状态点表示已连接
4. 在编辑器中选中文本，或直接输入提示词，然后发送

### 每条 AI 回复的操作按钮

- **Insert at cursor** —— 在当前光标位置插入
- **Replace selection** —— 替换编辑器中选中的文本
- **Add as comment** —— 以 `% ` 注释形式插入
- **Rollback** —— 回滚聊天记录和文档到此检查点

所有操作均先展示差异预览，可选择接受、拒绝或编辑后再应用。

## 开发

```bash
npm run dev          # 开发模式（支持 HMR 热更新）
npm run build        # 生产环境构建
npm run typecheck    # TypeScript 类型检查
npm run zip          # 打包分发
```

## 架构

扩展包含六个脚本，运行在三种执行上下文中：

- **Background Service Worker** —— 代理 claude.ai API 请求（自动携带 session cookie），流式传输响应，管理独立窗口生命周期
- **Overleaf 内容脚本 (ISOLATED)** —— 在 Shadow DOM 中渲染 React 侧边栏，支持拖拽调节宽度
- **Overleaf 桥接脚本 (MAIN world)** —— 访问 CodeMirror 6 的 `EditorView`，实现编辑器读写
- **Claude.ai 内容脚本** —— 轻量级会话存活信号
- **Popup** —— 快速查看连接状态
- **独立侧边栏窗口** —— 弹出式侧边栏，复用同一套 React 组件

侧边栏与编辑器桥接脚本之间通过 `CustomEvent` 通信；与 Background Worker 之间通过 `chrome.runtime.connect` 端口进行流式通信。

## 当前限制（Alpha）

- 仅支持 Chrome（不支持 Firefox / Safari）
- claude.ai 会话桥接依赖未公开的内部接口
- 仅支持单一 LLM（Claude）
- 暂无引用助手、审稿回复模式等高级功能

## 许可证

MIT
