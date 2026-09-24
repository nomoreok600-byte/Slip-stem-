import React from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import type { Family } from "@/src/game/types";
import { useTheme } from "@/src/theme";

const OUTLINE = "#3A2E1E";

function darken(hex: string, f = 0.75): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.slice(0, 2), 16) * f);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * f);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * f);
  return `rgb(${r},${g},${b})`;
}

// ---------- Player motorcycle (rear 3/4 view) ----------
export function PlayerBike({ size, boosting }: { size: number; boosting?: boolean }) {
  const { colors } = useTheme();
  const w = size;
  const h = size * 1.5;
  const body = boosting ? colors.neonGold : colors.brake;
  return (
    <Svg width={w} height={h} viewBox="0 0 100 150">
      <Ellipse cx="50" cy="140" rx="34" ry="8" fill="rgba(0,0,0,0.18)" />
      {/* rear wheel */}
      <Rect x="34" y="92" width="32" height="46" rx="14" fill="#2B2B2B" stroke={OUTLINE} strokeWidth="3" />
      <Rect x="42" y="104" width="16" height="22" rx="7" fill="#555" />
      {/* exhausts */}
      <Rect x="20" y="96" width="16" height="10" rx="5" fill="#C9CDD3" stroke={OUTLINE} strokeWidth="3" />
      <Rect x="64" y="96" width="16" height="10" rx="5" fill="#C9CDD3" stroke={OUTLINE} strokeWidth="3" />
      {/* body / tail */}
      <Path
        d="M30 96 Q28 60 50 52 Q72 60 70 96 Z"
        fill={body}
        stroke={OUTLINE}
        strokeWidth="3.5"
      />
      <Path d="M40 70 Q50 64 60 70 L58 90 Q50 86 42 90 Z" fill={darken(body, 0.82)} />
      {/* taillight */}
      <Rect x="44" y="92" width="12" height="6" rx="3" fill={colors.error} stroke={OUTLINE} strokeWidth="2" />
      {/* rider back */}
      <Rect x="36" y="40" width="28" height="34" rx="12" fill={colors.engine} stroke={OUTLINE} strokeWidth="3.5" />
      {/* backpack stripe */}
      <Rect x="45" y="46" width="10" height="24" rx="5" fill={darken(colors.engine, 0.8)} />
      {/* helmet */}
      <Circle cx="50" cy="30" r="17" fill="#F2F4F7" stroke={OUTLINE} strokeWidth="3.5" />
      <Path d="M40 30 Q50 22 60 30 L58 36 Q50 32 42 36 Z" fill="#2F9BE0" />
      {/* mirrors */}
      <Circle cx="30" cy="58" r="5" fill="#F2F4F7" stroke={OUTLINE} strokeWidth="2.5" />
      <Circle cx="70" cy="58" r="5" fill="#F2F4F7" stroke={OUTLINE} strokeWidth="2.5" />
    </Svg>
  );
}

// ---------- Traffic car (rear view) ----------
export function Car({ size, color, truck }: { size: number; color: string; truck?: boolean }) {
  if (truck) return <Truck size={size} color={color} />;
  const w = size;
  const h = size * 1.25;
  return (
    <Svg width={w} height={h} viewBox="0 0 100 125">
      <Ellipse cx="50" cy="118" rx="40" ry="7" fill="rgba(0,0,0,0.16)" />
      {/* wheels */}
      <Rect x="6" y="40" width="14" height="60" rx="7" fill="#2B2B2B" stroke={OUTLINE} strokeWidth="3" />
      <Rect x="80" y="40" width="14" height="60" rx="7" fill="#2B2B2B" stroke={OUTLINE} strokeWidth="3" />
      {/* body */}
      <Rect x="14" y="16" width="72" height="98" rx="20" fill={color} stroke={OUTLINE} strokeWidth="4" />
      {/* roof / rear window */}
      <Rect x="24" y="24" width="52" height="30" rx="12" fill={darken(color, 0.7)} />
      <Rect x="28" y="30" width="44" height="18" rx="9" fill="#BFE4FF" />
      {/* taillights */}
      <Rect x="20" y="92" width="18" height="12" rx="5" fill="#FF5A5F" stroke={OUTLINE} strokeWidth="2.5" />
      <Rect x="62" y="92" width="18" height="12" rx="5" fill="#FF5A5F" stroke={OUTLINE} strokeWidth="2.5" />
      {/* bumper */}
      <Rect x="22" y="106" width="56" height="8" rx="4" fill={darken(color, 0.6)} />
    </Svg>
  );
}

