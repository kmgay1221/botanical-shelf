/**
 * Placard — ミュージアムプレート
 * 左2px縦線（通常=--glaucous、休眠=--moon）
 * 和名: 明朝 13.5px
 * 学名: italic 10px --ink2
 */

interface PlacardProps {
  nameJa: string;
  nameScientific?: string | null;
  isDormant?: boolean;
  /** 詳細画面用の大サイズ */
  large?: boolean;
  children?: React.ReactNode;
}

export function Placard({
  nameJa,
  nameScientific,
  isDormant = false,
  large = false,
  children,
}: PlacardProps) {
  const borderColor = isDormant ? "var(--moon)" : "var(--glaucous)";

  return (
    <div
      style={{
        borderLeft: `2px solid ${borderColor}`,
        paddingLeft: "9px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: large ? "19px" : "13.5px",
          lineHeight: 1.35,
          color: "var(--ink)",
        }}
      >
        {nameJa}
      </div>
      {nameScientific && (
        <div
          style={{
            fontStyle: "italic",
            fontSize: large ? "11.5px" : "10px",
            color: "var(--ink2)",
            letterSpacing: ".03em",
          }}
        >
          {nameScientific}
        </div>
      )}
      {children}
    </div>
  );
}
