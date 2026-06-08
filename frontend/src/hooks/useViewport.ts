import { useState, useEffect, useCallback } from 'react';

interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  keyboardHeight: number;
  safeAreaBottom: number;
}

export function useViewport(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      width,
      height,
      isMobile: width < 640,
      isTablet: width >= 640 && width < 1024,
      isDesktop: width >= 1024,
      isLandscape: width > height,
      keyboardHeight: 0,
      safeAreaBottom: 0,
    };
  });

  const updateViewport = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const visualViewport = window.visualViewport;

    // 计算虚拟键盘高度
    let keyboardHeight = 0;
    if (visualViewport) {
      keyboardHeight = Math.max(0, height - visualViewport.height);
    }

    // 获取安全区域
    const safeAreaBottom = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0',
      10
    );

    setViewport({
      width,
      height,
      isMobile: width < 640,
      isTablet: width >= 640 && width < 1024,
      isDesktop: width >= 1024,
      isLandscape: width > height,
      keyboardHeight,
      safeAreaBottom,
    });
  }, []);

  useEffect(() => {
    updateViewport();

    // 监听普通 resize
    window.addEventListener('resize', updateViewport);

    // 监听 visualViewport（虚拟键盘弹出）
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }

    // 监听屏幕方向变化
    screen.orientation?.addEventListener('change', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
      screen.orientation?.removeEventListener('change', updateViewport);
    };
  }, [updateViewport]);

  return viewport;
}

// 根据屏幕宽度计算终端字体大小
export function getTerminalFontSize(width: number): number {
  if (width < 360) return 10; // 极小屏幕
  if (width < 640) return 12; // 手机
  if (width < 1024) return 13; // 平板
  return 14; // 桌面
}

// 根据屏幕宽度计算终端行数
export function getTerminalRows(width: number): number {
  if (width < 640) return 20; // 手机
  if (width < 1024) return 24; // 平板
  return 28; // 桌面
}
