/**
 * Chip — ステータスチップ
 * variant: default | water | moon | sun
 */

interface ChipProps {
  children: React.ReactNode;
  variant?: "default" | "water" | "moon" | "sun";
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

const VARIANT_STYLES = {
  default: {
    color: "var(--ink2)",
    borderColor: "var(--line)",
  },
  water: {
    color: "var(--water)",
    borderColor: "#2c4450",
  },
  moon: {
    color: "var(--moon)",
    borderColor: "#3a3448",
  },
  sun: {
    color: "var(--sun)",
    borderColor: "#4a3f2c",
  },
};

export function Chip({
  children,
  variant = "default",
  className = "",
  onClick,
  active = false,
}: ChipProps) {
  const style = VARIANT_STYLES[variant];

  return (
    <span
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-[5px] text-[10px] px-[9px] py-[3px] rounded-full border select-none ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      style={
        active
          ? {
              background: "var(--glaucous)",
              color: "#10160f",
              borderColor: "var(--glaucous)",
              fontWeight: 700,
            }
          : {
              color: style.color,
              borderColor: style.borderColor,
              background: "transparent",
            }
      }
    >
      {children}
    </span>
  );
}

/** フィルタ用チップ（横スクロール行） */
interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  variant?: "default" | "moon";
}

export function FilterChip({ label, active = false, onClick, variant = "default" }: FilterChipProps) {
  return (
    <Chip
      variant={active ? "default" : variant}
      active={active}
      onClick={onClick}
      className="flex-none"
    >
      {label}
    </Chip>
  );
}
