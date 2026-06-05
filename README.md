# AI Workspace OS

自托管的 Web 终端管理器，专为管理多个长驻 Claude Code REPL 进程而设计。类似 Warp Terminal 的体验，通过浏览器即可在任意设备上操控服务器端的 AI 工作空间。

**Live Demo**: https://workspace.asterforge.top

## 核心特性

- **多工作空间管理** — 创建、切换、删除工作空间，每个工作空间关联独立的服务器目录
- **多进程并发** — 同时运行 Claude Code、Shell、Git 等多种终端进程
- **长驻上下文** — PTY 进程在服务端持续运行，关闭浏览器不丢失状态
- **Buffer Cache 快照** — 原始 ANSI chunk 缓存，切换会话时瞬间恢复历史画面
- **Warp 风格输入** — xterm.js 渲染 + 独立 HTML 输入框，完美支持中文 IME
- **斜杠命令同步** — 输入 `/` 实时触发 Claude Code 补全菜单
- **键盘转发** — Tab / Esc / Shift+Tab / Ctrl+C / 方向键直接映射到终端
- **Action Bar** — 可点击的快捷操作按钮（Cancel / Esc / Tab / Newline / 切换模式）
- **WebGL 渲染** — GPU 加速，60fps+ 丝滑体验
- **智能滚动** — 上翻查看历史时不被新内容拉回
- **一键创建工作空间** — 自动递增命名 (workspace1/2/3...)，自动创建服务器目录
- **响应式布局** — 桌面端侧边栏可折叠，移动端自适应
- **多主题系统** — 6 个预设主题（深空蓝紫 / 深空灰 / 极地白 / 赛博终端 / 薰衣草深空 / 暮色琥珀），一键切换
- **字体切换** — 4 种等宽字体可选（JetBrains Mono / Fira Code / Cascadia Code / Source Code Pro）
- **主题光晕交互** — 卡片和按钮 hover 时亮起对应主题色光晕，增强交互感
- **本地持久化** — 主题和字体偏好自动保存到 localStorage

## 技术栈

| 层 | 技术 |
|---|------|
| 前端框架 | React 18 + TypeScript + Vite |
| 终端模拟 | xterm.js + WebGL Renderer + FitAddon |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS |
| 后端运行时 | Node.js + tsx |
| PTY 管理 | node-pty |
| 通信 | WebSocket (ws) |
| 部署 | Nginx 反向代理 + HTTPS |

## 项目结构

```
claude-web-terminal/
├── backend/
│   └── src/
│       ├── index.ts              # HTTP + WebSocket 服务入口
│       ├── session-manager.ts    # 工作空间/资源管理 + PTY 生命周期 + Buffer Cache
│       ├── ws-handler.ts         # WebSocket 消息路由
│       └── types.ts              # 共享类型定义
│
├── frontend/
│   └── src/
│       ├── App.tsx               # 根布局 (侧边栏 + 终端区 + 欢迎页)
│       ├── components/
│       │   ├── BrandLogo.tsx     # 品牌 Logo SVG 组件
│       │   ├── Icon.tsx          # 集中式 SVG 图标库 (20+ line-style icons)
│       │   ├── Sidebar.tsx       # 侧边栏 (工作空间列表 + 资源管理)
│       │   ├── Terminal.tsx      # 终端视图 (xterm 渲染 + 输入框 + Action Bar)
│       │   └── StatusBar.tsx     # 底部状态栏
│       ├── hooks/
│       │   ├── useTerminal.ts    # Terminal 实例池 + WebGL + 智能滚动 + 批处理
│       │   └── useWebSocket.ts   # WebSocket 连接管理 + 自动重连
│       ├── store/
│       │   └── sessionStore.ts   # Zustand 全局状态
│       ├── styles/
│       │   └── globals.css       # Tailwind + xterm 样式覆盖
│       └── types.ts              # 前端类型定义
│
└── nginx/
    └── workspace-os.conf         # Nginx 反向代理配置示例
```

## 快速开始

### 前置要求

- Node.js >= 18
- npm 或 pnpm
- Claude Code CLI 已安装并在 PATH 中

### 安装依赖

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 启动开发环境

```bash
# 终端 1: 启动后端
cd backend && npx tsx src/index.ts

# 终端 2: 启动前端
cd frontend && npm run dev
```

访问 `http://localhost:5173`。

### 构建生产版本

```bash
cd frontend && npm run build
```

产出在 `frontend/dist/`，由 Nginx 提供静态文件服务。

## 架构设计

### 数据流

```
Browser                          Server
┌─────────────┐    WebSocket    ┌──────────────────┐
│  xterm.js   │◄──────────────►│  ws-handler.ts   │
│  (WebGL 渲染)│    JSON 消息    │  (消息路由)       │
└─────────────┘                 └──────────────────┘
       ▲                               │
       │                               ▼
┌─────────────┐                 ┌──────────────────┐
│  HTML Input │                 │ session-manager  │
│  (文本 + IME)│                 │  - PTY 进程池    │
└─────────────┘                 │  - Buffer Cache  │
                                │  - 工作空间管理   │
                                └──────────────────┘
                                       │
                                       ▼
                                ┌──────────────────┐
                                │  node-pty        │
                                │  (Claude/Shell)  │
                                └──────────────────┘
```

