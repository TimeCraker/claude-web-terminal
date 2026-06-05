import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import { ClientMessage } from '../types';
import { useSessionStore } from '../store/sessionStore';
import { Icon } from './Icon';

interface TerminalProps {
  sendMessage: (message: ClientMessage) => void;
}

const MAX_INPUT_HEIGHT = 160;

export const Terminal: React.FC<TerminalProps> = ({ sendMessage }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');

  const { switchTerminal } = useTerminal({ sendMessage });
  const { activeResourceId, activeWorkspaceId } = useSessionStore();

  // 挂载/切换终端
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

  // 发送原始数据到 PTY
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

  // 发送文本到 PTY
  const sendText = useCallback(
    (text: string) => {
      if (!activeWorkspaceId || !activeResourceId) return;
      sendMessage({
        type: 'resource:input',
        workspaceId: activeWorkspaceId,
        resourceId: activeResourceId,
        data: text,
      });
    },
    [activeWorkspaceId, activeResourceId, sendMessage]
  );

  // ==================== 提交 ====================
  const handleSubmit = useCallback(() => {
    if (!activeWorkspaceId || !activeResourceId) return;
    sendText(inputValue + '\r');
    setInputValue('');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      autoGrow(inputRef.current);
    });
  }, [activeWorkspaceId, activeResourceId, inputValue, sendText, autoGrow]);

  // ==================== 输入变化 —— 斜杠命令同步 ====================
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const oldValue = inputValue;
      setInputValue(newValue);

      // 斜杠命令同步：第一个字符是 / 时，实时发送到 PTY
      if (newValue.startsWith('/') && !oldValue.startsWith('/')) {
        sendRaw('/');
      } else if (newValue.startsWith('/') && oldValue.startsWith('/')) {
        if (newValue.length > oldValue.length) {
          sendRaw(newValue.slice(oldValue.length));
        } else if (newValue.length < oldValue.length) {
          sendRaw('\x7f'.repeat(oldValue.length - newValue.length));
          if (newValue.length === 0) {
            sendRaw('\x7f');
            sendRaw('\x1b');
          }
        }
      } else if (!newValue.startsWith('/') && oldValue.startsWith('/')) {
        sendRaw('\x7f'.repeat(oldValue.length));
        sendRaw('\x1b');
      }
    },
    [inputValue, sendRaw]
  );

  // ==================== 键盘事件 ====================
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
        return;
      }
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        sendRaw('\x1b[Z');
        return;
      }
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        sendRaw('\t');
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        sendRaw('\x1b');
        return;
      }
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        sendRaw('\x03');
        return;
      }
      if (e.key === 'ArrowUp' && inputValue.length === 0) {
        e.preventDefault();
        sendRaw('\x1b[A');
      }
      if (e.key === 'ArrowDown' && inputValue.length === 0) {
        e.preventDefault();
        sendRaw('\x1b[B');
      }
    },
    [handleSubmit, sendRaw, inputValue]
  );

  // Action bar 按钮
  const handleAction = useCallback(
    (data: string) => {
      sendRaw(data);
      inputRef.current?.focus();
    },
    [sendRaw]
  );

  return (
    <div className="flex-1 flex flex-col bg-theme-bg min-h-0 overflow-hidden">
      {/* 终端渲染区域 */}
      <div
        className="flex-1 min-h-0 overflow-hidden relative cursor-text"
        onClick={(e) => {
          // 移动端：点击终端区域时聚焦到输入框
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.xterm')) {
            inputRef.current?.focus();
          }
        }}
      >
        <div
          ref={containerRef}
          tabIndex={-1}
          className="absolute inset-1.5 sm:inset-3 rounded-xl overflow-hidden focus:outline-none"
          style={{
            background: 'var(--theme-bg)',
            boxShadow: 'inset 0 0 30px rgba(255,255,255,0.02), 0 0 0 1px var(--theme-border)',
            // 移动端：允许触摸滚动
            touchAction: 'pan-x pan-y',
          }}
        />
      </div>

      {/* 输入框 + Action Bar */}
      <div className="px-2 sm:px-3 pt-2 pb-2 sm:pb-3 flex-shrink-0 safe-area-pb">
        <div className="relative group">
          <div
            className="absolute -inset-0.5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm"
            style={{ background: 'linear-gradient(to right, var(--theme-gradient-from), var(--theme-gradient-to))' }}
          />

          <div className="relative flex items-end gap-2 bg-theme-surface-light rounded-xl border border-theme-border group-focus-within:border-transparent transition-all duration-300">
            <div className="pl-4 pb-3 text-theme-text-muted font-mono text-sm select-none">{'❯'}</div>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a command..."
              rows={1}
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="flex-1 bg-transparent text-theme-text placeholder-theme-text-muted resize-none py-3 pr-2 focus:outline-none font-mono text-base sm:text-sm leading-relaxed"
              style={{ minHeight: '44px', maxHeight: MAX_INPUT_HEIGHT, touchAction: 'manipulation' }}
            />
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              className="mr-2 mb-2 px-3 py-2 bg-theme-text text-theme-bg rounded-lg text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-theme-glow active:scale-95 transition-all duration-200"
              style={{ minWidth: '52px', minHeight: '36px' }}
            >
              Send
            </button>
          </div>
        </div>

        {/* ===== Action Bar ===== */}
        <div className="flex items-center gap-1.5 mt-2 px-1 overflow-x-auto scrollbar-none">

          {/* Cancel */}
          <button
            onClick={() => { sendRaw('\x03'); inputRef.current?.focus(); }}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-lg text-[10px] font-mono text-theme-error/80 hover:text-theme-error hover:bg-theme-error/10 border border-transparent hover:border-theme-error/20 transition-all active:scale-95"
            title="Ctrl+C"
          >
            <Icon name="x" size={10} />
            <span>Cancel</span>
          </button>

          {/* Esc */}
          <button
            onClick={() => handleAction('\x1b')}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-lg text-[10px] font-mono text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95"
            title="Esc"
          >
            <Icon name="chevron-left" size={10} />
            <span>Esc</span>
          </button>

          {/* Tab */}
          <button
            onClick={() => handleAction('\t')}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-lg text-[10px] font-mono text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95"
            title="Tab"
          >
            <Icon name="chevron-right" size={10} />
            <span>Tab</span>
          </button>

          {/* ↵ Newline */}
          <button
            onClick={() => {
              const el = inputRef.current;
              if (el) {
                const start = el.selectionStart;
                const nv = inputValue.slice(0, start) + '\n' + inputValue.slice(el.selectionEnd);
                setInputValue(nv);
                requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 1; });
              }
              sendRaw('\r');
              inputRef.current?.focus();
            }}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-lg text-[10px] font-mono text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95"
            title="Shift+Enter: newline"
          >
            <span>↵ Newline</span>
          </button>

          {/* 分隔 */}
          <div className="w-px h-4 bg-theme-border flex-shrink-0 mx-0.5" />

          {/* 切换模式（= Shift+Tab） */}
          <button
            onClick={() => { sendRaw('\x1b[Z'); inputRef.current?.focus(); }}
            className="flex-shrink-0 px-3 py-1.5 sm:py-1 rounded-lg text-[10px] font-semibold font-mono text-theme-accent/80 hover:text-theme-accent bg-theme-accent/5 hover:bg-theme-accent/10 border border-theme-accent/20 hover:border-theme-accent/40 transition-all active:scale-95"
            title="Shift+Tab: switch mode"
          >
            切换模式
          </button>

          {/* 分隔 */}
          <div className="w-px h-4 bg-theme-border flex-shrink-0 mx-0.5" />

          {/* 方向键 */}
          <button
            onClick={() => handleAction('\x1b[A')}
            disabled={inputValue.length > 0}
            className="flex-shrink-0 w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-xs font-mono text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
            title="Previous history"
          >
            ↑
          </button>
          <button
            onClick={() => handleAction('\x1b[B')}
            disabled={inputValue.length > 0}
            className="flex-shrink-0 w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-xs font-mono text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
            title="Next history"
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  );
};
