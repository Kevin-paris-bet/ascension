"use client";

import type { SVGProps } from "react";

type Palette = {
  skin: string;
  skinLight: string;
  shadow: string;
  hair: string;
  shirt: string;
  shirtDark: string;
  accent: string;
};

const PALETTES: Palette[] = [
  { skin: "#8f573c", skinLight: "#b97955", shadow: "#5a3024", hair: "#151513", shirt: "#0a8a5c", shirtDark: "#034f3d", accent: "#efd16d" },
  { skin: "#bd7953", skinLight: "#dfa17a", shadow: "#7f4937", hair: "#2c2019", shirt: "#1b66b1", shirtDark: "#123b70", accent: "#f2d277" },
  { skin: "#e0a87e", skinLight: "#f0c6a4", shadow: "#a86d52", hair: "#5a321f", shirt: "#9c2445", shirtDark: "#57152b", accent: "#f3d67d" },
  { skin: "#70432f", skinLight: "#996247", shadow: "#48271e", hair: "#100f0d", shirt: "#664eb5", shirtDark: "#34286d", accent: "#eccb69" },
  { skin: "#f0c4a0", skinLight: "#ffe0c2", shadow: "#bd8463", hair: "#a7612c", shirt: "#0d847b", shirtDark: "#064d51", accent: "#f4d678" },
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
  const hairStyle = hash % 4;
  const id = `pa-${hash.toString(36)}`;

  return (
    <svg viewBox="0 0 180 200" role="img" aria-label="Portrait 3D stylisé du joueur" {...props}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#12352f" />
          <stop offset=".56" stopColor="#0b7560" />
          <stop offset="1" stopColor="#05251f" />
        </linearGradient>
        <linearGradient id={`${id}-skin`} x1=".18" y1=".08" x2=".82" y2=".92">
          <stop stopColor={palette.skinLight} />
          <stop offset=".48" stopColor={palette.skin} />
          <stop offset="1" stopColor={palette.shadow} />
        </linearGradient>
        <linearGradient id={`${id}-shirt`} x1=".16" y1="0" x2=".84" y2="1">
          <stop stopColor={palette.shirt} />
          <stop offset="1" stopColor={palette.shirtDark} />
        </linearGradient>
        <radialGradient id={`${id}-light`} cx="50%" cy="24%" r="64%">
          <stop stopColor="#ffffff" stopOpacity=".36" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-shadow`} x="-35%" y="-35%" width="170%" height="190%">
          <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#001a14" floodOpacity=".48" />
        </filter>
        <clipPath id={`${id}-frame`}><rect width="180" height="200" rx="31" /></clipPath>
      </defs>

      <g clipPath={`url(#${id}-frame)`}>
        <rect width="180" height="200" fill={`url(#${id}-bg)`} />
        <circle cx="91" cy="77" r="70" fill={`url(#${id}-light)`} />
        <path d="M-12 73h204M-12 108h204M90-8v213" fill="none" stroke="#fff" strokeOpacity=".06" />
        <path d="M7 163c25-13 50-19 83-19 34 0 62 7 84 21" fill="none" stroke={palette.accent} strokeOpacity=".2" strokeWidth="2" />

        <g filter={`url(#${id}-shadow)`}>
          <path d="M8 207c4-35 19-54 48-65l34 20 34-20c29 11 44 30 48 65H8Z" fill={`url(#${id}-shirt)`} />
          <path d="m56 142 34 20-17 22-31-35 14-7Zm68 0-34 20 17 22 31-35-14-7Z" fill="#fff" fillOpacity=".86" />
          <path d="m72 147 18 15 18-15-5-28H77l-5 28Z" fill={`url(#${id}-skin)`} />

          <ellipse cx="47" cy="86" rx="10" ry="17" fill={palette.shadow} />
          <ellipse cx="133" cy="86" rx="10" ry="17" fill={palette.skin} />
          <path d="M48 57c4-28 20-42 42-42 24 0 40 15 43 43l-2 50c-5 28-20 43-41 43-22 0-37-16-41-44l-1-50Z" fill={`url(#${id}-skin)`} />
          <path d="M50 91c7 35 19 54 40 57-22 0-37-16-41-41l-1-27 2 11Z" fill={palette.shadow} fillOpacity=".38" />
          <path d="M91 44c9 13 15 30 16 49 1 25-7 43-17 55 22 0 37-17 41-40l2-50c-2-19-11-33-25-39L91 44Z" fill="#fff" fillOpacity=".07" />

          {hairStyle === 0 && <path d="M47 63c0-33 18-52 44-52 27 0 45 18 43 53-13-11-29-17-47-16-15 0-28 6-40 15Z" fill={palette.hair} />}
          {hairStyle === 1 && <path d="M47 65c1-31 15-49 43-52 29 1 43 20 44 51-12-8-25-13-42-13-18 0-32 5-45 14Zm8-23C63 22 76 11 95 10c11 0 21 4 28 12-20-2-41 5-68 20Z" fill={palette.hair} />}
          {hairStyle === 2 && <><path d="M47 67c-1-35 17-54 44-54 29 0 44 19 43 54-12-12-28-18-46-18-16 0-29 6-41 18Z" fill={palette.hair} /><path d="M51 31c5-17 12-25 23-25 4 0 8 1 12 4 5-7 12-10 19-8 8 2 13 8 15 17 8 2 13 9 14 21-21-9-60-9-83-9Z" fill={palette.hair} /></>}
          {hairStyle === 3 && <><path d="M48 58c4-31 21-47 44-47 25 0 41 17 42 50-13-10-27-15-44-15-16 0-30 4-42 12Z" fill={palette.hair} /><path d="M48 60c3-18 6-31 11-40M132 62c-3-20-6-34-12-44" stroke={palette.skinLight} strokeOpacity=".22" strokeWidth="3" /></>}

          <ellipse cx="82" cy="68" rx="24" ry="38" fill="#fff" fillOpacity=".045" transform="rotate(10 82 68)" />
          <path d="M91 48c8 22 9 44 3 66-2 7-8 12-17 14" fill="none" stroke={palette.shadow} strokeOpacity=".12" strokeLinecap="round" strokeWidth="4" />
          <path d="M59 121c19 14 43 17 63 2" fill="none" stroke="#fff" strokeOpacity=".045" strokeLinecap="round" strokeWidth="4" />

          <path d="M33 171c20 7 35 17 44 30M147 171c-20 7-35 17-44 30" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="2" />
          <path d="M90 163v37" stroke={palette.accent} strokeOpacity=".8" strokeWidth="4" />
          <path d="M90 174c-6 0-11 5-11 11v8h22v-8c0-6-5-11-11-11Z" fill="none" stroke={palette.accent} strokeWidth="2" />
          <path d="m90 178 2 5 6 1-4 4 1 6-5-3-5 3 1-6-4-4 6-1 2-5Z" fill={palette.accent} />
        </g>
        <rect x="1" y="1" width="178" height="198" rx="30" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="2" />
      </g>
    </svg>
  );
}
