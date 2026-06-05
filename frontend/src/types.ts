// AI Workspace OS - 核心数据模型 (与后端保持一致)

export type ResourceType = 'claude' | 'shell' | 'logs' | 'git' | 'browser';
export type ResourceStatus = 'CREATING' | 'STARTING' | 'RUNNING' | 'EXITED' | 'RESTARTING' | 'ERROR' | 'STOPPED';

export interface TerminalSnapshot {
  ansiBuffer: string[];
  lastUpdated: number;
  cols: number;
  rows: number;
}

export interface WorkspaceResource {
  id: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  pid?: number;
  snapshot: TerminalSnapshot;
}

export interface WorkspaceSettings {
  workingDirectory: string;
  defaultTerminal: ResourceType;
  autoStart: boolean;
  claudeCommand: string;
}

export interface Workspace {
  id: string;
  name: string;
  path: string;
  icon: string;
  color: string;
  createdAt: number;
  lastOpenedAt: number;
  settings: WorkspaceSettings;
  resources: WorkspaceResource[];
}

// WebSocket 协议 (与后端保持一致)
export type ClientMessage =
  | { type: 'workspace:create'; name: string; path: string; icon?: string; color?: string }
  | { type: 'workspace:delete'; workspaceId: string }
  | { type: 'resource:create'; workspaceId: string; resourceType: ResourceType; name?: string }
  | { type: 'resource:subscribe'; workspaceId: string; resourceId: string }
  | { type: 'resource:input'; workspaceId: string; resourceId: string; data: string }
  | { type: 'resource:resize'; workspaceId: string; resourceId: string; cols: number; rows: number }
  | { type: 'resource:kill'; workspaceId: string; resourceId: string }
  | { type: 'workspace:list' }
  | { type: 'workspace:subscribe'; workspaceId: string };

export type ServerMessage =
  | { type: 'workspace:list'; workspaces: Workspace[] }
  | { type: 'workspace:created'; workspace: Workspace }
  | { type: 'workspace:deleted'; workspaceId: string }
  | { type: 'workspace:updated'; workspace: Workspace }
  | { type: 'resource:created'; workspaceId: string; resource: WorkspaceResource }
  | { type: 'resource:output'; workspaceId: string; resourceId: string; data: string }
  | { type: 'resource:status'; workspaceId: string; resourceId: string; status: ResourceStatus }
  | { type: 'resource:snapshot'; workspaceId: string; resourceId: string; snapshot: TerminalSnapshot }
  | { type: 'resource:deleted'; workspaceId: string; resourceId: string }
  | { type: 'error'; message: string; code?: string };
