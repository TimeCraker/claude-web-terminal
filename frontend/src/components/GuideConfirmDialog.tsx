import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from './Icon';

interface GuideConfirmDialogProps {
  onConfirm: () => void;
  onSkip: () => void;
}

const STORAGE_KEY_DONT_ASK = 'guideDontAskAgain';

export const GuideConfirmDialog: React.FC<GuideConfirmDialogProps> = ({ onConfirm, onSkip }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 监听第一次点击新建智能体事件
  useEffect(() => {
    const dontAsk = localStorage.getItem(STORAGE_KEY_DONT_ASK);
    if (dontAsk === 'true') return;

    const handleFirstCreate = () => {
      setIsVisible(true);
    };

    window.addEventListener('guide:show-confirm', handleFirstCreate);
    return () => window.removeEventListener('guide:show-confirm', handleFirstCreate);
  }, []);

  const handleConfirm = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      if (dontAskAgain) {
        localStorage.setItem(STORAGE_KEY_DONT_ASK, 'true');
      }
      setIsVisible(false);
      onConfirm();
    }, 300);
  }, [dontAskAgain, onConfirm]);

  const handleSkip = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      if (dontAskAgain) {
        localStorage.setItem(STORAGE_KEY_DONT_ASK, 'true');
      }
      setIsVisible(false);
      onSkip();
    }, 300);
  }, [dontAskAgain, onSkip]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center pointer-events-auto p-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: isAnimating ? 0 : 1 }}
      />

      {/* 对话框 */}
      <div
        className={`relative bg-theme-surface border border-theme-border rounded-2xl shadow-2xl p-5 sm:p-6 max-w-sm w-full transition-all duration-300 ${
          isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {/* 图标 */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-theme-accent/20 flex items-center justify-center">
            <Icon name="sparkles" size={28} className="text-theme-accent sm:w-8 sm:h-8" />
          </div>
        </div>

        {/* 标题和描述 */}
        <div className="text-center mb-5 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-theme-text mb-2">
            欢迎使用 AI Workspace OS
          </h3>
          <p className="text-sm text-theme-text-secondary leading-relaxed">
            看起来您是第一次使用，需要我们为您介绍基本功能吗？
          </p>
        </div>

        {/* 不再提示选项 */}
        <label className="flex items-center gap-2 mb-4 cursor-pointer group">
          <div
            className={`w-5 h-5 sm:w-4 sm:h-4 rounded border-2 flex items-center justify-center transition-all ${
              dontAskAgain
                ? 'bg-theme-accent border-theme-accent'
                : 'border-theme-border group-hover:border-theme-text-muted'
            }`}
            onClick={() => setDontAskAgain(!dontAskAgain)}
          >
            {dontAskAgain && (
              <Icon name="check" size={12} className="text-theme-bg sm:w-2.5 sm:h-2.5" />
            )}
          </div>
          <span className="text-xs text-theme-text-muted" onClick={() => setDontAskAgain(!dontAskAgain)}>
            不再提示此消息
          </span>
        </label>

        {/* 按钮组 */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-3 text-sm font-medium text-theme-text-secondary hover:text-theme-text bg-theme-surface-light hover:bg-theme-surface-elevated rounded-xl transition-all duration-200 min-h-[48px]"
          >
            不用了，我知道怎么操作
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 text-sm font-semibold text-theme-bg bg-theme-accent hover:bg-theme-accent/90 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] min-h-[48px]"
          >
            新手引导
          </button>
        </div>
      </div>
    </div>
  );
};

// 触发确认对话框的函数
export function triggerGuideConfirm() {
  const dontAsk = localStorage.getItem(STORAGE_KEY_DONT_ASK);
  if (dontAsk === 'true') return false;

  window.dispatchEvent(new CustomEvent('guide:show-confirm'));
  return true;
}