function Truck({ size, color }: { size: number; color: string }) {
  const w = size;
  const h = size * 1.75;
  return (
    <Svg width={w} height={h} viewBox="0 0 100 175">
      <Ellipse cx="50" cy="168" rx="42" ry="8" fill="rgba(0,0,0,0.16)" />
      <Rect x="4" y="60" width="14" height="70" rx="7" fill="#2B2B2B" stroke={OUTLINE} strokeWidth="3" />
      <Rect x="82" y="60" width="14" height="70" rx="7" fill="#2B2B2B" stroke={OUTLINE} strokeWidth="3" />
      {/* cargo box */}
      <Rect x="12" y="10" width="76" height="120" rx="12" fill={color} stroke={OUTLINE} strokeWidth="4" />
      <Rect x="22" y="24" width="56" height="44" rx="8" fill={darken(color, 0.8)} />
      <Path d="M50 24 L50 68 M22 46 L78 46" stroke={darken(color, 0.55)} strokeWidth="4" />
      {/* rear doors handle */}
      <Rect x="46" y="80" width="8" height="40" rx="4" fill={darken(color, 0.55)} />
      {/* taillights */}
      <Rect x="18" y="118" width="16" height="10" rx="4" fill="#FFC02E" stroke={OUTLINE} strokeWidth="2.5" />
      <Rect x="66" y="118" width="16" height="10" rx="4" fill="#FFC02E" stroke={OUTLINE} strokeWidth="2.5" />
    </Svg>
  );
}

// ---------- Coin ----------
export function CoinIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="17" fill="#FFB800" stroke={OUTLINE} strokeWidth="3" />
      <Circle cx="20" cy="20" r="11" fill="#FFD84D" stroke="#E5A000" strokeWidth="2" />
      <Path d="M16 14 L24 14 M20 14 L20 26 M16 26 L24 26" stroke="#B87400" strokeWidth="3" strokeLinecap="round" />
      <Circle cx="14" cy="13" r="2.5" fill="rgba(255,255,255,0.8)" />
    </Svg>
  );
}

// ---------- Loot crate ----------
export function CrateIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x="6" y="16" width="36" height="26" rx="5" fill="#C98A3D" stroke={OUTLINE} strokeWidth="3" />
      <Rect x="6" y="12" width="36" height="10" rx="4" fill="#E0A85A" stroke={OUTLINE} strokeWidth="3" />
      <Rect x="19" y="12" width="10" height="30" fill="#8A5A22" opacity="0.5" />
      <Rect x="6" y="24" width="36" height="5" fill="#8A5A22" opacity="0.5" />
      <Path d="M20 20 L24 24 L28 20" stroke="#FFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// ---------- Part family cartoon icons ----------
export function PartIcon({ family, size }: { family: Family; size: number }) {
  if (family === "engine") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Circle cx="24" cy="24" r="15" fill="#FF7A3D" stroke={OUTLINE} strokeWidth="3" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <Rect
              key={a}
              x={24 + Math.cos(r) * 15 - 2.5}
              y={24 + Math.sin(r) * 15 - 2.5}
              width="5"
              height="5"
              rx="1.5"
              fill="#FF7A3D"
              stroke={OUTLINE}
              strokeWidth="2"
            />
          );
        })}
        <Circle cx="24" cy="24" r="6" fill="#FFD1B0" stroke={OUTLINE} strokeWidth="2.5" />
      </Svg>
    );
  }
  if (family === "brake") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Circle cx="24" cy="24" r="16" fill="#2F9BE0" stroke={OUTLINE} strokeWidth="3" />
        <Circle cx="24" cy="24" r="6" fill="#DDF1FF" stroke={OUTLINE} strokeWidth="2.5" />
        {Array.from({ length: 10 }).map((_, i) => {
          const r = (i * 36 * Math.PI) / 180;
          return (
            <Circle key={i} cx={24 + Math.cos(r) * 11} cy={24 + Math.sin(r) * 11} r="1.6" fill="#DDF1FF" />
          );
        })}
      </Svg>
    );
  }
  // aero -> spoiler / wing
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x="8" y="12" width="6" height="20" rx="3" fill="#B06BFF" stroke={OUTLINE} strokeWidth="2.5" />
      <Rect x="34" y="12" width="6" height="20" rx="3" fill="#B06BFF" stroke={OUTLINE} strokeWidth="2.5" />
      <Path d="M6 16 Q24 6 42 16 L42 24 Q24 16 6 24 Z" fill="#B06BFF" stroke={OUTLINE} strokeWidth="3" />
      <Path d="M12 33 L36 33" stroke="#B06BFF" strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}

// ---------- Decorative speed streaks ----------
export function BikeBadge({ size }: { size: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <SvgGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.brandPrimary} />
          <Stop offset="1" stopColor={colors.brandSecondary} />
        </SvgGradient>
      </Defs>
      <Circle cx="50" cy="50" r="46" fill="url(#bg)" stroke={OUTLINE} strokeWidth="5" />
      <G scale="0.55" x="22" y="16">
        <PlayerBikeInner />
      </G>
    </Svg>
  );
}

function PlayerBikeInner() {
  return (
    <>
      <Rect x="34" y="92" width="32" height="46" rx="14" fill="#2B2B2B" stroke={OUTLINE} strokeWidth="3" />
      <Path d="M30 96 Q28 60 50 52 Q72 60 70 96 Z" fill="#FF7A3D" stroke={OUTLINE} strokeWidth="3.5" />
      <Circle cx="50" cy="30" r="17" fill="#F2F4F7" stroke={OUTLINE} strokeWidth="3.5" />
      <Path d="M40 30 Q50 22 60 30 L58 36 Q50 32 42 36 Z" fill="#2F9BE0" />
    </>
  );
}
