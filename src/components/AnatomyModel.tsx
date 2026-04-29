"use client";
import type { Muscle } from "@/data/exercises";

interface Props {
  primary?: Muscle[];
  secondary?: Muscle[];
  view?: "front" | "back";
  size?: number;
}

export default function AnatomyModel({
  primary = [],
  secondary = [],
  view = "front",
  size = 200,
}: Props) {
  const isPrimary = (m: Muscle) => primary.includes(m);
  const isSecondary = (m: Muscle) => secondary.includes(m);
  const fill = (m: Muscle) =>
    isPrimary(m) ? "#171717" : isSecondary(m) ? "#737373" : "#f5f5f5";
  const stroke = "#262626";

  if (view === "front") {
    return (
      <svg width={size} height={size * 1.6} viewBox="0 0 200 320" fill="none">
        <ellipse cx="100" cy="28" rx="18" ry="22" fill="#fafafa" stroke={stroke} strokeWidth="1.2" />
        <path d="M90 48 L90 58 L110 58 L110 48 Z" fill="#fafafa" stroke={stroke} strokeWidth="1.2" />
        <path d="M75 60 Q100 55 125 60 L130 70 L100 72 L70 70 Z" fill={fill("traps")} stroke={stroke} strokeWidth="1.2" />
        <path d="M70 70 Q60 70 55 80 Q52 92 58 100 Q70 96 75 88 Z" fill={fill("frontDelt")} stroke={stroke} strokeWidth="1.2" />
        <path d="M130 70 Q140 70 145 80 Q148 92 142 100 Q130 96 125 88 Z" fill={fill("frontDelt")} stroke={stroke} strokeWidth="1.2" />
        <path d="M55 80 Q48 88 50 102 Q56 105 58 100 Q52 92 55 80 Z" fill={fill("sideDelt")} stroke={stroke} strokeWidth="1.2" />
        <path d="M145 80 Q152 88 150 102 Q144 105 142 100 Q148 92 145 80 Z" fill={fill("sideDelt")} stroke={stroke} strokeWidth="1.2" />
        <path d="M75 88 Q70 95 72 115 Q85 125 100 120 Q115 125 128 115 Q130 95 125 88 Q115 95 100 95 Q85 95 75 88 Z" fill={fill("chest")} stroke={stroke} strokeWidth="1.2" />
        <line x1="100" y1="95" x2="100" y2="120" stroke={stroke} strokeWidth="0.8" opacity="0.5" />
        <path d="M50 102 Q44 115 46 135 Q52 142 58 138 Q60 122 58 100 Z" fill={fill("biceps")} stroke={stroke} strokeWidth="1.2" />
        <path d="M150 102 Q156 115 154 135 Q148 142 142 138 Q140 122 142 100 Z" fill={fill("biceps")} stroke={stroke} strokeWidth="1.2" />
        <path d="M46 135 Q42 155 44 178 Q50 182 54 178 Q56 158 58 138 Z" fill={fill("forearm")} stroke={stroke} strokeWidth="1.2" />
        <path d="M154 135 Q158 155 156 178 Q150 182 146 178 Q144 158 142 138 Z" fill={fill("forearm")} stroke={stroke} strokeWidth="1.2" />
        <path d="M82 120 Q80 135 82 155 Q85 170 100 175 Q115 170 118 155 Q120 135 118 120 Q108 125 100 125 Q92 125 82 120 Z" fill={fill("abs")} stroke={stroke} strokeWidth="1.2" />
        <line x1="100" y1="120" x2="100" y2="175" stroke={stroke} strokeWidth="0.6" opacity="0.4" />
        <line x1="84" y1="138" x2="116" y2="138" stroke={stroke} strokeWidth="0.6" opacity="0.4" />
        <line x1="83" y1="155" x2="117" y2="155" stroke={stroke} strokeWidth="0.6" opacity="0.4" />
        <path d="M72 115 Q68 135 72 160 Q78 168 82 155 Q80 135 82 120 Q76 118 72 115 Z" fill={fill("obliques")} stroke={stroke} strokeWidth="1.2" />
        <path d="M128 115 Q132 135 128 160 Q122 168 118 155 Q120 135 118 120 Q124 118 128 115 Z" fill={fill("obliques")} stroke={stroke} strokeWidth="1.2" />
        <path d="M72 160 Q72 175 80 185 L120 185 Q128 175 128 160 Q115 172 100 172 Q85 172 72 160 Z" fill="#fafafa" stroke={stroke} strokeWidth="1.2" />
        <path d="M80 185 Q72 215 75 250 Q82 258 92 255 Q96 222 96 188 Z" fill={fill("quads")} stroke={stroke} strokeWidth="1.2" />
        <path d="M120 185 Q128 215 125 250 Q118 258 108 255 Q104 222 104 188 Z" fill={fill("quads")} stroke={stroke} strokeWidth="1.2" />
        <ellipse cx="84" cy="258" rx="10" ry="6" fill="#fafafa" stroke={stroke} strokeWidth="1.2" />
        <ellipse cx="116" cy="258" rx="10" ry="6" fill="#fafafa" stroke={stroke} strokeWidth="1.2" />
        <path d="M76 264 Q74 285 78 308 Q86 312 92 308 Q92 285 90 264 Z" fill={fill("calves")} stroke={stroke} strokeWidth="1.2" opacity="0.85" />
        <path d="M124 264 Q126 285 122 308 Q114 312 108 308 Q108 285 110 264 Z" fill={fill("calves")} stroke={stroke} strokeWidth="1.2" opacity="0.85" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 200 320" fill="none">
      <ellipse cx="100" cy="28" rx="18" ry="22" fill="#fafafa" stroke={stroke} strokeWidth="1.2" />
      <path d="M90 48 L90 58 L110 58 L110 48 Z" fill="#fafafa" stroke={stroke} strokeWidth="1.2" />
      <path d="M70 60 Q100 55 130 60 L140 75 L130 95 L100 100 L70 95 L60 75 Z" fill={fill("traps")} stroke={stroke} strokeWidth="1.2" />
      <path d="M60 75 Q50 78 50 95 Q56 105 65 100 Q68 88 70 80 Z" fill={fill("rearDelt")} stroke={stroke} strokeWidth="1.2" />
      <path d="M140 75 Q150 78 150 95 Q144 105 135 100 Q132 88 130 80 Z" fill={fill("rearDelt")} stroke={stroke} strokeWidth="1.2" />
      <path d="M70 95 Q72 110 80 120 L120 120 Q128 110 130 95 L100 100 Z" fill={fill("back")} stroke={stroke} strokeWidth="1.2" />
      <path d="M65 100 Q58 115 62 145 Q72 158 82 155 L82 120 Q72 110 70 95 Z" fill={fill("lats")} stroke={stroke} strokeWidth="1.2" />
      <path d="M135 100 Q142 115 138 145 Q128 158 118 155 L118 120 Q128 110 130 95 Z" fill={fill("lats")} stroke={stroke} strokeWidth="1.2" />
      <path d="M50 95 Q44 115 46 138 Q52 145 58 142 Q60 122 58 105 Q56 105 50 95 Z" fill={fill("triceps")} stroke={stroke} strokeWidth="1.2" />
      <path d="M150 95 Q156 115 154 138 Q148 145 142 142 Q140 122 142 105 Q144 105 150 95 Z" fill={fill("triceps")} stroke={stroke} strokeWidth="1.2" />
      <path d="M46 138 Q42 158 44 180 Q50 184 54 180 Q56 160 58 142 Z" fill={fill("forearm")} stroke={stroke} strokeWidth="1.2" />
      <path d="M154 138 Q158 158 156 180 Q150 184 146 180 Q144 160 142 142 Z" fill={fill("forearm")} stroke={stroke} strokeWidth="1.2" />
      <path d="M82 155 Q85 168 82 180 L118 180 Q115 168 118 155 Q108 158 100 158 Q92 158 82 155 Z" fill={fill("lowerBack")} stroke={stroke} strokeWidth="1.2" />
      <line x1="100" y1="100" x2="100" y2="180" stroke={stroke} strokeWidth="0.6" opacity="0.4" />
      <path d="M75 180 Q70 200 78 215 Q92 220 100 215 Q108 220 122 215 Q130 200 125 180 Z" fill={fill("glutes")} stroke={stroke} strokeWidth="1.2" />
      <line x1="100" y1="180" x2="100" y2="217" stroke={stroke} strokeWidth="0.6" opacity="0.4" />
      <path d="M78 215 Q72 235 76 258 Q84 262 92 258 Q94 235 92 215 Z" fill={fill("hamstrings")} stroke={stroke} strokeWidth="1.2" />
      <path d="M122 215 Q128 235 124 258 Q116 262 108 258 Q106 235 108 215 Z" fill={fill("hamstrings")} stroke={stroke} strokeWidth="1.2" />
      <ellipse cx="84" cy="263" rx="9" ry="5" fill="#fafafa" stroke={stroke} strokeWidth="1.2" />
      <ellipse cx="116" cy="263" rx="9" ry="5" fill="#fafafa" stroke={stroke} strokeWidth="1.2" />
      <path d="M76 268 Q72 285 76 305 Q84 312 92 308 Q94 285 92 268 Z" fill={fill("calves")} stroke={stroke} strokeWidth="1.2" />
      <path d="M124 268 Q128 285 124 305 Q116 312 108 308 Q106 285 108 268 Z" fill={fill("calves")} stroke={stroke} strokeWidth="1.2" />
    </svg>
  );
}
