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

// ---------- Tire seen from above, with moving tread (spin illusion) ----------
function Wheel({ x, y, w, h, spin = 0 }: { x: number; y: number; w: number; h: number; spin?: number }) {
  const gap = 7;
  const off = ((spin / 360) * gap) % gap;
  const treads: number[] = [];
  for (let ty = y + 3; ty < y + h - 3; ty += gap) treads.push(ty);
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} rx={w / 2} fill="#26262B" stroke={OUTLINE} strokeWidth={2.5} />
      {treads.map((ty, i) => (
        <Rect key={i} x={x + 1.5} y={ty + off} width={w - 3} height={2.4} rx={1.2} fill="#55555C" />
      ))}
    </G>
  );
}

// =====================================================================
// PLAYER MOTORCYCLE — TOP-DOWN (front points up = travel direction)
// =====================================================================
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
  lean = 0,
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
  lean?: number;
}) {
  const { colors } = useTheme();
  const w = size;
  const h = size * 1.35;
  const body = boosting ? "#FFC02E" : bikeColor ?? colors.brake;
  const outfit = outfitColor ?? colors.engine;
  const rot = dead ? 34 : lean;

  const Content = (
    <>
      {/* wheels */}
      <Wheel x={45} y={12} w={10} h={22} spin={spin} />
      <Wheel x={43} y={98} w={14} h={30} spin={spin} />
      {/* chassis / tank */}
      <Rect x={39} y={36} width={22} height={70} rx={11} fill={body} stroke={OUTLINE} strokeWidth={3.5} />
      <Rect x={43} y={44} width={14} height={26} rx={7} fill={darken(body, 0.82)} />
      {/* model accents */}
      {model === "sport" || model === "moto" ? (
        <Path d="M40 34 Q50 26 60 34 L58 44 Q50 38 42 44 Z" fill={darken(body, 0.62)} stroke={OUTLINE} strokeWidth={2} />
      ) : null}
      {model === "chopper" ? <Rect x={41} y={102} width={18} height={8} rx={4} fill="#C9CDD3" stroke={OUTLINE} strokeWidth={2} /> : null}
      {model === "neon" ? <Rect x={44} y={96} width={12} height={8} rx={4} fill="#00E5FF" /> : null}
      {model === "moto" ? <Circle cx={50} cy={82} r={7} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={2} /> : null}
      {/* handlebar */}
      <Line x1={28} y1={42} x2={72} y2={42} stroke="#2C2A2E" strokeWidth={5} strokeLinecap="round" />
      {/* arms (outfit) */}
      <Line x1={40} y1={58} x2={29} y2={44} stroke={outfit} strokeWidth={8} strokeLinecap="round" />
      <Line x1={60} y1={58} x2={71} y2={44} stroke={outfit} strokeWidth={8} strokeLinecap="round" />
      {/* rider shoulders */}
      <Rect x={33} y={54} width={34} height={30} rx={14} fill={outfit} stroke={OUTLINE} strokeWidth={3.5} />
      <Rect x={46} y={56} width={8} height={26} rx={4} fill={darken(outfit, 0.8)} />
      {/* hands / gloves */}
      <Circle cx={28} cy={43} r={4.5} fill={skin} stroke={OUTLINE} strokeWidth={2} />
      <Circle cx={72} cy={43} r={4.5} fill={skin} stroke={OUTLINE} strokeWidth={2} />
      {/* helmet (head, top view, forward) */}
      <Circle cx={50} cy={48} r={14} fill={helmetColor} stroke={OUTLINE} strokeWidth={3.5} />
      <Path d="M40 44 Q50 38 60 44 L58 50 Q50 46 42 50 Z" fill={darken(helmetColor, 0.5)} />
      <Rect x={48} y={35} width={4} height={12} rx={2} fill={darken(helmetColor, 0.6)} />
      {/* mirrors */}
      <Circle cx={26} cy={40} r={3.5} fill={helmetColor} stroke={OUTLINE} strokeWidth={2} />
      <Circle cx={74} cy={40} r={3.5} fill={helmetColor} stroke={OUTLINE} strokeWidth={2} />
    </>
  );

  return (
    <Svg width={w} height={h} viewBox="0 0 100 140">
      <Ellipse cx={50} cy={132} rx={26} ry={6} fill="rgba(0,0,0,0.16)" />
      {boosting && !dead ? (
        <>
          <Path d="M50 128 L42 140 L50 136 L58 140 Z" fill="#FFC02E" stroke={OUTLINE} strokeWidth={1.5} />
          <Path d="M50 126 L46 138 L50 135 L54 138 Z" fill="#FF5A5F" />
        </>
      ) : null}
      <G transform={`rotate(${rot}, 50, 72)`}>{Content}</G>
      {dead ? (
        <>
          <G>
            <Line x1={42} y1={44} x2={50} y2={52} stroke={OUTLINE} strokeWidth={2.5} strokeLinecap="round" />
            <Line x1={50} y1={44} x2={42} y2={52} stroke={OUTLINE} strokeWidth={2.5} strokeLinecap="round" />
          </G>
          {[
            { x: 66, y: 20, r: 5, c: "#FFC02E" },
            { x: 78, y: 30, r: 4, c: "#FF8A3D" },
            { x: 70, y: 12, r: 3.5, c: "#7ED957" },
          ].map((s, i) => (
            <Star key={i} x={s.x} y={s.y} r={s.r} fill={s.c} />
          ))}
        </>
      ) : null}
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

// =====================================================================
// TRAFFIC CAR — TOP-DOWN (roof view)
// =====================================================================
export function Car({ size, color, truck, spin = 0 }: { size: number; color: string; truck?: boolean; spin?: number }) {
  if (truck) return <Truck size={size} color={color} spin={spin} />;
  const w = size;
  const h = size * 1.2;
  return (
    <Svg width={w} height={h} viewBox="0 0 100 120">
      <Ellipse cx={50} cy={114} rx={42} ry={6} fill="rgba(0,0,0,0.16)" />
      {/* wheels at 4 corners */}
      <Wheel x={7} y={16} w={12} h={26} spin={spin} />
      <Wheel x={81} y={16} w={12} h={26} spin={spin} />
      <Wheel x={7} y={78} w={12} h={26} spin={spin} />
      <Wheel x={81} y={78} w={12} h={26} spin={spin} />
      {/* body */}
      <Rect x={16} y={6} width={68} height={108} rx={22} fill={color} stroke={OUTLINE} strokeWidth={4} />
      {/* hood (front, top) */}
      <Rect x={24} y={12} width={52} height={26} rx={12} fill={darken(color, 0.82)} />
      {/* roof */}
      <Rect x={27} y={42} width={46} height={36} rx={13} fill={darken(color, 0.66)} stroke={OUTLINE} strokeWidth={2} />
      {/* windshield + rear window */}
      <Path d="M30 42 Q50 34 70 42 L66 40 Q50 33 34 40 Z" fill="#BFE4FF" />
      <Rect x={31} y={44} width={38} height={14} rx={6} fill="#9FD2F5" />
      <Rect x={31} y={62} width={38} height={14} rx={6} fill="#9FD2F5" />
      {/* headlights */}
      <Rect x={22} y={8} width={12} height={7} rx={3} fill="#FFF2B0" stroke={OUTLINE} strokeWidth={1.5} />
      <Rect x={66} y={8} width={12} height={7} rx={3} fill="#FFF2B0" stroke={OUTLINE} strokeWidth={1.5} />
      {/* taillights */}
      <Rect x={24} y={104} width={14} height={7} rx={3} fill="#FF5A5F" stroke={OUTLINE} strokeWidth={1.5} />
      <Rect x={62} y={104} width={14} height={7} rx={3} fill="#FF5A5F" stroke={OUTLINE} strokeWidth={1.5} />
    </Svg>
  );
}

function Truck({ size, color, spin = 0 }: { size: number; color: string; spin?: number }) {
  const w = size;
  const h = size * 1.7;
  return (
    <Svg width={w} height={h} viewBox="0 0 100 170">
      <Ellipse cx={50} cy={164} rx={44} ry={7} fill="rgba(0,0,0,0.16)" />
      <Wheel x={5} y={24} w={13} h={28} spin={spin} />
      <Wheel x={82} y={24} w={13} h={28} spin={spin} />
      <Wheel x={5} y={124} w={13} h={28} spin={spin} />
      <Wheel x={82} y={124} w={13} h={28} spin={spin} />
      {/* cab (front) */}
      <Rect x={14} y={6} width={72} height={40} rx={14} fill={darken(color, 0.75)} stroke={OUTLINE} strokeWidth={4} />
      <Rect x={24} y={12} width={52} height={16} rx={7} fill="#BFE4FF" />
      <Rect x={20} y={8} width={12} height={7} rx={3} fill="#FFF2B0" stroke={OUTLINE} strokeWidth={1.5} />
      <Rect x={68} y={8} width={12} height={7} rx={3} fill="#FFF2B0" stroke={OUTLINE} strokeWidth={1.5} />
      {/* cargo box */}
      <Rect x={12} y={48} width={76} height={110} rx={10} fill={color} stroke={OUTLINE} strokeWidth={4} />
      <Path d="M50 48 L50 158 M12 100 L88 100" stroke={darken(color, 0.6)} strokeWidth={4} />
      <Rect x={22} y={58} width={56} height={34} rx={6} fill={darken(color, 0.85)} />
      <Rect x={22} y={108} width={56} height={40} rx={6} fill={darken(color, 0.85)} />
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

// ---------- Badge (loading) ----------
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
      <G transform="translate(28, 22) scale(0.44)">
        <Wheel x={45} y={12} w={10} h={22} spin={spin} />
        <Wheel x={43} y={98} w={14} h={30} spin={spin} />
        <Rect x={39} y={36} width={22} height={70} rx={11} fill="#FF7A3D" stroke={OUTLINE} strokeWidth={3.5} />
        <Rect x={33} y={54} width={34} height={30} rx={14} fill="#2F9BE0" stroke={OUTLINE} strokeWidth={3.5} />
        <Circle cx={50} cy={48} r={14} fill="#F2F4F7" stroke={OUTLINE} strokeWidth={3.5} />
      </G>
    </Svg>
  );
}
