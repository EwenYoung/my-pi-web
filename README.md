# my-pi-web

基于 [agegr/pi-web](https://github.com/agegr/pi-web) 二次开发的 [pi 编程智能体](https://github.com/badlogic/pi-mono) 网页界面。

在浏览器中浏览会话、与智能体对话、分叉对话、切换消息分支。

> 本项目是 `@agegr/pi-web` 的定制分支，在原版基础上进行了功能增强和 UI 优化。

## 与原版的差异

| 功能 | my-pi-web | 原版 |
|------|-----------|------|
| 语音输入 | ✅ Web Speech API | ❌ |
| 多提示音 | ✅ 5 种预设 | ❌ |
| "/" 命令 /skill 补全 | ✅ 67 个技能中文描述 | ❌ |
| 状态栏 (TUI Footer 格式) | ✅ 输入/输出/缓存/费用/上下文 | ❌ |
| 右侧文件阅览器 | ✅ 可拖拽调整宽度 | ❌ |
| CodeMirror 文件编辑 | ✅ Edit/Save/Cancel | ❌ |
| 消息缩略图 (ChatMinimap) | ✅ 悬停弹出历史列表 | 圆点式时间线 |
| Caveman / RTK 开关 | ✅ 动态检测 | ❌ |
| 会话渐进式加载 | ✅ <500/500-2000/>2000 分级 | 全部加载 |
| 会话全局缓存 | ✅ 服务端 60s TTL | ❌ |
| 上下文压缩前消息可加载 | ✅ 全量历史可见 | 压缩后丢弃 |
| 后台会话完成提示音 | ✅ 多 SSE 连接 | ❌ |
| 主题精简英文化 | ✅ 6 个主题 | 9 个主题 |
| 端口 | 9527 | 9527 |

## 快速开始

### 给使用者 — 开箱即用

确保本地已安装 pi 编程智能体（`npx pi`），然后：

```bash
# 克隆项目本地运行
git clone https://github.com/EwenYoung/my-pi-web.git
cd my-pi-web
npm install
npm run build
npm start      # 生产模式，端口 9527
```

### 给开发者 — 二次开发

```bash
git clone https://github.com/EwenYoung/my-pi-web.git
cd my-pi-web
npm install
npm run dev    # 开发模式，端口 9527，支持热重载
```

**开发须知：**

- 项目使用 **Next.js 16.2.1** + **React 19** + **TypeScript 5** + **Turbopack**
- 开发服务器端口 **9527**（已在 `package.json` 中配置）
- 不要在生产环境执行 `npm run dev`，构建后使用 `npm start` 或 PM2
- 项目文件结构见下方「项目结构」章节
- 本地开发配置和项目开发总结见 `AGENTS.md`（已加入 `.gitignore`，仅本地存在）

**PM2 生产部署：**

```bash
npm run build
pm2 start node_modules/next/dist/bin/next --name pi-web -- start -p 9527
pm2 save
pm2 startup   # 开机自启
```

## 功能介绍

- **会话浏览器** — 按工作目录分组展示所有 pi 会话
- **实时对话** — 通过 SSE 流式输出与智能体实时交互
- **会话分叉** — 从任意用户消息创建独立的新会话分支
- **会话内分支** — 回退到任意节点继续对话，在同一文件内创建分支
- **分支导航器** — 可视化切换同一会话内的各个分支
- **模型切换** — 对话中途随时切换模型
- **工具面板** — 控制智能体可使用的工具
- **压缩会话** — 对长会话进行摘要，节省上下文窗口
- **引导 / 追加** — 打断正在运行的智能体，或在其完成后追加消息
- **语音输入** — 支持 Chrome/Edge 浏览器语音转文字
- **文件编辑** — 在浏览器中直接编辑文件并保存
- **技能命令** — 输入 `/skill:` 自动补全 67 个 Agent 技能

## 注意事项

- **数据目录** — 默认读取 `~/.pi/agent/sessions` 下的会话文件。可通过环境变量 `PI_CODING_AGENT_DIR` 指定其他目录。
- **模型配置** — 从智能体数据目录下的 `models.json` 读取可用模型，可在侧边栏的「Models」面板中编辑。
- **文件浏览** — 侧边栏内置文件浏览器，可在标签页中查看当前工作目录下的文件。
- **语音输入** — 仅 Chrome 和 Edge 浏览器支持 Web Speech API。

## 项目结构

```
app/
  api/
    sessions/      # 读写会话文件（含分页、缓存、图片按需加载）
    agent/         # 发送命令、SSE 事件流
    files/         # 文件内容读取与写入
    models/        # 可用模型列表与默认模型
    pi-version/    # pi 版本信息
    extension-config/  # 扩展开关配置
components/        # UI 组件
lib/
  session-reader.ts  # 解析 .jsonl 会话文件
  rpc-manager.ts     # 管理 AgentSession 生命周期
  normalize.ts       # 规范化 toolCall 字段名
  types.ts
hooks/
  useAgentSession.ts # 会话状态管理、SSE 连接
  useFileWatcher.ts  # 文件变更监听
  useAudio.ts        # 提示音播放
```

会话文件存储路径：`~/.pi/agent/sessions/<编码后的工作目录>/<时间戳>_<uuid>.jsonl`

## 许可证

基于 [agegr/pi-web](https://github.com/agegr/pi-web) 二次开发，遵循原项目许可证。
