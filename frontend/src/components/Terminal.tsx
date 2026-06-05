import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import { ClientMessage } from '../types';
import { useSessionStore } from '../store/sessionStore';

interface TerminalProps {
  sendMessage: (message: ClientMessage) => void;
}

export const Terminal: React.FC<TerminalProps> = ({ sendMessage }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { switchTerminal, fitTerminal } = useTerminal({ sendMessage });
  const { activeResourceId, activeWorkspaceId } = useSessionStore();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (containerRef.current && activeResourceId && activeWorkspaceId) {
      switchTerminal(containerRef.current);
      // 延迟触发 fit，确保 xterm canvas 正确适配容器高度
      setTimeout(() => fitTerminal(), 100);
    }
  }, [activeResourceId, activeWorkspaceId, switchTerminal, fitTerminal]);

  // 监听容器尺寸变化，自动触发 fit
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => fitTerminal());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fitTerminal]);

  // 提交输入
  const handleSubmit = useCallback(() => {
    if (!activeWorkspaceId || !activeResourceId || !inputValue.trim()) return;

    sendMessage({
      type: 'resource:input',
      workspaceId: activeWorkspaceId,
      resourceId: activeResourceId,
      data: inputValue + '\r',
    });

    setInputValue('');
    inputRef.current?.focus();
  }, [activeWorkspaceId, activeResourceId, inputValue, sendMessage]);

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter 提交（不按 Shift）
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // 特殊控制键桥接
      const controlKeys: Record<string, string> = {
        ArrowUp: '\x1b[A',
        ArrowDown: '\x1b[B',
        ArrowLeft: '\x1b[D',
        ArrowRight: '\x1b[C',
        Tab: '\t',
      };

      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        sendMessage({
          type: 'resource:input',
          workspaceId: activeWorkspaceId!,
          resourceId: activeResourceId!,
          data: '\x03',
        });
        return;
      }

      if (controlKeys[e.key]) {
        e.preventDefault();
        sendMessage({
          type: 'resource:input',
          workspaceId: activeWorkspaceId!,
          resourceId: activeResourceId!,
          data: controlKeys[e.key],
        });
      }
    },
    [activeWorkspaceId, activeResourceId, sendMessage, handleSubmit]
  );

  return (
    <div className="flex-1 flex flex-col bg-[#1C1D22] min-h-0 overflow-hidden">
      {/* Terminal 渲染区域 - 高度死锁 */}
      <div className="flex-1 p-3 pb-0 min-h-0 overflow-hidden">
        <div
          ref={containerRef}
          className="w-full h-full rounded-2xl overflow-hidden relative"
          style={{
            background: '#1C1D22',
            boxShadow:
              'inset 0 0 30px rgba(255,255,255,0.02), 0 0 0 1px rgba(44, 46, 53, 0.6)',
          }}
        />
      </div>

      {/* Warp 风格输入框 - flex-shrink-0 防止被压缩 */}
      <div className="px-3 py-3 flex-shrink-0">
        <div className="relative group">
          {/* 流光边框效果 */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#53D8FB] to-[#9D4EDD] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />

          <div className="relative flex items-end gap-2 bg-[#25262C] rounded-xl border border-neutral-800/60 group-focus-within:border-transparent transition-all duration-300">
            {/* 提示符 */}
            <div className="pl-4 pb-3 text-neutral-500 font-mono text-sm select-none">
              ❯
            </div>

            {/* 输入框 */}
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command..."
              rows={1}
              className="flex-1 bg-transparent text-[#E4E6EB] placeholder-neutral-600 resize-none py-3 pr-2 focus:outline-none font-mono text-sm max-h-32"
              style={{ minHeight: '44px' }}
              autoFocus
            />

            {/* 发送按钮 */}
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              className="mr-2 mb-2 px-3 py-1.5 bg-white text-[#1C1D22] rounded-lg text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all duration-200"
            >
              Send
            </button>
          </div>
        </div>

        {/* 快捷键提示 */}
        <div className="flex items-center gap-4 mt-2 px-1">
          <span className="text-[10px] text-neutral-600">
            <span className="text-neutral-500">Enter</span> send
          </span>
          <span className="text-[10px] text-neutral-600">
            <span className="text-neutral-500">Shift+Enter</span> newline
          </span>
          <span className="text-[10px] text-neutral-600">
            <span className="text-neutral-500">↑↓</span> navigate
          </span>
          <span className="text-[10px] text-neutral-600">
            <span className="text-neutral-500">Ctrl+C</span> cancel
          </span>
        </div>
      </div>
    </div>
  );
};
