# AI Workspace OS

自托管的 Web 终端管理器，专为管理多个长驻 Claude Code REPL 进程而设计。类似 Warp Terminal 的体验，通过浏览器即可在任意设备上操控服务器端的 AI 工作空间。

**Live Demo**: https://workspace.asterforge.top

## 核心特性

- **多工作空间管理** -- 创建、切换、删除工作空间，每个工作空间关联独立的服务器目录
- **多进程并发** -- 同时运行 Claude Code、Shell、Git 等多种终端进程
- **长驻上下文** -- PTY 进程在服务端持续运行，关闭浏览器不丢失状态
- **Buffer Cache 快照** -- 5000 行 ANSI 输出缓存，切换会话时瞬间恢复历史画面
- **Warp 风格输入** -- xterm.js 只读渲染 + 独立 HTML 输入框，完美支持中文 IME
- **一键创建工作空间** -- 自动递增命名 (workspace1/2/3...)，自动创建服务器目录
- **响应式布局** -- 桌面端侧边栏可折叠，移动端自适应

## 技术栈

| 层 | 技术 |
|---|------|
| 前端框架 | React 18 + TypeScript + Vite |
| 终端模拟 | xterm.js + FitAddon |
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
│       │   ├── Terminal.tsx      # 终端视图 (xterm 渲染 + Warp 风格输入框)
│       │   └── StatusBar.tsx     # 底部状态栏
│       ├── hooks/
│       │   ├── useTerminal.ts    # Terminal 实例池 + 快照恢复 + 尺寸同步
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
│  (只读渲染)  │    JSON 消息    │  (消息路由)       │
└─────────────┘                 └──────────────────┘
       ▲                               │
       │ CustomEvent                   ▼
       ▼                         ┌──────────────────┐
┌─────────────┐                  │ session-manager  │
│  HTML Input │                  │  - PTY 进程池    │
│  (Warp 风格) │                  │  - Buffer Cache  │
└─────────────┘                  │  - 工作空间管理   │
                                 └──────────────────┘
                                        │
                                        ▼
                                 ┌──────────────────┐
                                 │  node-pty        │
                                 │  (Claude/Shell)  │
                                 └──────────────────┘
```

### 关键设计决策

**1. xterm.js 只读模式 + 独立输入框**

xterm.js 设置 `disableStdin: true`，仅作为输出渲染器。用户输入通过独立的 HTML textarea 捕获，经 WebSocket 发送到后端写入 PTY。这解决了移动端中文 IME 输入的兼容性问题。

**2. PTY 尺寸先于快照重放**

切换终端时，前端先发送当前终端的实际 cols/rows，后端先调用 `pty.resize()` 调整 PTY 尺寸，再重放缓存的 ANSI 快照。这确保了 ANSI 光标定位序列与前端渲染网格精确对齐。

**3. 原始 Chunk 缓存**

Buffer Cache 以 PTY 原始输出 chunk 为单位存储，不按换行符切割。这避免了 ANSI 逃逸序列被截断导致的渲染损坏。

**4. 双层布局沙盒**

终端渲染区使用 `absolute inset-0` 绝对定位死锁在 `flex-1 min-h-0` 的外层容器内，防止 xterm.js canvas 撑破父级 flex 布局。

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

### 色彩 (Warp Phenomenon Theme)

| 角色 | 色值 |
|-----|------|
| 背景 | `#1C1D22` |
| 表面 | `#25262C` |
| 边框 | `#2D2E36` |
| 主强调 (蓝) | `#53D8FB` |
| 主强调 (紫) | `#9D4EDD` |
| 正文 | `#E4E6EB` |
| 次要文字 | `#A1A1AA` |
| 禁用文字 | `#6B7280` |
| 成功 | `#A8E6CF` |
| 错误 | `#FF6B6B` |

### 字体

```
JetBrains Mono > Fira Code > Cascadia Code > Menlo > monospace
```

### 图标

统一使用 `Icon.tsx` 组件提供的 line-style SVG 图标 (strokeWidth=2)。前端不使用任何 emoji。

## License

MIT
