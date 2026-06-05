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
const MAX_BUFFER_LINES = 5000;
const BASE_PROJECT_DIR = '/home/ubuntu/project';

export class SessionManager {
  private workspaces: Map<string, Workspace> = new Map();
  private ptyProcesses: Map<string, IPty> = new Map();
  private outputListeners: Map<string, (data: string) => void> = new Map();

  constructor() {
    console.log('🚀 SessionManager initialized');
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
        resource.snapshot.ansiBuffer.push(data);

        // 按 chunk 数量裁剪（而非按行数），保持每个 chunk 的完整性
        if (resource.snapshot.ansiBuffer.length > MAX_BUFFER_LINES) {
          resource.snapshot.ansiBuffer = resource.snapshot.ansiBuffer.slice(-MAX_BUFFER_LINES);
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
    const pty = this.ptyProcesses.get(resourceId);
    if (pty) {
      pty.resize(cols, rows);

      // 更新 snapshot
      for (const workspace of this.workspaces.values()) {
        const resource = workspace.resources.find(r => r.id === resourceId);
        if (resource) {
          resource.snapshot.cols = cols;
          resource.snapshot.rows = rows;
          break;
        }
      }

      return true;
    }
    return false;
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
