import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import { ClientMessage } from '../types';
import { useSessionStore } from '../store/sessionStore';
import { VirtualKeyboard } from './VirtualKeyboard';

interface TerminalProps {
  sendMessage: (message: ClientMessage) => void;
}

const MAX_INPUT_HEIGHT = 160;

export const Terminal: React.FC<TerminalProps> = ({ sendMessage }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { switchTerminal } = useTerminal({ sendMessage });
  const { activeResourceId, activeWorkspaceId } = useSessionStore();
  const [inputValue, setInputValue] = useState('');

  // 激活/切换资源时挂载并订阅终端（尺寸同步统一交给 useTerminal 内部去抖处理）
  useEffect(() => {
    if (containerRef.current && activeResourceId && activeWorkspaceId) {
      switchTerminal(containerRef.current);
    }
  }, [activeResourceId, activeWorkspaceId, switchTerminal]);

  // 自适应输入框高度
  const autoGrow = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    autoGrow(inputRef.current);
  }, [inputValue, autoGrow]);

  const handleSubmit = useCallback(() => {
    if (!activeWorkspaceId || !activeResourceId || !inputValue.trim()) return;

    sendMessage({
      type: 'resource:input',
      workspaceId: activeWorkspaceId,
      resourceId: activeResourceId,
      data: inputValue + '\r',
    });

    setInputValue('');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      autoGrow(inputRef.current);
    });
  }, [activeWorkspaceId, activeResourceId, inputValue, sendMessage, autoGrow]);

  const sendRaw = useCallback(
    (data: string) => {
      if (!activeWorkspaceId || !activeResourceId) return;
      sendMessage({
        type: 'resource:input',
        workspaceId: activeWorkspaceId,
        resourceId: activeResourceId,
        data,
      });
    },
    [activeWorkspaceId, activeResourceId, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
        return;
      }

      const controlKeys: Record<string, string> = {
        ArrowUp: '\x1b[A',
        ArrowDown: '\x1b[B',
        ArrowLeft: '\x1b[D',
        ArrowRight: '\x1b[C',
      };

      if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        sendRaw('\x03');
        return;
      }

      // 仅当输入框为空时桥接方向键，避免干扰多行编辑光标移动
      if (controlKeys[e.key] && inputValue.length === 0) {
        e.preventDefault();
        sendRaw(controlKeys[e.key]);
      }
    },
    [handleSubmit, sendRaw, inputValue]
  );

  return (
    <div className="flex-1 flex flex-col bg-[#1C1D22] min-h-0 overflow-hidden">
      {/* Terminal 渲染区域 —— relative + absolute inset 确保 FitAddon 能测到真实高度 */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div
          ref={containerRef}
          className="absolute inset-2 sm:inset-3 rounded-xl overflow-hidden"
          style={{
            background: '#1C1D22',
            boxShadow:
              'inset 0 0 30px rgba(255,255,255,0.02), 0 0 0 1px rgba(44, 46, 53, 0.6)',
          }}
        />
      </div>

      {/* Warp 风格输入框 */}
      <div className="px-2 sm:px-3 pt-2 pb-2 sm:pb-3 flex-shrink-0">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#53D8FB] to-[#9D4EDD] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />

          <div className="relative flex items-end gap-2 bg-[#25262C] rounded-xl border border-neutral-800/60 group-focus-within:border-transparent transition-all duration-300">
            <div className="pl-4 pb-3 text-neutral-500 font-mono text-sm select-none">
              {'\u276F'}
            </div>

            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command..."
              rows={1}
              className="flex-1 bg-transparent text-[#E4E6EB] placeholder-neutral-600 resize-none py-3 pr-2 focus:outline-none font-mono text-base sm:text-sm leading-relaxed"
              style={{ minHeight: '44px', maxHeight: MAX_INPUT_HEIGHT }}
            />

            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              className="mr-2 mb-2 px-3 py-1.5 bg-white text-[#1C1D22] rounded-lg text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-200"
            >
              Send
            </button>
          </div>
        </div>

        {/* 桌面端快捷键提示 */}
        <div className="hidden sm:flex items-center gap-4 mt-2 px-1">
          <span className="text-[10px] text-neutral-600">
            <span className="text-neutral-500">Enter</span> send
          </span>
          <span className="text-[10px] text-neutral-600">
            <span className="text-neutral-500">Shift+Enter</span> newline
          </span>
          <span className="text-[10px] text-neutral-600">
            <span className="text-neutral-500">{'\u2191\u2193'}</span> history
          </span>
          <span className="text-[10px] text-neutral-600">
            <span className="text-neutral-500">Ctrl+C</span> cancel
          </span>
        </div>
      </div>

      {/* 移动端虚拟控制键（桌面端隐藏） */}
      <div className="sm:hidden flex-shrink-0">
        <VirtualKeyboard sendMessage={sendMessage} />
      </div>
    </div>
  );
};