### 关键设计决策

**1. xterm.js WebGL 渲染器 + 独立输入框**

xterm.js 使用 `@xterm/addon-webgl` 启用 GPU 加速渲染，帧率远超默认 Canvas 渲染器。用户输入通过独立的 HTML textarea 捕获，支持中文 IME。特殊键（Tab / Esc / Shift+Tab / Ctrl+C）实时转发到 PTY。

**2. 斜杠命令同步**

当用户在输入框输入 `/` 时，字符实时发送到 PTY，触发 Claude Code 的补全菜单。后续输入和退格也同步到 PTY，保持浏览器输入框和终端的联动。

**3. PTY 尺寸先于快照重放**

切换终端时，前端先发送当前终端的实际 cols/rows，后端先调用 `pty.resize()` 调整 PTY 尺寸，再重放缓存的 ANSI 快照。这确保了 ANSI 光标定位序列与前端渲染网格精确对齐。

**4. 原始 Chunk 缓存**

Buffer Cache 以 PTY 原始输出 chunk 为单位存储，不按换行符切割。这避免了 ANSI 逃逸序列被截断导致的渲染损坏。

**5. 写入批处理**

PTY 输出通过 `requestAnimationFrame` 收集，在每帧内批量写入 xterm.js，减少重绘次数。

**6. 智能滚动**

写入前检测用户是否在底部附近（80px 容差），只有用户本来就在底部时才自动滚动，上翻查看历史时不打断。

## WebSocket 协议

### 客户端 -> 服务端

| 类型 | 说明 | 关键字段 |
|-----|------|---------|
| `workspace:list` | 获取工作空间列表 | - |
| `workspace:create` | 创建工作空间 | name, path, icon?, color? |
| `workspace:quick_create` | 一键创建工作空间 | - |
| `workspace:delete` | 删除工作空间 (含服务器目录) | workspaceId |
| `workspace:subscribe` | 订阅工作空间事件 | workspaceId |
| `resource:create` | 创建终端资源 | workspaceId, resourceType |
| `resource:subscribe` | 订阅资源输出 + 恢复快照 | workspaceId, resourceId, cols?, rows? |
| `resource:input` | 写入 PTY 数据 | workspaceId, resourceId, data |
| `resource:resize` | 调整 PTY 尺寸 | workspaceId, resourceId, cols, rows |
| `resource:kill` | 终止资源进程 | workspaceId, resourceId |

### 服务端 -> 客户端

| 类型 | 说明 | 关键字段 |
|-----|------|---------|
| `workspace:list` | 工作空间列表 | workspaces[] |
| `workspace:created` | 工作空间已创建 | workspace |
| `workspace:updated` | 工作空间已更新 | workspace |
| `workspace:deleted` | 工作空间已删除 | workspaceId |
| `resource:created` | 资源已创建 | workspaceId, resource |
| `resource:output` | PTY 实时输出 | workspaceId, resourceId, data |
| `resource:snapshot` | Buffer Cache 快照 | workspaceId, resourceId, snapshot |
| `resource:status` | 资源状态变更 | workspaceId, resourceId, status |
| `resource:deleted` | 资源已删除 | workspaceId, resourceId |

### 资源状态机

```
CREATING -> STARTING -> RUNNING -> EXITED
                         |   ^
                         v   |
                       STOPPED (手动终止)
                       ERROR (启动失败)
```

## 部署

### Nginx 配置

```nginx
server {
    listen 80;
    server_name workspace.example.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # WebSocket 代理
    location /ws {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3100;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:3100;
    }
}
```

### 启动后端

```bash
cd backend
nohup npx tsx src/index.ts > /tmp/backend.log 2>&1 &
```

### 验证

```bash
curl http://localhost:3100/health
# -> {"status":"ok","timestamp":...}
```

## 设计系统

### 主题系统 (v1.0.1)

6 个预设主题，通过 CSS 自定义属性实现，支持运行时热切换：

| 主题 | 风格 | 主强调色 |
|-----|------|---------|
| 🌌 Warp Phenomenon | 暗蓝紫（默认） | `#53D8FB` / `#9D4EDD` |
| 🪐 Deep Space Gray | 暖橙极简 | `#FF6B4A` / `#8B5CF6` |
| ❄️ Arctic Light | 明亮极简 | `#111827` / `#374151` |
| 💚 Cyber Geek | 赛博终端 | `#06B6D4` / `#34D399` |
| 🔮 Linear Dark | 薰衣草深空 | `#5E6AD2` / `#7A7FAD` |
| 🌅 Sunset Warm | 暮色琥珀 | `#D4856A` / `#C07A5E` |

### 字体

```
JetBrains Mono > Fira Code > Cascadia Code > Source Code Pro > monospace
```

### 图标

统一使用 `Icon.tsx` 组件提供的 line-style SVG 图标 (strokeWidth=2)。前端不使用任何 emoji。

## License

MIT
