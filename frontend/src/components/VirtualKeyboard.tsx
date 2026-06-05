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
    <div className="px-3 pb-3 bg-[#1C1D22]">
      <div className="flex flex-wrap gap-1.5 justify-center p-2.5 bg-[#25262C] rounded-xl border border-neutral-800/60">
        {keys.map((k) => (
          <button
            key={k.label}
            onClick={() => sendKey(k.key)}
            className={`px-3.5 py-2 bg-[#25262C] hover:bg-[#2D2E36] rounded-xl text-xs font-mono text-neutral-400 hover:text-neutral-300 transition-all duration-200 border border-neutral-800/40 hover:border-neutral-700/50 active:scale-95 ${
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
