import React from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import type { BikeModel, Family } from "@/src/game/types";
import { useTheme } from "@/src/theme";

const OUTLINE = "#3A2E1E";

function darken(hex: string, f = 0.75): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.slice(0, 2), 16) * f);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * f);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * f);
  return `rgb(${r},${g},${b})`;
}

// ---------- Spinning wheel (rear 3/4) ----------
function SpinWheel({ cx, cy, r, spin = 0 }: { cx: number; cy: number; r: number; spin?: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill="#26262B" stroke={OUTLINE} strokeWidth={3.5} />
      <Circle cx={cx} cy={cy} r={r * 0.52} fill="#C9CDD3" stroke={OUTLINE} strokeWidth={2} />
      <G transform={`rotate(${spin}, ${cx}, ${cy})`}>
        {[0, 60, 120].map((a) => {
          const rad = (a * Math.PI) / 180;
          const dx = Math.cos(rad) * r * 0.5;
          const dy = Math.sin(rad) * r * 0.5;
          return (
            <Line
              key={a}
              x1={cx - dx}
              y1={cy - dy}
              x2={cx + dx}
              y2={cy + dy}
              stroke="#7A8087"
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
      </G>
      <Circle cx={cx} cy={cy} r={r * 0.18} fill={OUTLINE} />
    </G>
  );
}

// ---------- Player motorcycle (rear 3/4 view, fully customizable) ----------
export function PlayerBike({
  size,
  boosting,
  model = "street",
  bikeColor,
  helmetColor = "#F2F4F7",
  outfitColor,
  skin = "#E9B48C",
  spin = 0,
  dead = false,
}: {
  size: number;
  boosting?: boolean;
  model?: BikeModel;
  bikeColor?: string;
  helmetColor?: string;
  outfitColor?: string;
  skin?: string;
  spin?: number;
  dead?: boolean;
}) {
  const { colors } = useTheme();
  const w = size;
  const h = size * 1.5;
  const body = boosting ? "#FFC02E" : bikeColor ?? colors.brake;
  const outfit = outfitColor ?? colors.engine;

  const Bike = (
    <>
      {/* rear wheel */}
      <SpinWheel cx={50} cy={120} r={22} spin={spin} />
      {/* exhausts */}
      <Rect x={16} y={98} width={18} height={11} rx={5} fill="#C9CDD3" stroke={OUTLINE} strokeWidth={3} />
      <Rect x={66} y={98} width={18} height={11} rx={5} fill="#C9CDD3" stroke={OUTLINE} strokeWidth={3} />
      {/* body / seat / tank */}
      <Path d="M30 108 Q26 66 50 56 Q74 66 70 108 Z" fill={body} stroke={OUTLINE} strokeWidth={3.5} />
      <Path d="M40 74 Q50 68 60 74 L58 96 Q50 92 42 96 Z" fill={darken(body, 0.8)} />
      {/* tail light */}
      <Rect x={44} y={102} width={12} height={6} rx={3} fill={colors.error} stroke={OUTLINE} strokeWidth={2} />
      {/* model accents */}
      {model === "sport" || model === "moto" ? (
        <Path d="M32 60 Q50 50 68 60 L66 66 Q50 58 34 66 Z" fill={darken(body, 0.6)} stroke={OUTLINE} strokeWidth={2.5} />
      ) : null}
      {model === "neon" ? (
        <Path d="M30 110 Q50 118 70 110" stroke="#00E5FF" strokeWidth={4} fill="none" strokeLinecap="round" />
      ) : null}
      {model === "moto" ? (
        <Circle cx={50} cy={88} r={7} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={2} />
      ) : null}
      {/* rider torso (outfit) */}
      <Rect x={36} y={46} width={28} height={36} rx={12} fill={outfit} stroke={OUTLINE} strokeWidth={3.5} />
      <Rect x={45} y={50} width={10} height={26} rx={5} fill={darken(outfit, 0.8)} />
      {/* arms to bars */}
      <Path d="M36 56 Q26 60 24 66" stroke={outfit} strokeWidth={7} strokeLinecap="round" />
      <Path d="M64 56 Q74 60 76 66" stroke={outfit} strokeWidth={7} strokeLinecap="round" />
      {/* hands */}
      <Circle cx={23} cy={67} r={4} fill={skin} stroke={OUTLINE} strokeWidth={2} />
      <Circle cx={77} cy={67} r={4} fill={skin} stroke={OUTLINE} strokeWidth={2} />
      {/* neck */}
      <Rect x={45} y={40} width={10} height={10} rx={4} fill={skin} />
      {/* helmet */}
      <Circle cx={50} cy={30} r={17} fill={helmetColor} stroke={OUTLINE} strokeWidth={3.5} />
      <Path d="M39 30 Q50 21 61 30 L59 37 Q50 32 41 37 Z" fill={darken(helmetColor, 0.55)} />
      {/* mirrors */}
      <Circle cx={22} cy={62} r={5} fill={helmetColor} stroke={OUTLINE} strokeWidth={2.5} />
      <Circle cx={78} cy={62} r={5} fill={helmetColor} stroke={OUTLINE} strokeWidth={2.5} />
    </>
  );

  if (dead) {
    return (
      <Svg width={w} height={h} viewBox="0 0 100 150">
        <Ellipse cx={50} cy={140} rx={38} ry={8} fill="rgba(0,0,0,0.18)" />
        <G transform="rotate(26, 50, 90)">
          {Bike}
        </G>
        {/* X eyes over helmet */}
        <G>
          <Line x1={38} y1={34} x2={46} y2={42} stroke={OUTLINE} strokeWidth={3} strokeLinecap="round" />
          <Line x1={46} y1={34} x2={38} y2={42} stroke={OUTLINE} strokeWidth={3} strokeLinecap="round" />
        </G>
        {/* dizzy stars */}
        {[
          { x: 60, y: 14, r: 5, c: "#FFC02E" },
          { x: 74, y: 24, r: 4, c: "#FF8A3D" },
          { x: 66, y: 6, r: 3.5, c: "#7ED957" },
        ].map((s, i) => (
          <Star key={i} x={s.x} y={s.y} r={s.r} fill={s.c} />
        ))}
      </Svg>
    );
  }

  return (
    <Svg width={w} height={h} viewBox="0 0 100 150">
      <Ellipse cx={50} cy={142} rx={30} ry={7} fill="rgba(0,0,0,0.18)" />
      {boosting ? (
        <>
          <Path d="M20 130 L14 150" stroke="#FFC02E" strokeWidth={5} strokeLinecap="round" opacity={0.8} />
          <Path d="M80 130 L86 150" stroke="#FF8A3D" strokeWidth={5} strokeLinecap="round" opacity={0.8} />
        </>
      ) : null}
      {Bike}
    </Svg>
  );
}

function Star({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${x + Math.cos(ang) * rad},${y + Math.sin(ang) * rad}`);
  }
  return <Path d={`M${pts.join(" L")} Z`} fill={fill} stroke={OUTLINE} strokeWidth={1.5} />;
}

// ---------- Traffic car (rear view) with spinning hubcaps ----------
export function Car({ size, color, truck, spin = 0 }: { size: number; color: string; truck?: boolean; spin?: number }) {
  if (truck) return <Truck size={size} color={color} spin={spin} />;
  const w = size;
  const h = size * 1.25;
  return (
    <Svg width={w} height={h} viewBox="0 0 100 125">
      <Ellipse cx={50} cy={118} rx={40} ry={7} fill="rgba(0,0,0,0.16)" />
      {/* wheels */}
      <Rect x={6} y={40} width={14} height={60} rx={7} fill="#26262B" stroke={OUTLINE} strokeWidth={3} />
      <Rect x={80} y={40} width={14} height={60} rx={7} fill="#26262B" stroke={OUTLINE} strokeWidth={3} />
      <Hubcap cx={13} cy={70} spin={spin} />
      <Hubcap cx={87} cy={70} spin={spin} />
      {/* body */}
      <Rect x={14} y={16} width={72} height={98} rx={20} fill={color} stroke={OUTLINE} strokeWidth={4} />
      <Rect x={24} y={24} width={52} height={30} rx={12} fill={darken(color, 0.7)} />
      <Rect x={28} y={30} width={44} height={18} rx={9} fill="#BFE4FF" />
      <Rect x={20} y={92} width={18} height={12} rx={5} fill="#FF5A5F" stroke={OUTLINE} strokeWidth={2.5} />
      <Rect x={62} y={92} width={18} height={12} rx={5} fill="#FF5A5F" stroke={OUTLINE} strokeWidth={2.5} />
      <Rect x={22} y={106} width={56} height={8} rx={4} fill={darken(color, 0.6)} />
    </Svg>
  );
}

function Hubcap({ cx, cy, spin }: { cx: number; cy: number; spin: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={5.5} fill="#C9CDD3" stroke={OUTLINE} strokeWidth={2} />
      <G transform={`rotate(${spin}, ${cx}, ${cy})`}>
        <Line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy} stroke="#7A8087" strokeWidth={2} />
        <Line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} stroke="#7A8087" strokeWidth={2} />
      </G>
    </G>
  );
}

function Truck({ size, color, spin = 0 }: { size: number; color: string; spin?: number }) {
  const w = size;
  const h = size * 1.75;
  return (
    <Svg width={w} height={h} viewBox="0 0 100 175">
      <Ellipse cx={50} cy={168} rx={42} ry={8} fill="rgba(0,0,0,0.16)" />
      <Rect x={4} y={60} width={14} height={70} rx={7} fill="#26262B" stroke={OUTLINE} strokeWidth={3} />
      <Rect x={82} y={60} width={14} height={70} rx={7} fill="#26262B" stroke={OUTLINE} strokeWidth={3} />
      <Hubcap cx={11} cy={95} spin={spin} />
      <Hubcap cx={89} cy={95} spin={spin} />
      <Rect x={12} y={10} width={76} height={120} rx={12} fill={color} stroke={OUTLINE} strokeWidth={4} />
      <Rect x={22} y={24} width={56} height={44} rx={8} fill={darken(color, 0.8)} />
      <Path d="M50 24 L50 68 M22 46 L78 46" stroke={darken(color, 0.55)} strokeWidth={4} />
      <Rect x={46} y={80} width={8} height={40} rx={4} fill={darken(color, 0.55)} />
      <Rect x={18} y={118} width={16} height={10} rx={4} fill="#FFC02E" stroke={OUTLINE} strokeWidth={2.5} />
      <Rect x={66} y={118} width={16} height={10} rx={4} fill="#FFC02E" stroke={OUTLINE} strokeWidth={2.5} />
    </Svg>
  );
}

// ---------- Coin ----------
export function CoinIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={17} fill="#FFB800" stroke={OUTLINE} strokeWidth={3} />
      <Circle cx={20} cy={20} r={11} fill="#FFD84D" stroke="#E5A000" strokeWidth={2} />
      <Path d="M16 14 L24 14 M20 14 L20 26 M16 26 L24 26" stroke="#B87400" strokeWidth={3} strokeLinecap="round" />
      <Circle cx={14} cy={13} r={2.5} fill="rgba(255,255,255,0.8)" />
    </Svg>
  );
}

// ---------- Loot crate ----------
export function CrateIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x={6} y={16} width={36} height={26} rx={5} fill="#C98A3D" stroke={OUTLINE} strokeWidth={3} />
      <Rect x={6} y={12} width={36} height={10} rx={4} fill="#E0A85A" stroke={OUTLINE} strokeWidth={3} />
      <Rect x={19} y={12} width={10} height={30} fill="#8A5A22" opacity={0.5} />
      <Rect x={6} y={24} width={36} height={5} fill="#8A5A22" opacity={0.5} />
      <Path d="M20 20 L24 24 L28 20" stroke="#FFF" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// ---------- Part family cartoon icons ----------
export function PartIcon({ family, size }: { family: Family; size: number }) {
  if (family === "engine") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Circle cx={24} cy={24} r={15} fill="#FF7A3D" stroke={OUTLINE} strokeWidth={3} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <Rect
              key={a}
              x={24 + Math.cos(r) * 15 - 2.5}
              y={24 + Math.sin(r) * 15 - 2.5}
              width={5}
              height={5}
              rx={1.5}
              fill="#FF7A3D"
              stroke={OUTLINE}
              strokeWidth={2}
            />
          );
        })}
        <Circle cx={24} cy={24} r={6} fill="#FFD1B0" stroke={OUTLINE} strokeWidth={2.5} />
      </Svg>
    );
  }
  if (family === "brake") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Circle cx={24} cy={24} r={16} fill="#2F9BE0" stroke={OUTLINE} strokeWidth={3} />
        <Circle cx={24} cy={24} r={6} fill="#DDF1FF" stroke={OUTLINE} strokeWidth={2.5} />
        {Array.from({ length: 10 }).map((_, i) => {
          const r = (i * 36 * Math.PI) / 180;
          return <Circle key={i} cx={24 + Math.cos(r) * 11} cy={24 + Math.sin(r) * 11} r={1.6} fill="#DDF1FF" />;
        })}
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x={8} y={12} width={6} height={20} rx={3} fill="#B06BFF" stroke={OUTLINE} strokeWidth={2.5} />
      <Rect x={34} y={12} width={6} height={20} rx={3} fill="#B06BFF" stroke={OUTLINE} strokeWidth={2.5} />
      <Path d="M6 16 Q24 6 42 16 L42 24 Q24 16 6 24 Z" fill="#B06BFF" stroke={OUTLINE} strokeWidth={3} />
      <Path d="M12 33 L36 33" stroke="#B06BFF" strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}

// ---------- Badge (menu / loading) ----------
export function BikeBadge({ size, spin = 0 }: { size: number; spin?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <SvgGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.brandPrimary} />
          <Stop offset="1" stopColor={colors.brandSecondary} />
        </SvgGradient>
      </Defs>
      <Circle cx={50} cy={50} r={46} fill="url(#bg)" stroke={OUTLINE} strokeWidth={5} />
      <G transform="translate(25, 16) scale(0.5)">
        <SpinWheel cx={50} cy={120} r={22} spin={spin} />
        <Path d="M30 108 Q26 66 50 56 Q74 66 70 108 Z" fill="#FF7A3D" stroke={OUTLINE} strokeWidth={3.5} />
        <Circle cx={50} cy={30} r={17} fill="#F2F4F7" stroke={OUTLINE} strokeWidth={3.5} />
        <Path d="M39 30 Q50 21 61 30 L59 37 Q50 32 41 37 Z" fill="#2F9BE0" />
      </G>
    </Svg>
  );
}
