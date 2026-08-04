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
  const [selectedText, setSelectedText] = useState('');
  const [showCopyButton, setShowCopyButton] = useState(false);
  const [copyButtonPosition, setCopyButtonPosition] = useState({ x: 0, y: 0 });
  const [showPasteButton, setShowPasteButton] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollBtnHideTimer = useRef<number | null>(null);
  const [showScrollBtns, setShowScrollBtns] = useState(false);

  const { switchTerminal, search, searchPrevious, clearSearch } = useTerminal({ sendMessage });
  const { activeResourceId, activeWorkspaceId } = useSessionStore();

  // 挂载/切换终端
  useEffect(() => {
    if (containerRef.current && activeResourceId && activeWorkspaceId) {
      switchTerminal(containerRef.current);
    }
  }, [activeResourceId, activeWorkspaceId, switchTerminal]);

  // 监听 xterm viewport 滚动位置，更新置顶/置底按钮状态
  useEffect(() => {
    if (!containerRef.current || !activeResourceId) return;
    const viewport = containerRef.current.querySelector('.xterm-viewport') as HTMLElement | null;
    if (!viewport) {
      // xterm 可能还没渲染，延迟绑定
      const timer = setTimeout(() => {
        const vp = containerRef.current?.querySelector('.xterm-viewport') as HTMLElement | null;
        if (vp) bindScrollListener(vp);
      }, 500);
      return () => clearTimeout(timer);
    }
    bindScrollListener(viewport);

    function bindScrollListener(vp: HTMLElement) {
      const check = () => {
        const threshold = 30;
        setIsAtTop(vp.scrollTop <= threshold);
        setIsAtBottom(vp.scrollTop + vp.clientHeight >= vp.scrollHeight - threshold);
      };
      check();
      vp.addEventListener('scroll', check, { passive: true });
      // 也监听内容变化（新输出写入时）
      const observer = new MutationObserver(check);
      observer.observe(vp, { childList: true, subtree: true });
      return () => {
        vp.removeEventListener('scroll', check);
        observer.disconnect();
      };
    }
  }, [activeResourceId]);

  // 监听终端选中事件
  useEffect(() => {
    const handleSelection = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.resourceId === activeResourceId) {
        setSelectedText(detail.text);
        if (detail.text) {
          // 使用全局鼠标位置（相对于视口）
          const mouseX = detail.mouseX ?? window.innerWidth / 2;
          const mouseY = detail.mouseY ?? 100;
          setCopyButtonPosition({
            x: Math.max(80, Math.min(mouseX, window.innerWidth - 80)),
            y: Math.max(50, mouseY - 10),
          });
          setShowCopyButton(true);
        } else {
          setShowCopyButton(false);
        }
      }
    };

    window.addEventListener('terminal:selection', handleSelection);
    return () => window.removeEventListener('terminal:selection', handleSelection);
  }, [activeResourceId]);

  // 监听剪贴板变化
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text !== copiedText) {
          setCopiedText(text);
          setShowPasteButton(true);
        }
      } catch (err) {
        // 剪贴板访问被拒绝，忽略
      }
    };

    // 定期检查剪贴板
    const interval = setInterval(checkClipboard, 1000);
    return () => clearInterval(interval);
  }, [copiedText]);

  // 移动端：输入框聚焦时自动滚动到可视区域
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleFocus = () => {
      // 通知其他组件输入框已聚焦
      window.dispatchEvent(new CustomEvent('terminal:input-focus', { detail: true }));
      // 延迟滚动，等待虚拟键盘弹出
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    };

    const handleBlur = () => {
      // 通知其他组件输入框已失焦
      window.dispatchEvent(new CustomEvent('terminal:input-focus', { detail: false }));
    };

    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);
    return () => {
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
    };
  }, []);

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
    setShowPasteButton(false);
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
        if (showSearch) {
          setShowSearch(false);
          setSearchQuery('');
          clearSearch();
        } else {
          sendRaw('\x1b');
        }
        return;
      }
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        sendRaw('\x03');
        return;
      }
      if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
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
    [handleSubmit, sendRaw, inputValue, showSearch, clearSearch]
  );

  // Action bar 按钮
  const handleAction = useCallback(
    (data: string) => {
      sendRaw(data);
      inputRef.current?.focus();
    },
    [sendRaw]
  );

  // 复制选中文本
  const handleCopy = useCallback(async () => {
    if (selectedText) {
      try {
        await navigator.clipboard.writeText(selectedText);
        setCopiedText(selectedText);
        setShowPasteButton(true);
        setShowCopyButton(false);
        // 显示复制成功提示
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-theme-success text-theme-bg px-4 py-2 rounded-lg text-sm font-medium z-50 animate-fade-in';
        notification.textContent = '已复制';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  }, [selectedText]);

  // 粘贴文本到输入框
  const handlePaste = useCallback(() => {
    if (copiedText) {
      setInputValue(prev => prev + copiedText);
      setShowPasteButton(false);
      inputRef.current?.focus();
    }
  }, [copiedText]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query) search(query);
    else clearSearch();
  }, [search, clearSearch]);

  const handleSearchClose = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
    clearSearch();
    inputRef.current?.focus();
  }, [clearSearch]);

  // 中文快捷按钮处理
  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'clear':
        sendRaw('\x0c'); // Ctrl+L
        break;
      case 'interrupt':
        sendRaw('\x03'); // Ctrl+C
        break;
      case 'exit':
        sendRaw('\x04'); // Ctrl+D
        break;
      case 'help':
        sendText('--help\r');
        break;
      case 'history':
        sendText('history\r');
        break;
      case 'ls':
        sendText('ls -la\r');
        break;
      case 'pwd':
        sendText('pwd\r');
        break;
      case 'cd':
        sendText('cd ~\r');
        break;
    }
    inputRef.current?.focus();
  }, [sendRaw, sendText]);

  // ==================== 置顶/置底滚动 ====================
  const scrollToTop = useCallback(() => {
    const viewport = containerRef.current?.querySelector('.xterm-viewport') as HTMLElement | null;
    if (viewport) {
      viewport.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    const viewport = containerRef.current?.querySelector('.xterm-viewport') as HTMLElement | null;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  // 鼠标悬浮在终端区域时显示滚动按钮
  const handleTerminalMouseEnter = useCallback(() => {
    if (scrollBtnHideTimer.current) clearTimeout(scrollBtnHideTimer.current);
    setShowScrollBtns(true);
  }, []);

  const handleTerminalMouseLeave = useCallback(() => {
    scrollBtnHideTimer.current = window.setTimeout(() => setShowScrollBtns(false), 300);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-theme-bg min-h-0 overflow-hidden">
      {showSearch && (
        <div className="flex-shrink-0 px-3 py-2 bg-theme-surface border-b border-theme-border">
          <div className="flex items-center gap-2">
            <Icon name="search" size={16} className="text-theme-text-muted flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery) {
                  e.shiftKey ? searchPrevious(searchQuery) : search(searchQuery);
                } else if (e.key === 'Escape') {
                  handleSearchClose();
                }
              }}
              placeholder="搜索终端内容..."
              className="flex-1 bg-transparent text-theme-text placeholder-theme-text-muted text-sm focus:outline-none"
              autoFocus
            />
            <button onClick={() => searchPrevious(searchQuery)} disabled={!searchQuery} className="p-1.5 rounded-md hover:bg-theme-surface-light text-theme-text-muted hover:text-theme-text disabled:opacity-30" title="上一个 (Shift+Enter)">
              <Icon name="chevron-up" size={14} />
            </button>
            <button onClick={() => search(searchQuery)} disabled={!searchQuery} className="p-1.5 rounded-md hover:bg-theme-surface-light text-theme-text-muted hover:text-theme-text disabled:opacity-30" title="下一个 (Enter)">
              <Icon name="chevron-down" size={14} />
            </button>
            <button onClick={handleSearchClose} className="p-1.5 rounded-md hover:bg-theme-surface-light text-theme-text-muted hover:text-theme-text" title="关闭 (Esc)">
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>
      )}
      {/* 终端渲染区域 */}
      <div
        className="flex-1 min-h-0 relative cursor-text"
        onClick={(e) => {
          // 移动端：点击终端区域时聚焦到输入框
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.xterm')) {
            inputRef.current?.focus();
          }
        }}
        onMouseEnter={handleTerminalMouseEnter}
        onMouseLeave={handleTerminalMouseLeave}
      >
        <div
          ref={containerRef}
          tabIndex={-1}
          className="absolute inset-1.5 sm:inset-3 rounded-xl overflow-hidden focus:outline-none"
          style={{
            background: 'var(--theme-bg)',
            boxShadow: 'inset 0 0 30px rgba(255,255,255,0.02), 0 0 0 1px var(--theme-border)',
            // 移动端：禁止浏览器默认触摸处理，由 useTerminal 统一管理
            touchAction: 'none',
          }}
        />

        {/* 置顶/置底浮动按钮 */}
        <div
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5 transition-all duration-300 ease-out ${
            showScrollBtns ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
          }`}
        >
          {/* 置顶按钮 */}
          {!isAtTop && (
            <button
              onClick={(e) => { e.stopPropagation(); scrollToTop(); }}
              className="group/btn w-9 h-9 flex items-center justify-center rounded-full
                bg-theme-surface-light/60 backdrop-blur-md
                text-theme-text-muted
                hover:text-theme-accent hover:bg-theme-surface-light
                hover:shadow-[0_0_16px_rgba(83,216,251,0.2),0_2px_8px_rgba(0,0,0,0.3)]
                active:scale-[0.85]
                transition-all duration-200 ease-out"
              title="回到顶部"
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="transition-transform duration-200 group-hover/btn:-translate-y-0.5 group-hover/btn:scale-110"
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
          )}

          {/* 置底按钮 */}
          {!isAtBottom && (
            <button
              onClick={(e) => { e.stopPropagation(); scrollToBottom(); }}
              className="group/btn w-9 h-9 flex items-center justify-center rounded-full
                bg-theme-surface-light/60 backdrop-blur-md
                text-theme-text-muted
                hover:text-theme-accent hover:bg-theme-surface-light
                hover:shadow-[0_0_16px_rgba(83,216,251,0.2),0_2px_8px_rgba(0,0,0,0.3)]
                active:scale-[0.85]
                transition-all duration-200 ease-out"
              title="回到底部"
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="transition-transform duration-200 group-hover/btn:translate-y-0.5 group-hover/btn:scale-110"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* VS Code 风格浮动工具栏 - 选中文本时显示 */}
      {showCopyButton && selectedText && (
        <div
          className="fixed z-[9999] animate-fade-in pointer-events-auto"
          style={{
            left: `${copyButtonPosition.x}px`,
            top: `${copyButtonPosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-center gap-1 px-2 py-1.5 bg-theme-surface border border-theme-border rounded-lg shadow-xl backdrop-blur-sm">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-theme-accent text-theme-bg rounded-md text-xs font-semibold hover:bg-theme-accent/90 transition-all active:scale-95"
            >
              <Icon name="copy" size={12} />
              <span>复制</span>
            </button>
            <button
              onClick={() => setShowCopyButton(false)}
              className="flex items-center justify-center w-7 h-7 text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-light rounded-md transition-all"
            >
              <Icon name="x" size={12} />
            </button>
          </div>
          {/* 小三角箭头 */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-theme-surface border-r border-b border-theme-border rotate-45" />
        </div>
      )}

      {/* 输入框 + Action Bar */}
      <div data-guide="input" className="px-2 sm:px-3 pt-2 pb-2 sm:pb-3 flex-shrink-0 safe-area-pb">
        <div className="relative group">
          <div
            className="absolute -inset-0.5 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm"
            style={{ background: 'linear-gradient(to right, var(--theme-gradient-from), var(--theme-gradient-to))' }}
          />

          <div className="relative flex items-center gap-2 bg-theme-surface-light rounded-xl border border-theme-border group-focus-within:border-transparent transition-all duration-300">
            <div className="pl-4 text-theme-text-muted font-mono text-sm select-none">{'❯'}</div>
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
            <div className="flex items-center gap-1 mr-2">
              {/* 粘贴按钮 - 剪贴板有内容时显示 */}
              {showPasteButton && copiedText && (
                <button
                  onClick={handlePaste}
                  className={`flex items-center gap-1 px-2.5 py-2 border border-theme-border/50 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                    showPasteButton
                      ? 'bg-theme-accent/10 text-theme-accent border-theme-accent/40 shadow-[0_0_12px_rgba(var(--theme-accent-rgb),0.3)] animate-paste-glow'
                      : 'hover:bg-theme-surface-light hover:border-theme-border'
                  }`}
                  title="粘贴"
                >
                  <Icon name="clipboard" size={14} />
                  <span>粘贴</span>
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className="px-3 py-2.5 sm:py-2 bg-theme-text text-theme-bg rounded-lg text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-theme-glow active:scale-95 transition-all duration-200 my-auto"
                style={{ minWidth: '56px', minHeight: '44px' }}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* ===== Action Bar ===== */}
        <div data-guide="actionbar" className="flex items-center gap-1.5 sm:gap-1.5 mt-2 px-1 overflow-x-auto scrollbar-none">

          {/* Cancel */}
          <button
            onClick={() => { sendRaw('\x03'); inputRef.current?.focus(); }}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-mono text-theme-error/80 hover:text-theme-error hover:bg-theme-error/10 border border-transparent hover:border-theme-error/20 transition-all active:scale-95 min-h-[44px] sm:min-h-0"
            title="Ctrl+C"
          >
            <Icon name="x" size={12} className="sm:w-2.5 sm:h-2.5" />
            <span>Cancel</span>
          </button>

          {/* Esc */}
          <button
            onClick={() => handleAction('\x1b')}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-mono text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95 min-h-[44px] sm:min-h-0"
            title="Esc"
          >
            <Icon name="chevron-left" size={12} className="sm:w-2.5 sm:h-2.5" />
            <span>Esc</span>
          </button>

          {/* Tab */}
          <button
            onClick={() => handleAction('\t')}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-mono text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95 min-h-[44px] sm:min-h-0"
            title="Tab"
          >
            <Icon name="chevron-right" size={12} className="sm:w-2.5 sm:h-2.5" />
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
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-mono text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95 min-h-[44px] sm:min-h-0"
            title="Shift+Enter: newline"
          >
            <span>↵ Newline</span>
          </button>

          {/* 搜索 */}
          <button
            onClick={() => {
              setShowSearch(true);
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-mono text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95 min-h-[44px] sm:min-h-0"
            title="Ctrl+F: 搜索终端内容"
          >
            <Icon name="search" size={12} className="sm:w-2.5 sm:h-2.5" />
            <span>搜索</span>
          </button>

          {/* 分隔 */}
          <div className="w-px h-4 bg-theme-border flex-shrink-0 mx-0.5" />

          {/* 切换模式（= Shift+Tab） */}
          <button
            onClick={() => { sendRaw('\x1b[Z'); inputRef.current?.focus(); }}
            className="flex-shrink-0 px-3 py-2 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-semibold font-mono text-theme-accent/80 hover:text-theme-accent bg-theme-accent/5 hover:bg-theme-accent/10 border border-theme-accent/20 hover:border-theme-accent/40 transition-all active:scale-95 min-h-[44px] sm:min-h-0"
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
            className="flex-shrink-0 w-11 h-11 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-sm sm:text-xs font-mono text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
            title="Previous history"
          >
            ↑
          </button>
          <button
            onClick={() => handleAction('\x1b[B')}
            disabled={inputValue.length > 0}
            className="flex-shrink-0 w-11 h-11 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-sm sm:text-xs font-mono text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
            title="Next history"
          >
            ↓
          </button>
        </div>

        {/* ===== 中文快捷按钮 ===== */}
        <div data-guide="quickactions" className="flex items-center gap-1.5 sm:gap-1.5 mt-2 px-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => handleQuickAction('clear')}
            className="flex-shrink-0 px-3 py-2 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-medium text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95 min-h-[44px] sm:min-h-0"
            title="清屏 (Ctrl+L)"
          >
            清屏
          </button>
          <button
            onClick={() => handleQuickAction('interrupt')}
            className="flex-shrink-0 px-3 py-2 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-medium text-theme-error/80 hover:text-theme-error hover:bg-theme-error/10 border border-transparent hover:border-theme-error/20 transition-all active:scale-95 min-h-[44px] sm:min-h-0"
            title="中断 (Ctrl+C)"
          >
            中断
          </button>
          <button
            onClick={() => handleQuickAction('exit')}
            className="flex-shrink-0 px-3 py-2 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-medium text-theme-warning/80 hover:text-theme-warning hover:bg-theme-warning/10 border border-transparent hover:border-theme-warning/20 transition-all active:scale-95 min-h-[44px] sm:min-h-0"
            title="退出 (Ctrl+D)"
          >
            退出
          </button>
          <button
            onClick={() => handleQuickAction('help')}
            className="flex-shrink-0 px-3 py-2 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-medium text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95 min-h-[44px] sm:min-h-0"
            title="显示帮助"
          >
            帮助
          </button>
          <button
            onClick={() => handleQuickAction('history')}
            className="flex-shrink-0 px-3 py-2 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-medium text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-light border border-transparent hover:border-theme-border transition-all active:scale-95 min-h-[44px] sm:min-h-0"
            title="查看历史命令"
          >
            历史
          </button>

          {/* 分隔 */}
          <div className="w-px h-4 bg-theme-border flex-shrink-0 mx-0.5" />

          <button
            onClick={() => handleQuickAction('ls')}
            className="flex-shrink-0 px-3 py-2 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-mono text-theme-accent/80 hover:text-theme-accent bg-theme-accent/5 hover:bg-theme-accent/10 border border-theme-accent/20 hover:border-theme-accent/40 transition-all active:scale-95 min-h-[44px] sm:min-h-0"
            title="列出当前目录下的文件"
          >
            ls <span className="text-theme-text-muted text-[9px] sm:text-[8px]">列文件</span>
          </button>
          <button
            onClick={() => handleQuickAction('pwd')}
            className="flex-shrink-0 px-3 py-2 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-mono text-theme-accent/80 hover:text-theme-accent bg-theme-accent/5 hover:bg-theme-accent/10 border border-theme-accent/20 hover:border-theme-accent/40 transition-all active:scale-95 min-h-[44px] sm:min-h-0"
            title="显示当前工作目录的完整路径"
          >
            pwd <span className="text-theme-text-muted text-[9px] sm:text-[8px]">当前路径</span>
          </button>
          <button
            onClick={() => handleQuickAction('cd')}
            className="flex-shrink-0 px-3 py-2 sm:py-1 rounded-lg text-[11px] sm:text-[10px] font-mono text-theme-accent/80 hover:text-theme-accent bg-theme-accent/5 hover:bg-theme-accent/10 border border-theme-accent/20 hover:border-theme-accent/40 transition-all active:scale-95 min-h-[44px] sm:min-h-0"
            title="切换到用户主目录"
          >
            cd~ <span className="text-theme-text-muted text-[9px] sm:text-[8px]">回主目录</span>
          </button>
        </div>
      </div>
    </div>
  );
};
