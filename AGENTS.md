# Pi Agent Web - Development Notes

## 项目规则

- **搜索项目代码时优先使用 graphify 工具**：`graphify query "<question>"` 查询图谱，而非 grep/手动搜索
- **graphify 已安装**：Python 解释器路径 `/home/even/.local/share/uv/tools/graphifyy/bin/python3`
- **graphify-out/** 已存在：包含 `graph.json`、`GRAPH_REPORT.md`、`graph.html`，可直接查询

## Quick Start

```bash
npm run dev   # port 9527
```

Typecheck: `node_modules/.bin/tsc --noEmit`  
Lint: `node node_modules/next/dist/bin/next lint`  
**Never run `next build` during dev** — pollutes `.next/` and breaks `npm run dev`.

---

## Architecture

```
Browser                Next.js Server              AgentSession (in-process)
  │                        │                               │
  ├─ GET /api/sessions ────▶ reads ~/.pi/agent/sessions/   │
  ├─ GET /api/sessions/[id] reads .jsonl file directly     │
  │                        │                               │
  ├─ send message ─────────▶ POST /api/agent/[id]          │
  │                        │   startRpcSession() ─────────▶│ createAgentSession()
  │                        │   session.send(cmd) ─────────▶│ session.prompt()
  │                        │                               │
  ├─ SSE connect ──────────▶ GET /api/agent/[id]/events    │
  │                        │   session.onEvent() ◀─────────│ session.subscribe()
  │◀── data: {...} ─────────│                               │
```

**Session browsing** (read-only): reads `.jsonl` files directly via `lib/session-reader.ts` — no AgentSession created.  
**Sending a message**: `startRpcSession()` in `lib/rpc-manager.ts` creates an AgentSession in-process.

---

## File Map

```
app/api/
  sessions/route.ts               GET  list all sessions
  sessions/[id]/route.ts          GET/PATCH/DELETE session
  sessions/[id]/context/route.ts  GET ?leafId= — context for a specific leaf
  sessions/new/route.ts           returns 410 (no longer used)
  agent/new/route.ts              POST { cwd, message, toolNames?, provider?, modelId? }
  agent/[id]/route.ts             GET state | POST any command
  agent/[id]/events/route.ts      GET SSE stream
  files/[...path]/route.ts        GET file contents for viewer
  models/route.ts                 GET { models, modelList, defaultModel }
  models-config/route.ts          GET/POST — read/write ~/.pi/agent/models.json

lib/
  rpc-manager.ts      AgentSessionWrapper + registry + startRpcSession
  session-reader.ts   parse .jsonl; getModelNameMap/getModelList/getDefaultModel
  types.ts            shared TypeScript types
  normalize.ts        normalizeToolCalls() — field name mismatch between file format and our types
  system-prompt-off.ts  minimal system prompt when all tools are disabled

components/
  AppShell.tsx        layout + URL state + tab management
  SessionSidebar.tsx  session tree + FileExplorer
  ChatWindow.tsx      messages + streaming + SSE + fork/navigate logic
  ChatInput.tsx       input bar + model/thinking/tools/compact controls
  MessageView.tsx     renders one message (user/assistant/toolCall/toolResult)
  BranchNavigator.tsx in-session branch switcher
  ChatMinimap.tsx     scroll minimap alongside the message list
  ToolPanel.tsx       exports PRESET_NONE/DEFAULT/FULL + getPresetFromTools
  ModelsConfig.tsx    modal for editing models.json (opened from sidebar bottom)
  FileExplorer.tsx    file tree inside sidebar
  FileViewer.tsx      file content in a tab
  TabBar.tsx          tab bar (Chat + open file tabs)
```

---

## Key Design Decisions & Traps

### AgentSession lifecycle (`lib/rpc-manager.ts`)
- One `AgentSessionWrapper` per session id, keyed in `globalThis.__piSessions`
- `globalThis` survives Next.js hot-reload; plain module-level Map does not
- Idle timeout: 10 minutes. Concurrent `startRpcSession()` calls share a single start Promise (`globalThis.__piStartLocks`)

### Fork must destroy the wrapper immediately
`AgentSession.fork()` **mutates the wrapper's inner state in-place** — after fork, `inner.sessionId` is the *new* session's id. If the wrapper stays alive in the registry under the old id, the next request gets the already-forked state and subsequent forks produce a corrupt `parentSession` chain.

**Fix**: `send("fork")` captures `newSessionId`, then calls `this.destroy()` before returning. The next request for the original session reloads a clean AgentSession from the original file.

### Two kinds of branching — don't confuse them
- **Fork** (Fork button on user message): creates a new independent `.jsonl` file. Shown as a child in the sidebar tree via `parentSession` header field.
- **In-session branch** (Continue button / BranchNavigator): calls `navigate_tree` within the same file. Multiple entries share the same `parentId`. Switching between them calls `/api/sessions/[id]/context?leafId=`.

### Session files can be fully rewritten
`parentSession` in the header is **display metadata only** — has zero effect on chat content. Safe to `writeFileSync` the entire file (pi does this itself during migrations). Used when cascade-reparenting children on delete.

### ToolCall field normalization
Pi stores toolCall blocks as `{type:"toolCall", id, name, arguments}` but `ToolCallContent` uses `{toolCallId, toolName, input}`. `normalizeToolCalls()` in `lib/normalize.ts` handles this — called in both `session-reader.ts` (file load) and `ChatWindow.handleAgentEvent()` (streaming).

### New session tool preset
Tool names are passed at session creation (`POST /api/agent/new` → `toolNames[]`). For existing sessions, the active preset is inferred on mount via `get_tools` → `getPresetFromTools()`. When tools are fully disabled (`toolNames = []`), `rpc-manager.ts` injects a minimal system prompt via `system-prompt-off.ts` + `DefaultResourceLoader`.

### Model defaults for new sessions
`GET /api/models` returns `defaultModel` read from `~/.pi/agent/settings.json`. `ChatWindow` pre-selects this on mount for new sessions.

### SSE reconnect on page refresh mid-stream
On `ChatWindow` mount, `GET /api/agent/[id]` is called. If `state.isStreaming === true`, SSE is reconnected automatically. `thinkingLevel` and `isCompacting` are also synced from this response.

### Compaction SSE events
Newer pi emits `compaction_start` / `compaction_end`; older versions emitted `auto_compaction_start` / `auto_compaction_end`. `handleAgentEvent` accepts both sets to keep `isCompacting` in sync. Manual compact is a blocking POST — the button stays disabled until the response returns.

### Orphaned sessions
Sessions whose first line can't be parsed as a valid header are marked `orphaned: true` in the API response — displayed with an "incomplete" badge in the sidebar and not clickable.

---

## Pi Session File Format

Location: `~/.pi/agent/sessions/<encoded-cwd>/<timestamp>_<uuid>.jsonl`

```jsonl
{"type":"session","version":3,"id":"<uuid>","timestamp":"...","cwd":"/path","parentSession":"/abs/path/to/parent.jsonl"}
{"type":"model_change","id":"<8hex>","parentId":null,"provider":"zenmux","modelId":"claude-sonnet-4-6","timestamp":"..."}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"user","content":"..."}}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"assistant","content":[...],...}}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"toolResult","toolCallId":"...","content":[...]}}
{"type":"compaction","id":"<8hex>","parentId":"<8hex>","summary":"...","firstKeptEntryId":"<8hex>","tokensBefore":N}
{"type":"session_info","id":"...","parentId":"...","name":"user-defined name"}
```

`entryIds[]` in `SessionContext` is a parallel array to `messages[]` — maps each displayed message back to its `.jsonl` entry id, used for fork and navigate_tree calls.

---

## CSS Variables (`app/globals.css`)

```
--bg --bg-panel --bg-hover --bg-selected --border
--text --text-muted --text-dim
--accent --user-bg --tool-bg
--font-mono
```

---

## 二次开发总结

### 版本信息
- **包名**: `my-pi-web`
- **版本**: `1.0.0`
- **端口**: `9527`
- **生产模式**: PM2 常驻 (`pm2 start node_modules/next/dist/bin/next --name pi-web -- start -p 9527`)

### 新增功能

#### 1. 输入框增强
- **"/" 命令自动补全**: `/skill:<名称>` 技能调用，从 `/api/skills` 动态获取技能列表，67 个技能全部有中文描述
- **语音输入**: Web Speech API，麦克风按钮，Chrome/Edge 支持
- **提示音**: 5 种预设（叮咚/柔和风铃/水晶/轻铃/通知），右键切换预览，`localStorage` 持久化
- **后台保活**: `visibilitychange` 监听 + SSE 重建 + fetch 同步状态

#### 2. 状态栏（TUI Footer 格式）
显示：`↑输入 ↓输出 R缓存 CH命中率 $费用 上下文%/窗口`
- 纯文本 + 作用域前缀，移除 SVG 图标
- 费用用 USD 显示（`$X.XXX`）

#### 3. 右侧文件阅览器
- **可拖拽调整宽度**: 分割线在右面板左边缘，拖拽范围 15%-70%
- **SyntaxHighlighter 宽度修复**: `customStyle` 加 `width: "100%"` + `whiteSpace: "pre-wrap"` + `wordBreak: "break-all"`

#### 4. 消息缩略图（ChatMinimap）
- **极简竖线设计**: 20px 宽，透明背景，圆点标记消息位置
- **过滤模式**: `U`（仅用户）/ `UA`（全部），点击切换，`localStorage` 持久化
- **均匀分布**: 两种模式独立计算间距，不互相绑定
- **Tooltip**: 鼠标悬停显示消息预览 + 时间标签（HH:MM）

#### 5. 大会话渐进式加载
- **阈值**: < 500 条完整加载，500-2000 加载最近 200 条，> 2000 加载最近 100 条
- **跳过 tree 构建**: 大会话不调用 `sm.getTree()`（避免栈溢出）
- **跳过 `sm.getSessionName()`**: 大会话直接显示 header 信息

#### 6. 其他
- **Explorer 默认收起**: `useState(false)`
- **提示框精简**: `Message…`
- **主题精简**: 6 个主题（删除护眼绿、深海蓝、秋叶褐）

### 踩过的坑

#### 1. 大会话 500 错误
**现象**: 2738 条消息的会话返回 `Maximum call stack size exceeded`  
**根因**: `sm.getTree()` 对大会话有深层递归/循环引用；`sm.getSessionName()` 内部也有类似问题  
**修复**: 对超过 2000 条的会话，跳过 `getTree()` 和 `getSessionName()`，直接用 `sm.getHeader()` 获取基本信息  
**教训**: `NextResponse.json()` 序列化对象时，如果对象内部有循环引用，会抛出栈溢出错误，但不会打印在日志中  

#### 2. Web → TUI 消息不同步（分叉问题）
**现象**: Web 端发的消息在 TUI 端看不到，TUI 发的消息在 Web 端也看不到  
**根因**: 两个客户端同时写同一个 `.jsonl` 文件，各自用内存中的 `parentId` 链，导致分叉  
**本质**: pi 是单客户端设计，SessionManager 维护内存中的 parentId 链，不监听外部文件变化  
**结论**: 不可修复（架构限制），建议同时只用一个客户端  

#### 3. Web 端消息刷新后丢失
**现象**: Web 端发消息后刷新页面，消息消失  
**根因**: `prompt()` 是 fire-and-forget，消息还没写入 `.jsonl` 文件就返回了  
**修复**: `rpc-manager.ts` 中 `prompt` 命令改为等待 `agent_start` 事件（最多 5s）再返回  

#### 4. 拖拽方向反转
**现象**: 向右拖拽分割线，右面板反而变大  
**根因**: 拖拽逻辑用 `+ dx`，但分割线在右面板左边缘，应该用 `- dx`  

#### 5. 右侧文件阅览器白色空白
**现象**: 代码只占面板左侧 60%，右侧大面积空白  
**根因**: `<pre>` 元素没有 `width: 100%`，只有 `max-width: 100%`。`<pre>` 的宽度 = 内容宽度，不会自动撑满容器  
**诊断方法**: 浏览器 Console 跑诊断脚本，检查 `outerHTML` 发现 `customStyle` 的 `width` 未生效  
**修复**: `customStyle` 加 `width: "100%"` + `whiteSpace: "pre-wrap"`  

#### 6. SyntaxHighlighter 的 `wrapLongLines` 不生效
**现象**: `<pre>` 的 `white-space` 是 `pre` 不是 `pre-wrap`  
**根因**: `wrapLongLines` 只对 `<code>` 设了 `pre-wrap`，但 `<pre>` 本身是 `pre`，子元素继承的是 `<pre>` 的值  
**修复**: 在 `customStyle` 中显式设置 `whiteSpace: "pre-wrap"`  

#### 7. PM2 开机自启配置
**现象**: `pm2 startup` 输出的命令有 PATH 空格问题  
**修复**: 用绝对路径 `sudo /home/even/.npm-global/lib/node_modules/pm2/bin/pm2 startup systemd -u even --hp /home/even`  

#### 8. WSL2 systemd user 不可用
**现象**: `systemctl --user start pi-web` 报 `Failed to connect to user scope bus`  
**原因**: WSL2 的 user systemd 实例未启动  
**解决**: 用系统级 systemd 或改用 PM2（最终选择 PM2）  

#### 9. Sidebar 宽度拖拽导致布局崩坏
**现象**: 左侧 sidebar 和右侧 panel 同时拖拽后，布局变形  
**根因**: sidebar wrapper div 没有设置 `width`，CSS 有 `!important` 覆盖了 inline style  
**修复**: 回退 sidebar 拖拽（改为固定 260px），只保留右面板拖拽  

#### 10. Minimap 间距与 all 模式绑定
**现象**: user-only 模式下用户消息间距很大  
**根因**: 两种模式共用同一套均匀分布逻辑，user-only 模式节点少所以间距大  
**修复**: 两种模式独立计算——all 模式用均匀分布，user-only 模式按占比压缩到对应区域  

### 技术栈
- **前端**: Next.js 16.2.1 + React 19 + TypeScript 5 + Turbopack
- **后端**: pi-coding-agent (RPC mode, AgentSession in-process)
- **进程管理**: PM2
- **部署**: WSL2 + Ubuntu

