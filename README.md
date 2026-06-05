# AI Workspace OS 🚀

自托管的 Web 端终端管理器，专为管理多个长驻 Claude REPL 进程设计。

## ✨ 特性

- **多会话管理** - 同时管理多个 Claude REPL 进程
- **长驻上下文** - 即使关闭浏览器，PTY 进程也保持运行
- **Buffer Cache** - 切换会话时瞬间恢复历史画面
- **Warp 风格 UI** - 现代化暗黑主题，渐变发光效果
- **手机友好** - 响应式布局 + 虚拟键盘快捷键
- **高度抽象** - 支持 Claude、Shell、Git、Logs 等多种资源类型

## 📁 项目结构

```
claude-web-terminal/
├── backend/                 # 后端服务 (Node.js + WebSocket + node-pty)
│   └── src/
│       ├── index.ts         # 入口
│       ├── session-manager.ts # 会话池 + Buffer Cache
│       ├── ws-handler.ts    # WebSocket 路由
│       └── types.ts         # 类型定义
│
└── frontend/                # 前端应用 (React + Vite + xterm.js)
    └── src/
        ├── App.tsx          # 主布局
        ├── components/      # UI 组件
        ├── hooks/           # 自定义 Hooks
        ├── store/           # Zustand 状态管理
        └── styles/          # Tailwind 样式
```

## 🚀 快速开始

### 前置要求

- Node.js >= 18
- pnpm (推荐) 或 npm
- Claude Code CLI 已安装

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
pnpm install

# 安装前端依赖
cd ../frontend
pnpm install
```

### 2. 启动后端服务

```bash
cd backend
pnpm dev
```

后端将在 `http://localhost:3100` 启动。

### 3. 启动前端开发服务器

```bash
cd frontend
pnpm dev
```

前端将在 `http://localhost:5173` 启动。

### 4. 打开浏览器

访问 `http://localhost:5173` 即可使用。

## 🔌 WebSocket 协议

### 客户端 → 服务端

| 消息类型 | 说明 | 核心字段 |
|---------|------|----------|
| `workspace:create` | 创建工作区 | name, path, icon?, color? |
| `workspace:delete` | 删除工作区 | workspaceId |
| `workspace:list` | 获取列表 | - |
| `workspace:subscribe` | 订阅工作区 | workspaceId |
| `resource:create` | 创建资源 | workspaceId, resourceType, name? |
| `resource:subscribe` | 订阅资源 | workspaceId, resourceId |
| `resource:input` | 输入数据 | workspaceId, resourceId, data |
| `resource:resize` | 调整大小 | workspaceId, resourceId, cols, rows |
| `resource:kill` | 终止资源 | workspaceId, resourceId |

### 服务端 → 客户端

| 消息类型 | 说明 | 核心字段 |
|---------|------|----------|
| `workspace:list` | 工作区列表 | workspaces[] |
| `workspace:created` | 工作区已创建 | workspace |
| `workspace:updated` | 工作区已更新 | workspace |
| `workspace:deleted` | 工作区已删除 | workspaceId |
| `resource:created` | 资源已创建 | workspaceId, resource |
| `resource:output` | 输出数据 | workspaceId, resourceId, data |
| `resource:status` | 状态变更 | workspaceId, resourceId, status |
| `resource:snapshot` | 快照恢复 | workspaceId, resourceId, snapshot |

## 🎨 UI 设计

采用 Warp 风格的现代化暗黑主题：

- **背景色**: #0B0F19 (极客黑)
- **表面色**: #121826 (磨砂玻璃)
- **主强调**: #53D8FB (亮蓝) → #9D4EDD (霓虹紫) 渐变
- **字体**: JetBrains Mono / Fira Code
- **特效**: 内凹发光阴影、卡片式包裹感

## 📱 手机端优化

- 响应式布局，自动适配小屏幕
- 虚拟键盘快捷键（Tab、Ctrl+C、方向键等）
- 触摸友好的按钮尺寸

## 🔧 部署到服务器

### 构建生产版本

```bash
# 构建后端
cd backend
pnpm build

# 构建前端
cd ../frontend
pnpm build
### 启动生产服务

```bash
# 启动后端
cd backend
pnpm start

# 使用 nginx 反向代理前端静态文件
# 配置 WebSocket 代理到 ws://localhost:3100
```

## 📄 License

MIT
