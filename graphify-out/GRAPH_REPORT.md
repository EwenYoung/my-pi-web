# Graph Report - .  (2026-06-30)

## Corpus Check
- 75 files · ~56,026 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 540 nodes · 806 edges · 40 communities (26 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Chat Minimap|Chat Minimap]]
- [[_COMMUNITY_Agent API Routes|Agent API Routes]]
- [[_COMMUNITY_Code Editor|Code Editor]]
- [[_COMMUNITY_Main App Shell|Main App Shell]]
- [[_COMMUNITY_Model Configuration|Model Configuration]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_File Icons|File Icons]]
- [[_COMMUNITY_Chat Input|Chat Input]]
- [[_COMMUNITY_File API Routes|File API Routes]]
- [[_COMMUNITY_Skills Management|Skills Management]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]

## God Nodes (most connected - your core abstractions)
1. `resolveSessionPath()` - 17 edges
2. `compilerOptions` - 16 edges
3. `GET()` - 12 edges
4. `AgentSessionWrapper` - 11 edges
5. `AgentMessage` - 11 edges
6. `SessionTreeNode` - 11 edges
7. `encodeFilePathForApi()` - 10 edges
8. `getRpcSession()` - 10 edges
9. `startRpcSession()` - 10 edges
10. `SessionEntryBase` - 10 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getRpcSession()`  [EXTRACTED]
  app/api/agent/[id]/route.ts → lib/rpc-manager.ts
- `POST()` --calls--> `startRpcSession()`  [EXTRACTED]
  app/api/agent/new/route.ts → lib/rpc-manager.ts
- `getAllowedRoots()` --calls--> `listAllSessions()`  [EXTRACTED]
  app/api/files/[...path]/route.ts → lib/session-reader.ts
- `GET()` --calls--> `resolveSessionPath()`  [EXTRACTED]
  app/api/sessions/[id]/image/route.ts → lib/session-reader.ts
- `PATCH()` --calls--> `resolveSessionPath()`  [EXTRACTED]
  app/api/sessions/[id]/route.ts → lib/session-reader.ts

## Import Cycles
- None detected.

## Communities (40 total, 14 thin omitted)

### Community 0 - "Chat Minimap"
Cohesion: 0.05
Nodes (47): ChatMinimap(), getDotPreview(), getMessagePreview(), NodeInfo, Props, AssistantMessageView(), formatTime(), formatUsage() (+39 more)

### Community 1 - "Agent API Routes"
Cohesion: 0.09
Nodes (34): GET(), GET(), POST(), POST(), GET(), encodeHeaderValue(), execFileAsync, GET() (+26 more)

### Community 2 - "Code Editor"
Cohesion: 0.09
Nodes (39): CodeMirrorEditor(), langMap, Props, fetchEntries(), FileEntry, FileExplorer(), FileNode, Props (+31 more)

### Community 3 - "Main App Shell"
Cohesion: 0.07
Nodes (28): AppShell(), BranchNavigator(), compress(), getLabel(), hasBranch(), Props, TreeNodeProps, TreeNodeView() (+20 more)

### Community 4 - "Model Configuration"
Cohesion: 0.06
Nodes (19): AddProviderPickerProps, API_OPTIONS, ApiKeyProvider, DEEPSEEK_COMPAT, hasDeepseekCompat(), IconComponent, inputStyle, LEVEL_COLORS (+11 more)

### Community 5 - "Package Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, codemirror, @codemirror/lang-cpp, @codemirror/lang-css, @codemirror/lang-html, @codemirror/lang-java, @codemirror/lang-javascript, @codemirror/lang-json (+23 more)

### Community 7 - "Chat Input"
Cohesion: 0.10
Nodes (23): AttachedImage, ChatInput, ChatInputHandle, ModelOption, Props, SKILL_DESCRIPTIONS_CN, SLASH_COMMANDS, THINKING_LEVEL_DESC (+15 more)

### Community 8 - "File API Routes"
Cohesion: 0.15
Nodes (25): AUDIO_EXT_TO_MIME, createFileBodyStream(), DOCUMENT_EXT_TO_MIME, documentPreviewKind(), encodeHeaderValue(), escapeHtml(), EXT_TO_LANGUAGE, filePathFromSegments() (+17 more)

### Community 9 - "Skills Management"
Cohesion: 0.12
Nodes (19): POST(), parseLimit(), parseSearchOutput(), POST(), searchSkillsApi(), SkillsApiResponse, SkillsApiSkill, SkillSearchResult (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (23): bin, pi-web, description, devDependencies, eslint, eslint-config-next, postcss, tailwindcss (+15 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (16): DirectoryBrowser(), DirectoryBrowserProps, DirEntry, DirListResponse, buildSessionTree(), formatRelativeTime(), getRecentCwds(), PiAgentTitle() (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.21
Nodes (12): CAVEMAN_CONFIG, CavemanConfig, CONFIG_DIR, DEFAULT_CAVEMAN, DEFAULT_RTK, fileExists(), GET(), PUT() (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.20
Nodes (9): child, fs, nextArgs, nextDir, { parseArgs }, path, pkgDir, { spawn } (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (9): getPresetFromTools(), PRESET_DEFAULT, PRESET_FULL, PRESET_NONE, PRESETS, Props, ToolEntry, ToolPanel() (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.60
Nodes (5): GET(), getModelsPath(), PUT(), readModelsJson(), writeModelsJson()

### Community 19 - "Community 19"
Cohesion: 0.70
Nodes (4): errorMessage(), getAssistantText(), isRecord(), POST()

## Knowledge Gaps
- **177 isolated node(s):** `OAUTH_PROVIDER_IDS`, `Params`, `CONFIG_DIR`, `CAVEMAN_CONFIG`, `RTK_CONFIG` (+172 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SessionInfo` connect `Community 12` to `Chat Minimap`, `Agent API Routes`, `Main App Shell`, `Chat Input`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `SessionTreeNode` connect `Main App Shell` to `Chat Minimap`, `Agent API Routes`, `Community 12`, `Chat Input`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `AgentSessionWrapper` connect `Community 14` to `Agent API Routes`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `OAUTH_PROVIDER_IDS`, `Params`, `CONFIG_DIR` to the rest of the system?**
  _177 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Chat Minimap` be split into smaller, more focused modules?**
  _Cohesion score 0.0546448087431694 - nodes in this community are weakly interconnected._
- **Should `Agent API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.08928571428571429 - nodes in this community are weakly interconnected._
- **Should `Code Editor` be split into smaller, more focused modules?**
  _Cohesion score 0.0898989898989899 - nodes in this community are weakly interconnected._