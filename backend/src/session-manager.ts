import { spawn, IPty } from 'node-pty';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import {
  Workspace,
  WorkspaceResource,
  WorkspaceSettings,
  ResourceType,
  ResourceStatus,
  TerminalSnapshot,
} from './types';

// 默认配置
const DEFAULT_CLAUDE_COMMAND = 'claude';
const DEFAULT_SHELL = process.platform === 'win32' ? 'powershell.exe' : 'bash';
const MAX_BUFFER_CHUNKS = 5000;
const BASE_PROJECT_DIR = process.env.PROJECT_BASE_DIR || '/home/ubuntu/project';
const DATA_FILE =
  process.env.WORKSPACE_DATA_FILE || path.join(BASE_PROJECT_DIR, '.workspaces.json');

// 匹配“整屏清除/复位”序列：RIS(\x1bc)、清屏(\x1b[2J)、清回滚(\x1b[3J)
// 一旦出现，说明屏幕被重绘，之前缓存的历史（含 resize 期间的脏帧）即可安全丢弃
const SCREEN_RESET_RE = /\x1bc|\x1b\[[0-3]?J/;

export class SessionManager {
  private workspaces: Map<string, Workspace> = new Map();
  private ptyProcesses: Map<string, IPty> = new Map();
  private outputListeners: Map<string, (data: string) => void> = new Map();

  constructor() {
    this.loadFromDisk();
    console.log('🚀 SessionManager initialized');
  }

  // ==================== 持久化 ====================

  /** 仅持久化工作空间元数据（PTY 进程无法跨重启存活，重启后资源清空） */
  private persist(): void {
    try {
      const data = Array.from(this.workspaces.values()).map((ws) => ({
        id: ws.id,
        name: ws.name,
        path: ws.path,
        icon: ws.icon,
        color: ws.color,
        createdAt: ws.createdAt,
        lastOpenedAt: ws.lastOpenedAt,
        settings: ws.settings,
      }));
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('⚠️ Failed to persist workspaces:', (e as Error).message);
    }
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(DATA_FILE)) return;
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw) as Array<Partial<Workspace>>;
      for (const ws of data) {
        if (!ws.id || !ws.name || !ws.path) continue;
        this.workspaces.set(ws.id, {
          id: ws.id,
          name: ws.name,
          path: ws.path,
          icon: ws.icon || 'folder',
          color: ws.color || '#53D8FB',
          createdAt: ws.createdAt || Date.now(),
          lastOpenedAt: ws.lastOpenedAt || Date.now(),
          settings: ws.settings || {
            workingDirectory: ws.path,
            defaultTerminal: 'claude',
            autoStart: false,
            claudeCommand: DEFAULT_CLAUDE_COMMAND,
          },
          resources: [],
        });
      }
      console.log(`💾 Restored ${this.workspaces.size} workspace(s) from disk`);
    } catch (e) {
      console.warn('⚠️ Failed to load workspaces:', (e as Error).message);
    }
  }

  // ==================== Workspace 管理 ====================

  createWorkspace(
    name: string,
    path: string,
    icon: string = 'folder',
    color: string = '#53D8FB'
  ): Workspace {
    const id = uuidv4();
    const workspace: Workspace = {
      id,
      name,
      path,
      icon,
      color,
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
      settings: {
        workingDirectory: path,
        defaultTerminal: 'claude',
        autoStart: false,
        claudeCommand: DEFAULT_CLAUDE_COMMAND,
      },
      resources: [],
    };
    this.workspaces.set(id, workspace);
    this.persist();
    console.log(`📁 Workspace created: ${name} (${id})`);
    return workspace;
  }

  /**
   * 快速创建默认工作空间（自动递增命名 + 自动建目录）
   */
  quickCreateWorkspace(): Workspace | null {
    // 确保基础目录存在
    if (!fs.existsSync(BASE_PROJECT_DIR)) {
      fs.mkdirSync(BASE_PROJECT_DIR, { recursive: true });
    }

    // 找到下一个可用编号
    let maxNum = 0;
    for (const ws of this.workspaces.values()) {
      const match = ws.name.match(/^workspace(\d+)$/);
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1], 10));
      }
    }

    const nextNum = maxNum + 1;
    const name = `workspace${nextNum}`;
    const wsPath = path.join(BASE_PROJECT_DIR, name);

    // 创建服务器目录
    try {
      fs.mkdirSync(wsPath, { recursive: true });
      console.log(`📂 Directory created: ${wsPath}`);
    } catch (e) {
      console.error(`❌ Failed to create directory: ${wsPath}`, e);
      return null;
    }

    const icons = ['terminal', 'zap', 'wrench', 'code', 'target', 'box', 'layers', 'sparkles'];
    const colors = ['#53D8FB', '#9D4EDD', '#A8E6CF', '#FFD3B6', '#FF6B6B', '#4EA8DE'];
    const icon = icons[(nextNum - 1) % icons.length];
    const color = colors[(nextNum - 1) % colors.length];

    return this.createWorkspace(name, wsPath, icon, color);
  }

  deleteWorkspace(workspaceId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    // 显式销毁所有关联的 PTY 进程
    for (const resource of workspace.resources) {
      resource.status = 'STOPPED'; // 阻止 autoRestart 误判
      const pty = this.ptyProcesses.get(resource.id);
      if (pty) {
        try {
          pty.kill();
          console.log(`🔪 Killed PTY (PID: ${pty.pid}) for ${resource.name}`);
        } catch (e) {}
        this.ptyProcesses.delete(resource.id);
      }
      this.outputListeners.delete(resource.id);
    }

    // 删除服务器目录（仅限 project 目录下的工作空间）
    if (workspace.path.startsWith(BASE_PROJECT_DIR)) {
      try {
        fs.rmSync(workspace.path, { recursive: true, force: true });
        console.log(`📂 Directory deleted: ${workspace.path}`);
      } catch (e) {
        console.warn(`⚠️ Failed to delete directory: ${workspace.path}`, e);
      }
    }

    this.workspaces.delete(workspaceId);
    this.persist();

    console.log(`🗑️ Workspace deleted: ${workspace.name} (${workspace.resources.length} processes freed)`);
    return true;
  }

  getWorkspace(workspaceId: string): Workspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  getAllWorkspaces(): Workspace[] {
    return Array.from(this.workspaces.values());
  }

  updateWorkspaceLastOpened(workspaceId: string): void {
    const workspace = this.workspaces.get(workspaceId);
    if (workspace) {
      workspace.lastOpenedAt = Date.now();
      this.persist();
    }
  }

  // ==================== Resource 管理 ====================

  async createResource(
    workspaceId: string,
    resourceType: ResourceType,
    name?: string
  ): Promise<WorkspaceResource | null> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    const resourceId = uuidv4();
    const resourceName = name || `${resourceType}-${workspace.resources.length + 1}`;

    const resource: WorkspaceResource = {
      id: resourceId,
      name: resourceName,
      type: resourceType,
      status: 'CREATING',
      snapshot: {
        ansiBuffer: [],
        lastUpdated: Date.now(),
        cols: 80,
        rows: 24,
      },
    };

    workspace.resources.push(resource);

    // 启动 PTY 进程
    await this.startPTY(workspace, resource);

    return resource;
  }

  private async startPTY(workspace: Workspace, resource: WorkspaceResource): Promise<void> {
    try {
      resource.status = 'STARTING';

      let command: string;
      let args: string[] = [];

      switch (resource.type) {
        case 'claude':
          command = workspace.settings.claudeCommand || DEFAULT_CLAUDE_COMMAND;
          args = ['--dangerously-skip-permissions'];
          break;
        case 'shell':
          command = DEFAULT_SHELL;
          break;
        case 'git':
          command = DEFAULT_SHELL;
          args = ['-c', `cd "${workspace.path}" && git status`];
          break;
        case 'logs':
          command = 'tail';
          args = ['-f', '/var/log/syslog'];
          break;
        default:
          command = DEFAULT_SHELL;
      }

      // Claude Code 需要特定的环境变量
      const env: Record<string, string> = {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        FORCE_COLOR: '1',
        NO_COLOR: '',
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8',
      } as Record<string, string>;

      // 为 Claude 添加 API 配置
      if (resource.type === 'claude') {
        env.ANTHROPIC_AUTH_TOKEN = process.env.MIMO_API_KEY || '';
        env.ANTHROPIC_BASE_URL = process.env.VISION_PROXY_URL || 'http://127.0.0.1:15722';
        env.CLAUDE_CODE_DISABLE_1M_CONTEXT = '1';
      }

      const pty = spawn(command, args, {
        name: 'xterm-256color',
        cols: resource.snapshot.cols,
        rows: resource.snapshot.rows,
        cwd: workspace.path,
        env,
      });

      resource.pid = pty.pid;
      resource.status = 'RUNNING';

      // 监听 PTY 输出
      pty.onData((data: string) => {
        this.handlePTYOutput(resource.id, data);
      });

      // 监听 PTY 退出
      pty.onExit(({ exitCode }) => {
        console.log(`💀 Resource ${resource.name} exited with code ${exitCode}`);
        resource.status = 'EXITED';
        this.ptyProcesses.delete(resource.id);
        this.notifyStatusChange(resource.id, 'EXITED');
      });

      this.ptyProcesses.set(resource.id, pty);
      console.log(`✅ PTY started: ${resource.name} (PID: ${pty.pid})`);
    } catch (error) {
      console.error(`❌ Failed to start PTY: ${error}`);
      resource.status = 'ERROR';
    }
  }

  private handlePTYOutput(resourceId: string, data: string): void {
    // 查找对应的 resource 并更新 snapshot
    for (const workspace of this.workspaces.values()) {
      const resource = workspace.resources.find(r => r.id === resourceId);
      if (resource) {
        // 更新 Buffer Cache —— 保持原始 chunk 完整，不按 \n 切割
        // 这样 ANSI 逃逸码（如 \x1b[2J）不会被截断
        if (SCREEN_RESET_RE.test(data)) {
          // 检测到整屏清除/复位：丢弃此前所有历史（含 resize 风暴产生的脏帧），
          // 仅从最后一次清屏序列开始重建快照 —— 既杜绝脏字符回灌，又显著缩小快照体积
          const idx = Math.max(
            data.lastIndexOf('\x1bc'),
            data.lastIndexOf('\x1b[2J'),
            data.lastIndexOf('\x1b[3J')
          );
          resource.snapshot.ansiBuffer = [idx > 0 ? data.slice(idx) : data];
        } else {
          resource.snapshot.ansiBuffer.push(data);
          // 按 chunk 数量裁剪（而非按行数），保持每个 chunk 的完整性
          if (resource.snapshot.ansiBuffer.length > MAX_BUFFER_CHUNKS) {
            resource.snapshot.ansiBuffer = resource.snapshot.ansiBuffer.slice(-MAX_BUFFER_CHUNKS);
          }
        }

        resource.snapshot.lastUpdated = Date.now();

        // 通知前端
        const listener = this.outputListeners.get(resourceId);
        if (listener) {
          listener(data);
        }
        break;
      }
    }
  }

  subscribeToResource(resourceId: string, listener: (data: string) => void): void {
    this.outputListeners.set(resourceId, listener);
  }

  unsubscribeFromResource(resourceId: string): void {
    this.outputListeners.delete(resourceId);
  }

  writeToResource(resourceId: string, data: string): boolean {
    const pty = this.ptyProcesses.get(resourceId);
    if (pty) {
      pty.write(data);
      return true;
    }
    return false;
  }

  resizeResource(resourceId: string, cols: number, rows: number): boolean {
    return this.applyResize(resourceId, cols, rows, false);
  }

  /** 订阅时强制 resize（即使尺寸相同），触发 TUI 整屏重绘 */
  forceResizeResource(resourceId: string, cols: number, rows: number): boolean {
    return this.applyResize(resourceId, cols, rows, true);
  }

  private applyResize(resourceId: string, cols: number, rows: number, force: boolean): boolean {
    if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols <= 0 || rows <= 0) {
      return false;
    }

    const pty = this.ptyProcesses.get(resourceId);
    if (!pty) return false;

    for (const workspace of this.workspaces.values()) {
      const resource = workspace.resources.find(r => r.id === resourceId);
      if (resource) {
        if (!force && resource.snapshot.cols === cols && resource.snapshot.rows === rows) {
          return true;
        }
        resource.snapshot.cols = cols;
        resource.snapshot.rows = rows;
        break;
      }
    }

    try {
      pty.resize(cols, rows);
    } catch (e) {
      console.warn(`⚠️ resize failed for ${resourceId}:`, (e as Error).message);
      return false;
    }
    return true;
  }

  /**
   * 获取可安全重放的快照 —— 仅保留最后一次清屏/进备用屏之后的内容，
   * 且要求与前端当前行列一致，避免 TUI 光标定位错位。
   */
  getSafeSnapshot(resourceId: string, cols?: number, rows?: number): TerminalSnapshot | null {
    const raw = this.getResourceSnapshot(resourceId);
    if (!raw || raw.ansiBuffer.length === 0) return null;

    if (cols && rows && cols > 0 && rows > 0) {
      if (raw.cols !== cols || raw.rows !== rows) {
        return null;
      }
    }

    const joined = raw.ansiBuffer.join('');
    const markers = ['\x1bc', '\x1b[2J', '\x1b[3J', '\x1b[?1049h'];
    let lastIdx = -1;
    for (const m of markers) {
      const i = joined.lastIndexOf(m);
      if (i > lastIdx) lastIdx = i;
    }
    const tail = lastIdx >= 0 ? joined.slice(lastIdx) : joined;
    if (!tail || tail.length < 4) return null;

    return {
      ...raw,
      cols: cols && cols > 0 ? cols : raw.cols,
      rows: rows && rows > 0 ? rows : raw.rows,
      ansiBuffer: [tail],
    };
  }

  /** 强制 TUI 程序（Claude Code 等）重绘整屏 */
  refreshResource(resourceId: string): boolean {
    const pty = this.ptyProcesses.get(resourceId);
    if (!pty) return false;
    try {
      process.kill(pty.pid, 'SIGWINCH');
      return true;
    } catch (e) {
      console.warn(`⚠️ refresh failed for ${resourceId}:`, (e as Error).message);
      return false;
    }
  }

  killResource(resourceId: string): boolean {
    // 先从资源列表中找到并标记为 STOPPED（阻止 autoRestart 误判）
    let found = false;
    for (const workspace of this.workspaces.values()) {
      const resource = workspace.resources.find(r => r.id === resourceId);
      if (resource) {
        resource.status = 'STOPPED';
        found = true;
        break;
      }
    }

    // 显式杀掉 PTY 进程
    const pty = this.ptyProcesses.get(resourceId);
    if (pty) {
      try {
        pty.kill();
        console.log(`🔪 Killed PTY process (PID: ${pty.pid})`);
      } catch (e) {
        // 进程可能已经退出
      }
      this.ptyProcesses.delete(resourceId);
    }

    // 清理监听器
    this.outputListeners.delete(resourceId);

    // 从资源列表中移除
    if (found) {
      for (const workspace of this.workspaces.values()) {
        const index = workspace.resources.findIndex(r => r.id === resourceId);
        if (index !== -1) {
          workspace.resources.splice(index, 1);
          break;
        }
      }
  
    }

    return found;
  }

  getResourceSnapshot(resourceId: string): TerminalSnapshot | null {
    for (const workspace of this.workspaces.values()) {
      const resource = workspace.resources.find(r => r.id === resourceId);
      if (resource) {
        return { ...resource.snapshot };
      }
    }
    return null;
  }

  private notifyStatusChange(resourceId: string, status: ResourceStatus): void {
    // 这个方法会被 WebSocket handler 覆盖
    console.log(`📢 Status change: ${resourceId} -> ${status}`);
  }

  setStatusChangeCallback(callback: (resourceId: string, status: ResourceStatus) => void): void {
    this.notifyStatusChange = callback;
  }

  // 获取指定 workspace 的所有 resource
  getResources(workspaceId: string): WorkspaceResource[] {
    const workspace = this.workspaces.get(workspaceId);
    return workspace ? workspace.resources : [];
  }

  // 获取单个 resource
  getResource(workspaceId: string, resourceId: string): WorkspaceResource | undefined {
    const workspace = this.workspaces.get(workspaceId);
    return workspace?.resources.find(r => r.id === resourceId);
  }
}
