import React from 'react';
import { ClientMessage } from '../types';
import { useSessionStore } from '../store/sessionStore';

interface VirtualKeyboardProps {
  sendMessage: (message: ClientMessage) => void;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  sendMessage,
}) => {
  const { activeWorkspaceId, activeResourceId } = useSessionStore();

  const sendKey = (key: string) => {
    if (activeWorkspaceId && activeResourceId) {
      sendMessage({
        type: 'resource:input',
        workspaceId: activeWorkspaceId,
        resourceId: activeResourceId,
        data: key,
      });
    }
  };

  const keys = [
    { label: 'Tab', key: '\t' },
    { label: 'Ctrl+C', key: '\x03' },
    { label: '↑', key: '\x1b[A' },
    { label: '↓', key: '\x1b[B' },
    { label: '←', key: '\x1b[D' },
    { label: '→', key: '\x1b[C' },
    { label: 'Esc', key: '\x1b' },
    { label: 'Enter', key: '\r', wide: true },
  ];

  return (
    <div className="px-3 pb-3 bg-theme-bg">
      <div className="flex flex-wrap gap-1.5 justify-center p-2.5 bg-theme-surface rounded-xl border border-theme-border/60">
        {keys.map((k) => (
          <button
            key={k.label}
            onClick={() => sendKey(k.key)}
            className={`px-3.5 py-2.5 sm:py-2 bg-theme-surface-light hover:bg-theme-surface-elevated rounded-xl text-xs font-mono text-theme-text-secondary hover:text-theme-text transition-all duration-200 border border-theme-border/40 hover:border-theme-border-strong active:scale-95 min-h-[44px] ${
              k.wide ? 'flex-1 max-w-[140px]' : ''
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
};
