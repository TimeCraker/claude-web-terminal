import React, { useState, useCallback, useEffect } from 'react';
import { Icon } from './Icon';

const AUTH_PASSWORD = '9277';
const AUTH_STORAGE_KEY = 'ai-workspace-auth';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showError, setShowError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 检查本地存储的认证状态
  useEffect(() => {
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedAuth === AUTH_PASSWORD) {
      setIsAuthenticated(true);
    }
  }, []);

  // 实时检查输入
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowError(false);

    // 输入 4 位数字时自动检查
    if (value.length === 4) {
      if (value === AUTH_PASSWORD) {
        // 认证成功
        setShowSuccess(true);
        localStorage.setItem(AUTH_STORAGE_KEY, value);
        setTimeout(() => {
          setIsAuthenticated(true);
        }, 800);
      } else {
        // 认证失败
        setIsShaking(true);
        setShowError(true);
        setTimeout(() => {
          setIsShaking(false);
          setInputValue('');
        }, 600);
      }
    }
  }, []);

  // 登录按钮是假的，点击无效
  const handleFakeLogin = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // 故意什么都不做
  }, []);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 bg-theme-bg flex items-center justify-center z-[9999]">
      {/* 背景动画 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-theme-accent/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-theme-accent/3 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* 登录卡片 */}
      <div
        className={`relative w-full max-w-sm mx-4 p-8 bg-theme-surface/80 backdrop-blur-xl rounded-2xl border border-theme-border shadow-2xl transition-all duration-300 ${
          isShaking ? 'animate-shake' : ''
        }`}
        style={{
          animation: isShaking ? 'shake 0.6s cubic-bezier(.36,.07,.19,.97) both' : undefined,
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-theme-accent/20 to-theme-accent/10 flex items-center justify-center mb-4 border border-theme-accent/20">
            <Icon name="lock" size={28} className="text-theme-accent" />
          </div>
          <h1 className="text-2xl font-bold text-theme-text">AI Workspace</h1>
          <p className="text-sm text-theme-text-muted mt-2">输入访问密码</p>
        </div>

        {/* 输入框 */}
        <div className="relative mb-6">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={inputValue}
            onChange={handleInputChange}
            placeholder="····"
            autoFocus
            className={`w-full px-4 py-4 bg-theme-surface-light border-2 rounded-xl text-center text-2xl font-mono tracking-[0.5em] text-theme-text placeholder-theme-text-muted/30 focus:outline-none transition-all duration-300 ${
              showError
                ? 'border-theme-error/50 focus:border-theme-error'
                : inputValue.length > 0
                  ? 'border-theme-accent/50 focus:border-theme-accent'
                  : 'border-theme-border focus:border-theme-accent/50'
            }`}
          />

          {/* 输入指示器 */}
          <div className="flex justify-center gap-2 mt-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i < inputValue.length
                    ? showError
                      ? 'bg-theme-error scale-110'
                      : 'bg-theme-accent scale-110'
                    : 'bg-theme-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {showError && (
          <div className="mb-4 p-3 bg-theme-error/10 border border-theme-error/20 rounded-lg flex items-center gap-2 animate-fade-in">
            <Icon name="alert-circle" size={16} className="text-theme-error flex-shrink-0" />
            <span className="text-sm text-theme-error">密码错误，请重试</span>
          </div>
        )}

        {/* 成功提示 */}
        {showSuccess && (
          <div className="mb-4 p-3 bg-theme-success/10 border border-theme-success/20 rounded-lg flex items-center gap-2 animate-fade-in">
            <Icon name="check-circle" size={16} className="text-theme-success flex-shrink-0" />
            <span className="text-sm text-theme-success">认证成功，正在进入...</span>
          </div>
        )}

        {/* 假的登录按钮 */}
        <button
          onClick={handleFakeLogin}
          className="w-full py-3 px-4 bg-theme-surface-light border border-theme-border rounded-xl text-sm font-medium text-theme-text-muted cursor-not-allowed transition-all duration-200 hover:bg-theme-surface-light"
          type="button"
        >
          登录
        </button>

        {/* 提示文字 */}
        <p className="text-xs text-theme-text-muted/50 text-center mt-4">
          输入 4 位数字密码自动验证
        </p>
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shake {
          animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
