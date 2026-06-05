import { create } from 'zustand';
import { Workspace, WorkspaceResource } from '../types';

interface SessionStore {
  // 状态
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeResourceId: string | null;
  isConnected: boolean;

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (workspaceId: string) => void;
  setActiveWorkspace: (workspaceId: string | null) => void;
  setActiveResource: (resourceId: string | null) => void;
  setConnected: (connected: boolean) => void;

  // Helper
  getActiveWorkspace: () => Workspace | undefined;
  getActiveResource: () => WorkspaceResource | undefined;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  activeResourceId: null,
  isConnected: false,

  setWorkspaces: (workspaces) => set({ workspaces }),

  addWorkspace: (workspace) =>
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
    })),

  updateWorkspace: (workspace) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspace.id ? workspace : w
      ),
    })),

  removeWorkspace: (workspaceId) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== workspaceId),
      activeWorkspaceId:
        state.activeWorkspaceId === workspaceId ? null : state.activeWorkspaceId,
      activeResourceId:
        state.activeWorkspaceId === workspaceId ? null : state.activeResourceId,
    })),

  setActiveWorkspace: (workspaceId) =>
    set({ activeWorkspaceId: workspaceId, activeResourceId: null }),

  setActiveResource: (resourceId) => set({ activeResourceId: resourceId }),

  setConnected: (connected) => set({ isConnected: connected }),

  getActiveWorkspace: () => {
    const state = get();
    return state.workspaces.find((w) => w.id === state.activeWorkspaceId);
  },

  getActiveResource: () => {
    const state = get();
    const workspace = state.workspaces.find(
      (w) => w.id === state.activeWorkspaceId
    );
    return workspace?.resources.find((r) => r.id === state.activeResourceId);
  },
}));
