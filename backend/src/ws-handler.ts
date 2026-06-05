import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { SessionManager } from './session-manager';
import { ClientMessage, ServerMessage, ResourceType } from './types';

export class WebSocketHandler {
  private wss: WebSocketServer;
  private sessionManager: SessionManager;
  private clients: Map<WebSocket, { workspaceId?: string; resourceId?: string }> = new Map();

  constructor(wss: WebSocketServer, sessionManager: SessionManager) {
    this.wss = wss;
    this.sessionManager = sessionManager;

    // 设置状态变更回调
    this.sessionManager.setStatusChangeCallback((resourceId, status) => {
      this.broadcastToResourceSubscribers(resourceId, {
        type: 'resource:status',
        workspaceId: '',
        resourceId,
        status,
      });
    });

    this.setupConnectionHandler();
    console.log('🔌 WebSocket handler initialized');
  }

  private setupConnectionHandler(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      console.log('🔗 New client connected');
      this.clients.set(ws, {});

      ws.on('message', (data: Buffer) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        const clientInfo = this.clients.get(ws);
        if (clientInfo?.resourceId) {
          this.sessionManager.unsubscribeFromResource(clientInfo.resourceId);
        }
        this.clients.delete(ws);
        console.log('🔌 Client disconnected');
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

      // 发送当前 workspace 列表
      this.sendWorkspaceList(ws);
    });
  }

  private handleMessage(ws: WebSocket, message: ClientMessage): void {
    switch (message.type) {
      case 'workspace:list':
        this.handleWorkspaceList(ws);
        break;

      case 'workspace:create':
        this.handleWorkspaceCreate(ws, message.name, message.path, message.icon, message.color);
        break;

      case 'workspace:quick_create':
        this.handleWorkspaceQuickCreate(ws);
        break;

      case 'workspace:delete':
        this.handleWorkspaceDelete(ws, message.workspaceId);
        break;

      case 'workspace:subscribe':
        this.handleWorkspaceSubscribe(ws, message.workspaceId);
        break;

      case 'resource:create':
        this.handleResourceCreate(ws, message.workspaceId, message.resourceType, message.name);
        break;

      case 'resource:subscribe':
        this.handleResourceSubscribe(ws, message.workspaceId, message.resourceId, message.cols, message.rows);
        break;

      case 'resource:input':
        this.handleResourceInput(ws, message.workspaceId, message.resourceId, message.data);
        break;

      case 'resource:resize':
        this.handleResourceResize(message.workspaceId, message.resourceId, message.cols, message.rows);
        break;

      case 'resource:kill':
        this.handleResourceKill(ws, message.workspaceId, message.resourceId);
        break;

      default:
        this.sendError(ws, `Unknown message type: ${(message as any).type}`);
    }
  }

  private handleWorkspaceList(ws: WebSocket): void {
    this.sendWorkspaceList(ws);
  }

  private sendWorkspaceList(ws: WebSocket): void {
    const workspaces = this.sessionManager.getAllWorkspaces();
    this.send(ws, { type: 'workspace:list', workspaces });
  }

  private handleWorkspaceCreate(
    ws: WebSocket,
    name: string,
    path: string,
    icon?: string,
    color?: string
  ): void {
    const workspace = this.sessionManager.createWorkspace(name, path, icon, color);
    this.broadcast({ type: 'workspace:created', workspace });
  }

  private handleWorkspaceQuickCreate(ws: WebSocket): void {
    const workspace = this.sessionManager.quickCreateWorkspace();
    if (workspace) {
      this.broadcast({ type: 'workspace:created', workspace });
    } else {
      this.sendError(ws, 'Failed to create workspace directory');
    }
  }

  private handleWorkspaceDelete(ws: WebSocket, workspaceId: string): void {
    const success = this.sessionManager.deleteWorkspace(workspaceId);
    if (success) {
      this.broadcast({ type: 'workspace:deleted', workspaceId });
    } else {
      this.sendError(ws, 'Workspace not found');
    }
  }

  private handleWorkspaceSubscribe(ws: WebSocket, workspaceId: string): void {
    const clientInfo = this.clients.get(ws);
    if (clientInfo) {
      // 取消订阅旧的 resource
      if (clientInfo.resourceId) {
        this.sessionManager.unsubscribeFromResource(clientInfo.resourceId);
      }
      clientInfo.workspaceId = workspaceId;
      clientInfo.resourceId = undefined;
    }

    // 更新 lastOpenedAt
    this.sessionManager.updateWorkspaceLastOpened(workspaceId);

    // 发送 workspace 详情
    const workspace = this.sessionManager.getWorkspace(workspaceId);
    if (workspace) {
      this.send(ws, { type: 'workspace:updated', workspace });
    }
  }

  private async handleResourceCreate(
    ws: WebSocket,
    workspaceId: string,
    resourceType: ResourceType,
    name?: string
  ): Promise<void> {
    const resource = await this.sessionManager.createResource(workspaceId, resourceType, name);
    if (resource) {
      const workspace = this.sessionManager.getWorkspace(workspaceId);
      if (workspace) {
        this.broadcast({ type: 'workspace:updated', workspace });
      }
      this.broadcast({ type: 'resource:created', workspaceId, resource });
    } else {
      this.sendError(ws, 'Failed to create resource');
    }
  }

  private handleResourceSubscribe(ws: WebSocket, workspaceId: string, resourceId: string, cols?: number, rows?: number): void {
    const clientInfo = this.clients.get(ws);
    if (clientInfo) {
      // 取消订阅旧的 resource
      if (clientInfo.resourceId) {
        this.sessionManager.unsubscribeFromResource(clientInfo.resourceId);
      }

      clientInfo.workspaceId = workspaceId;
      clientInfo.resourceId = resourceId;
    }

    const resource = this.sessionManager.getResource(workspaceId, resourceId);
    if (!resource) {
      if (clientInfo) {
        clientInfo.resourceId = undefined;
      }
      this.sendError(ws, 'Session not found — click + Claude to start a new terminal');
      return;
    }

    // 订阅时强制 resize，确保 TUI 收到 SIGWINCH 并重绘
    if (cols && rows && cols > 0 && rows > 0) {
      this.sessionManager.forceResizeResource(resourceId, cols, rows);
    }

    // 订阅新的 resource 输出
    this.sessionManager.subscribeToResource(resourceId, (data: string) => {
      this.send(ws, {
        type: 'resource:output',
        workspaceId,
        resourceId,
        data,
      });
    });

    // Claude：只重放「清屏后」的安全快照；若无则靠 force resize 触发重绘
    if (resource?.type === 'claude') {
      const safeSnapshot = this.sessionManager.getSafeSnapshot(resourceId, cols, rows);
      if (safeSnapshot) {
        this.send(ws, {
          type: 'resource:snapshot',
          workspaceId,
          resourceId,
          snapshot: safeSnapshot,
        });
      } else if (cols && rows && cols > 0 && rows > 0) {
        this.sessionManager.forceResizeResource(resourceId, cols, rows);
      } else {
        this.sessionManager.refreshResource(resourceId);
      }
    } else {
      const snapshot = this.sessionManager.getResourceSnapshot(resourceId);
      if (snapshot && snapshot.ansiBuffer.length > 0) {
        this.send(ws, {
          type: 'resource:snapshot',
          workspaceId,
          resourceId,
          snapshot,
        });
      }
    }

    // 发送当前状态
    if (resource) {
      this.send(ws, {
        type: 'resource:status',
        workspaceId,
        resourceId,
        status: resource.status,
      });
    }
  }

  private handleResourceInput(ws: WebSocket, workspaceId: string, resourceId: string, data: string): void {
    if (!this.sessionManager.getResource(workspaceId, resourceId)) {
      this.sendError(ws, 'Session not found — click + Claude to start a new terminal');
      return;
    }
    if (!this.sessionManager.writeToResource(resourceId, data)) {
      this.sendError(ws, 'Failed to send input to terminal');
    }
  }

  private handleResourceResize(workspaceId: string, resourceId: string, cols: number, rows: number): void {
    this.sessionManager.resizeResource(resourceId, cols, rows);
  }

  private handleResourceKill(ws: WebSocket, workspaceId: string, resourceId: string): void {
    const success = this.sessionManager.killResource(resourceId);
    if (success) {
      this.broadcast({ type: 'resource:deleted', workspaceId, resourceId });
    } else {
      this.sendError(ws, 'Resource not found');
    }
  }

  private broadcastToResourceSubscribers(resourceId: string, message: ServerMessage): void {
    for (const [ws, clientInfo] of this.clients.entries()) {
      if (clientInfo.resourceId === resourceId && ws.readyState === WebSocket.OPEN) {
        this.send(ws, message);
      }
    }
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: ServerMessage): void {
    for (const ws of this.clients.keys()) {
      this.send(ws, message);
    }
  }

  private sendError(ws: WebSocket, message: string, code?: string): void {
    this.send(ws, { type: 'error', message, code });
  }
}
