/**
 * Spinner — 処理中インジケータ
 * prefers-reduced-motion では回転せず静止表示
 */

interface SpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

export function Spinner({ size = 14, color = "currentColor", className = "" }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block spinner-rotate flex-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1.5px solid ${color}`,
        borderTopColor: "transparent",
        opacity: 0.9,
      }}
    />
  );
}
