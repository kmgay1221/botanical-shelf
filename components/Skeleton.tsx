/**
 * Skeleton — ローディング中のプレースホルダー矩形
 * DESIGN.md の角丸トークンに合わせて使う（カード18px/入力14px/チップ999px/サムネ14px）
 */

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return <div className={`skeleton rounded-[6px] ${className}`} style={style} />;
}
