import React, { useId } from 'react';
import { useThemeStore } from '../themes/useThemeStore';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

/**
 * AI Workspace OS 品牌 Logo
 *
 * 设计语言：
 * - 六边形 = 工作空间节点（蜂巢结构，无限扩展）
 * - 终端光标 `>_` = 极客精神，命令行核心
 * - AI 神经连接 = 智能工作流
 * - 渐变色跟随当前主题 accent
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 40,
  showText = false,
  className = '',
}) => {
  const reactId = useId();
  const svgId = `bl${reactId.replace(/:/g, '')}`;
  const theme = useThemeStore((s) => s.getTheme());

  const from = theme.colors.gradientFrom;
  const to = theme.colors.gradientTo;
  const mid = theme.colors.accentSecondary;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo 图标 */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          {/* 主渐变 */}
          <linearGradient id={`${svgId}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="50%" stopColor={mid} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>

          {/* 光晕渐变 */}
          <radialGradient id={`${svgId}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={from} stopOpacity="0.3" />
            <stop offset="100%" stopColor={to} stopOpacity="0" />
          </radialGradient>

          {/* 内部发光 */}
          <radialGradient id={`${svgId}-inner-glow`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor={from} stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* 背景光晕 */}
        <circle cx="32" cy="32" r="30" fill={`url(#${svgId}-glow)`} />

        {/* 六边形外框 */}
        <path
          d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
          stroke={`url(#${svgId}-gradient)`}
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />

        {/* 六边形内填充（半透明） */}
        <path
          d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
          fill={`url(#${svgId}-inner-glow)`}
        />

        {/* 终端光标 `>` */}
        <path
          d="M22 24L32 32L22 40"
          stroke={`url(#${svgId}-gradient)`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 命令行横线 */}
        <line
          x1="36"
          y1="32"
          x2="46"
          y2="32"
          stroke={`url(#${svgId}-gradient)`}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* AI 神经节点 - 左上 */}
        <circle cx="20" cy="16" r="2" fill={from} opacity="0.8" />
        {/* AI 神经节点 - 右上 */}
        <circle cx="44" cy="16" r="2" fill={to} opacity="0.8" />
        {/* AI 神经节点 - 左下 */}
        <circle cx="20" cy="48" r="2" fill={mid} opacity="0.6" />
        {/* AI 神经节点 - 右下 */}
        <circle cx="44" cy="48" r="2" fill={from} opacity="0.6" />

        {/* 神经连接线 - 左上到光标 */}
        <line
          x1="20"
          y1="16"
          x2="26"
          y2="26"
          stroke={from}
          strokeWidth="0.8"
          opacity="0.4"
          strokeDasharray="2 2"
        />
        {/* 神经连接线 - 右上到横线 */}
        <line
          x1="44"
          y1="16"
          x2="42"
          y2="28"
          stroke={to}
          strokeWidth="0.8"
          opacity="0.4"
          strokeDasharray="2 2"
        />
        {/* 神经连接线 - 左下到光标 */}
        <line
          x1="20"
          y1="48"
          x2="26"
          y2="38"
          stroke={mid}
          strokeWidth="0.8"
          opacity="0.3"
          strokeDasharray="2 2"
        />
        {/* 神经连接线 - 右下到横线 */}
        <line
          x1="44"
          y1="48"
          x2="40"
          y2="36"
          stroke={from}
          strokeWidth="0.8"
          opacity="0.3"
          strokeDasharray="2 2"
        />

        {/* 底部装饰线 */}
        <line
          x1="22"
          y1="48"
          x2="42"
          y2="48"
          stroke={`url(#${svgId}-gradient)`}
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.25"
        />
      </svg>

      {/* 品牌文字 */}
      {showText && (
        <div className="flex flex-col">
          <span
            className="text-lg font-bold tracking-tight gradient-text"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          >
            AI Workspace
          </span>
          <span
            className="text-[10px] font-medium tracking-[0.2em] uppercase text-theme-text-muted"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          >
            OS
          </span>
        </div>
      )}
    </div>
  );
};
