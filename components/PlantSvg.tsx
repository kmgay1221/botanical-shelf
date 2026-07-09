/**
 * カテゴリ別の植物イラストSVG
 * モックの agave() 関数ロジックを移植
 */

import type { SpeciesCategory } from "@/types/database";

interface AgaveSvgProps {
  color1: string;
  color2: string;
  leaves: number;
  spread: number;
  id?: string;
}

function AgaveSvg({ color1, color2, leaves, spread, id = "ag" }: AgaveSvgProps) {
  const gradId = `g-${id}`;
  const paths = Array.from({ length: leaves }, (_, i) => {
    const angle = (360 / leaves) * i;
    const opacity = (0.82 + 0.18 * Math.sin(i)).toFixed(3);
    return (
      <path
        key={i}
        d={`M0,-6 C ${spread},-30 ${spread * 0.55},-72 0,-92 C ${-spread * 0.55},-72 ${-spread},-30 0,-6 Z`}
        fill={`url(#${gradId})`}
        stroke={color2}
        strokeWidth="1.2"
        transform={`rotate(${angle})`}
        opacity={opacity}
      />
    );
  });

  return (
    <svg viewBox="-100 -100 200 200" style={{ width: "78%", height: "78%" }}>
      <defs>
        <radialGradient id={gradId} cx="50%" cy="85%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </radialGradient>
      </defs>
      <g>{paths}</g>
      <circle r="7" fill={color1} />
    </svg>
  );
}

// パキプス風 SVG (caudex_shrub)
function PachypusSvg() {
  return (
    <svg viewBox="-100 -100 200 200" style={{ width: "78%", height: "78%" }}>
      <path d="M-16,90 C-30,30 -22,-10 -6,-38 C-2,-46 2,-46 6,-38 C22,-10 30,30 16,90 Z"
        fill="#6b5844" stroke="#3d3225" strokeWidth="2" />
      <g stroke="#5a7a52" strokeWidth="3" fill="none">
        <path d="M0,-40 C-14,-58 -30,-64 -46,-62" />
        <path d="M0,-40 C12,-60 28,-68 44,-64" />
        <path d="M-2,-52 C-6,-70 -2,-84 6,-92" />
      </g>
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx={-46 + i * 7} cy={-62 - Math.sin(i) * 14} r="3.4" fill="#7fa06f" />
      ))}
    </svg>
  );
}

// 亀甲竜風 SVG (冬型コーデックス)
function KikkoSvg() {
  const diamonds: [number, number][] = [[-20,8],[16,4],[-2,34],[-36,34],[30,36],[-16,58],[18,60]];
  return (
    <svg viewBox="-100 -100 200 200" style={{ width: "78%", height: "78%" }}>
      <circle cx="0" cy="30" r="52" fill="#8a7a5f" />
      <g stroke="#4f452f" strokeWidth="2.5" fill="#a08e6d">
        {diamonds.map(([px, py], i) => (
          <polygon key={i} points={`${px-14},${py} ${px},${py-13} ${px+14},${py} ${px},${py+13}`} />
        ))}
      </g>
      <path d="M0,-20 C-4,-46 6,-62 2,-84" stroke="#5a6b4a" strokeWidth="3" fill="none" />
      <path d="M2,-84 l-12,-8 M2,-84 l12,-6" stroke="#5a6b4a" strokeWidth="3" />
    </svg>
  );
}

// ユーフォルビア風（球形）
function EuphorbiasSvg() {
  return (
    <svg viewBox="-100 -100 200 200" style={{ width: "78%", height: "78%" }}>
      <circle cx="0" cy="10" r="64" fill="#6b8c5a" />
      <g stroke="#4a6340" strokeWidth="2" fill="none">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (360 / 8) * i;
          const rad = (a * Math.PI) / 180;
          return <line key={i} x1={Math.cos(rad)*10} y1={10+Math.sin(rad)*10} x2={Math.cos(rad)*62} y2={10+Math.sin(rad)*62} />;
        })}
      </g>
      <circle cx="0" cy="10" r="12" fill="#8ab87a" />
    </svg>
  );
}

// 観葉植物風（大きな葉）
function HouseplantSvg() {
  return (
    <svg viewBox="-100 -100 200 200" style={{ width: "78%", height: "78%" }}>
      <path d="M0,80 C0,20 0,-20 0,-80" stroke="#5a7a52" strokeWidth="4" fill="none" />
      <path d="M0,-10 C-40,-30 -70,-20 -80,10 C-60,-5 -20,0 0,-10 Z" fill="#7aad6a" stroke="#4a7a3a" strokeWidth="1.5" />
      <path d="M0,-10 C40,-30 70,-20 80,10 C60,-5 20,0 0,-10 Z" fill="#8ac47a" stroke="#4a7a3a" strokeWidth="1.5" />
      <path d="M0,-40 C-30,-55 -55,-45 -65,-20 C-45,-35 -10,-30 0,-40 Z" fill="#6da05e" stroke="#4a7a3a" strokeWidth="1.5" />
      <path d="M0,-40 C30,-55 55,-45 65,-20 C45,-35 10,-30 0,-40 Z" fill="#7ab86a" stroke="#4a7a3a" strokeWidth="1.5" />
    </svg>
  );
}

// 実生苗 (small seedling)
function SeedlingSvg() {
  return (
    <AgaveSvg color1="#c4d8a8" color2="#4c5c38" leaves={5} spread={34} id="seed" />
  );
}

// カテゴリ別の SVG を返す
const CATEGORY_VARIANTS: Record<string, [string, string, number, number] | null> = {
  agave_0: ["#b7d2c1", "#3f5c4b", 12, 26],
  agave_1: ["#a3c4b8", "#35544a", 10, 30],
  agave_2: ["#9db8cf", "#3a4f66", 14, 22],
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

export function CategorySvg({
  category,
  speciesId = "",
  isDormant = false,
}: {
  category: SpeciesCategory;
  speciesId?: string;
  isDormant?: boolean;
}) {
  const idx = hashString(speciesId) % 3;

  let svg: React.ReactNode;

  switch (category) {
    case "agave": {
      const [c1, c2, lv, sp] = CATEGORY_VARIANTS[`agave_${idx}`]!;
      svg = <AgaveSvg color1={c1} color2={c2} leaves={lv} spread={sp} id={speciesId} />;
      break;
    }
    case "caudex_shrub":
      svg = idx === 0 ? <PachypusSvg /> : <KikkoSvg />;
      break;
    case "euphorbia":
      svg = <EuphorbiasSvg />;
      break;
    case "succulent_other": {
      const [c1, c2, lv, sp] = CATEGORY_VARIANTS[`agave_${idx}`]!;
      svg = <AgaveSvg color1={c1} color2={c2} leaves={lv} spread={sp} id={speciesId + "s"} />;
      break;
    }
    case "houseplant":
    default:
      svg = <HouseplantSvg />;
      break;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter: isDormant ? "grayscale(.5) brightness(.55)" : undefined,
      }}
    >
      {svg}
    </div>
  );
}

export { SeedlingSvg };
