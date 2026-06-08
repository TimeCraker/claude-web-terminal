import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from './Icon';

interface GuideStep {
  id: string;
  target: string;
  title: string;
  description: string;
  icon: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'sidebar',
    target: '[data-guide="sidebar"]',
    title: '工作区管理',
    description: '在这里创建和管理你的终端会话，支持 Claude、Shell、Git 等多种类型。',
    icon: 'sidebar',
  },
  {
    id: 'input',
    target: '[data-guide="input"]',
    title: '命令输入',
    description: '在这里输入命令，支持自动补全和斜杠命令。点击 Send 或按 Enter 发送。',
    icon: 'terminal',
  },
  {
    id: 'actionbar',
    target: '[data-guide="actionbar"]',
    title: '快捷操作',
    description: '常用快捷键按钮：Ctrl+C 中断、Tab 补全、方向键翻历史。左右滑动查看更多。',
    icon: 'zap',
  },
  {
    id: 'quickactions',
    target: '[data-guide="quickactions"]',
    title: '中文快捷',
    description: '常用命令的中文快捷按钮：清屏、中断、退出等，方便快速操作。',
    icon: 'sparkles',
  },
  {
    id: 'settings',
    target: '[data-guide="settings"]',
    title: '主题设置',
    description: '点击这里切换主题和字体，个性化你的终端体验。',
    icon: 'settings',
  },
];

const STORAGE_KEY = 'featureOnboardingCompleted';

export const FeatureOnboarding: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // 监听开始引导事件
  useEffect(() => {
    const handleStartGuide = () => {
      setIsVisible(true);
      setCurrentStep(0);
    };

    window.addEventListener('guide:start', handleStartGuide);
    return () => window.removeEventListener('guide:start', handleStartGuide);
  }, []);

  // 计算高亮区域位置
  useEffect(() => {
    if (!isVisible) return;

    const updateHighlight = () => {
      const step = GUIDE_STEPS[currentStep];
      if (!step) return;

      const target = document.querySelector(step.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        setHighlightRect(rect);
      }
    };

    // 延迟计算，等待 DOM 更新
    const timer = setTimeout(updateHighlight, 100);

    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight);
    };
  }, [isVisible, currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setIsAnimating(false);
      }, 200);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsVisible(false);
    }, 300);
  }, []);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  if (!isVisible) return null;

  const step = GUIDE_STEPS[currentStep];
  const isLast = currentStep === GUIDE_STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className="fixed inset-0 z-[300] pointer-events-auto">
      {/* 遮罩层 - 模糊动画 */}
      <div
        className="absolute inset-0 bg-black/60 transition-all duration-500 ease-out"
        style={{
          backdropFilter: isAnimating ? 'blur(8px)' : 'blur(0px)',
          WebkitBackdropFilter: isAnimating ? 'blur(8px)' : 'blur(0px)',
          opacity: 1,
        }}
      />

      {/* 高亮区域 */}
      {highlightRect && (
        <div
          className="absolute transition-all duration-500 ease-out"
          style={{
            left: highlightRect.left - 8,
            top: highlightRect.top - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            borderRadius: '12px',
            boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.6)',
            background: 'transparent',
          }}
        >
          <div
            className="absolute inset-0 rounded-xl animate-pulse"
            style={{
              boxShadow: '0 0 20px 4px rgba(83, 216, 251, 0.4), 0 0 40px 8px rgba(83, 216, 251, 0.2)',
            }}
          />
        </div>
      )}

      {/* 引导卡片 */}
      <div
        className={`absolute transition-all duration-300 ease-out px-4 sm:px-0 ${
          isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}
        style={{
          left: '50%',
          bottom: 'min(120px, 20vh)',
          transform: 'translateX(-50%)',
          maxWidth: 'calc(100vw - 32px)',
          width: '380px',
        }}
      >
        <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-theme-accent/20 flex items-center justify-center">
              <Icon name={step.icon} size={20} className="text-theme-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-text">
                {step.title}
              </h3>
              <p className="text-xs text-theme-text-muted">
                步骤 {currentStep + 1} / {GUIDE_STEPS.length}
              </p>
            </div>
          </div>

          <p className="text-sm text-theme-text-secondary leading-relaxed mb-4">
            {step.description}
          </p>

          <div className="flex items-center gap-2 mb-4">
            {GUIDE_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-theme-accent'
                    : index < currentStep
                    ? 'w-4 bg-theme-accent/50'
                    : 'w-4 bg-theme-border'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleSkip}
              className="text-sm text-theme-text-muted hover:text-theme-text-secondary transition-colors"
            >
              跳过引导
            </button>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 text-sm font-medium text-theme-text-secondary hover:text-theme-text bg-theme-surface-light hover:bg-theme-surface-elevated rounded-xl transition-all duration-200"
                >
                  上一步
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-2 text-sm font-semibold text-theme-bg bg-theme-accent hover:bg-theme-accent/90 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLast ? '开始使用' : '下一步'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
