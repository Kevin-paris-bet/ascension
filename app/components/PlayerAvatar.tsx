"use client";

import type { SVGProps } from "react";

type Palette = { skin: string; shadow: string; hair: string; shirt: string; accent: string };

const PALETTES: Palette[] = [
  { skin: "#8f573c", shadow: "#70402d", hair: "#171713", shirt: "#0b7a53", accent: "#d8ad3d" },
  { skin: "#bd7953", shadow: "#985d42", hair: "#302116", shirt: "#176bb8", accent: "#e8c452" },
  { skin: "#e0a87e", shadow: "#c48764", hair: "#6a3c20", shirt: "#8b2340", accent: "#f0cf65" },
  { skin: "#70432f", shadow: "#573223", hair: "#12100e", shirt: "#6448ac", accent: "#dfbb4d" },
  { skin: "#f0c4a0", shadow: "#dca27a", hair: "#bc7a32", shirt: "#117d74", accent: "#edca62" },
];

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function PlayerAvatar({ seed, ...props }: { seed: string } & SVGProps<SVGSVGElement>) {
  const hash = hashText(seed || "ascension");
  const palette = PALETTES[hash % PALETTES.length];
  const hairStyle = hash % 3;

  return (
    <svg viewBox="0 0 180 200" role="img" aria-label="Portrait illustré du joueur" {...props}>
      <circle cx="90" cy="96" r="86" fill="#e5efe8" />
      <path d="M18 200c7-42 31-66 72-66s65 24 72 66H18Z" fill={palette.shirt} />
      <path d="M65 133h50v39c-12 12-38 12-50 0v-39Z" fill={palette.shadow} />
      <ellipse cx="44" cy="91" rx="13" ry="18" fill={palette.skin} />
      <ellipse cx="136" cy="91" rx="13" ry="18" fill={palette.skin} />
      <path d="M47 54c7-28 79-31 87 4v48c0 36-20 60-44 60s-43-24-43-60V54Z" fill={palette.skin} />
      {hairStyle === 0 && <path d="M45 67c2-38 25-51 50-51 30 0 44 18 42 55-12-14-24-22-47-22-18 0-31 6-45 18Z" fill={palette.hair} />}
      {hairStyle === 1 && <path d="M44 65c6-35 21-48 48-48 31 0 45 20 44 48-12-9-24-15-45-15-20 0-35 6-47 15Zm8-27 8-18 9 13 9-19 10 17 12-19 7 22 16-12-3 27Z" fill={palette.hair} />}
      {hairStyle === 2 && <><path d="M45 69c-1-37 20-54 48-54 31 0 45 19 43 56-13-15-28-22-47-22-17 0-30 7-44 20Z" fill={palette.hair} /><circle cx="53" cy="31" r="10" fill={palette.hair} /><circle cx="73" cy="23" r="12" fill={palette.hair} /><circle cx="96" cy="22" r="13" fill={palette.hair} /><circle cx="119" cy="31" r="12" fill={palette.hair} /></>}
      <path d="M65 88c7-4 14-4 21 0M99 88c7-4 14-4 21 0" fill="none" stroke={palette.shadow} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="76" cy="96" rx="4" ry="5" fill="#17221e" /><ellipse cx="109" cy="96" rx="4" ry="5" fill="#17221e" />
      <path d="M91 99c-3 10-4 15 3 17M78 128c8 6 19 7 28 0" fill="none" stroke={palette.shadow} strokeWidth="3" strokeLinecap="round" />
      <path d="M66 172c13 9 35 9 48 0" fill="none" stroke={palette.accent} strokeWidth="5" />
    </svg>
  );
}
