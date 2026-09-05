"use client";

import { PlayerAvatar } from "@/app/components/PlayerAvatar";
import type { LegacyCardData } from "@/lib/legacyCard";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = `${current} ${word}`.trim();
    if (candidate.length <= maxChars) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.join(" ").length < text.replace(/\s+/g, " ").trim().length && lines.length === maxLines) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[,;:.]?$/, "")}…`;
  }
  return lines;
}

function fitName(raw: string): { value: string; size: number } {
  const full = raw.trim().toUpperCase().replace(/\s+/g, " ") || "SANS NOM";
  const parts = full.split(" ");
  const abbreviated = full.length > 18 && parts.length > 1
    ? `${parts.slice(0, -1).map((part) => `${part[0]}.`).join("")} ${parts.at(-1)}`
    : full;
  const value = abbreviated.length > 20 ? `${abbreviated.slice(0, 19)}…` : abbreviated;
  return { value, size: Math.max(39, Math.min(63, Math.floor(650 / value.length))) };
}

function fitLine(raw: string, max = 31): string {
  const clean = raw.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

type Props = { data: LegacyCardData; id?: string };

/** Carte sociale 4:5, pensée comme un objet de collection premium. */
export function LegacyCard({ data, id = "legacy-card" }: Props) {
  const name = fitName(data.name);
  const lastClub = data.lastClub ? fitLine(data.lastClub, 28) : "Libre";
  const quote = wrap(data.quote, 48, 2);
  const honours = data.honours.length > 0 ? data.honours.slice(0, 3).map((honour) => fitLine(honour)) : ["Aucun trophée majeur"];
  const stats: Array<[number, string]> = data.position === "Gardien"
    ? [[data.matches, "MATCHS"], [data.cleanSheets, "CLEAN SHEETS"], [data.caps, "SÉLECTIONS"], [data.seasons, "SAISONS"]]
    : [[data.matches, "MATCHS"], [data.goals, "BUTS"], [data.assists, "PASSES D."], [data.caps, "SÉLECTIONS"]];

  return (
    <svg id={id} viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`} xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "auto", display: "block", borderRadius: 22 }}>
      <defs>
        <linearGradient id="legacy-bg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#0d4f40" /><stop offset=".42" stopColor="#061f1d" /><stop offset="1" stopColor="#030d11" /></linearGradient>
        <linearGradient id="legacy-panel" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#102c2a" /><stop offset="1" stopColor="#071719" /></linearGradient>
        <linearGradient id="legacy-gold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff0b1" /><stop offset=".42" stopColor="#e5bd53" /><stop offset="1" stopColor="#a66f12" /></linearGradient>
        <radialGradient id="legacy-light" cx="30%" cy="12%" r="72%"><stop stopColor="#2fb881" stopOpacity=".4" /><stop offset="1" stopColor="#2fb881" stopOpacity="0" /></radialGradient>
        <filter id="legacy-shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="18" stdDeviation="22" floodColor="#000" floodOpacity=".52" /></filter>
        <pattern id="legacy-grid" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M46 0H0v46" fill="none" stroke="#fff" strokeOpacity=".025" /></pattern>
      </defs>

      <rect width="1080" height="1350" fill="url(#legacy-bg)" />
      <rect width="1080" height="1350" fill="url(#legacy-light)" />
      <rect width="1080" height="1350" fill="url(#legacy-grid)" />
      <path d="M-80 350 1160 10M-80 1300l1240-340" fill="none" stroke="#efcc69" strokeOpacity=".1" strokeWidth="170" />
      <path d="M540 1350V1040M90 1280h900M245 1280c0-128 590-128 590 0" fill="none" stroke="#fff" strokeOpacity=".045" strokeWidth="3" />
      <ellipse cx="540" cy="1270" rx="500" ry="220" fill="none" stroke="#fff" strokeOpacity=".035" strokeWidth="70" />

      <g filter="url(#legacy-shadow)">
        <rect x="42" y="38" width="996" height="1274" rx="46" fill="url(#legacy-panel)" stroke="#d9ae45" strokeOpacity=".55" strokeWidth="2" />
      </g>
      <path d="M87 39h350L365 54H87c-18 0-32 13-32 31v1040" fill="none" stroke="#fff2b5" strokeOpacity=".85" strokeWidth="4" />
      <path d="M993 1311H700l70-15h223c17 0 31-13 31-30V230" fill="none" stroke="#9a6918" strokeOpacity=".7" strokeWidth="4" />

      <g transform="translate(76 73)">
        <rect width="48" height="48" rx="13" fill="url(#legacy-gold)" />
        <text x="24" y="36" textAnchor="middle" fill="#09241f" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="34">A</text>
        <text x="68" y="23" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="25" letterSpacing="7">ASCENSION</text>
        <text x="69" y="47" fill="#72ad98" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="11" letterSpacing="4">SÉRIE LÉGENDE</text>
      </g>
      <text x="998" y="96" textAnchor="end" fill="#6f9a8c" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="14" letterSpacing="3">CARRIÈRE TERMINÉE</text>
      <text x="998" y="119" textAnchor="end" fill="#d9b657" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="15">#{String(data.number).padStart(2, "0")}</text>

      <rect x="76" y="153" width="306" height="342" rx="34" fill="#071817" stroke="#fff" strokeOpacity=".1" />
      <PlayerAvatar seed={data.seed || data.name} x="86" y="163" width="286" height="322" />
      <path d="M98 475h262" stroke="url(#legacy-gold)" strokeWidth="5" strokeLinecap="round" />

      <text x="418" y="187" fill="#d9b657" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="15" letterSpacing="4">CARTE DE LÉGENDE</text>
      <text x="418" y="257" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize={name.size}>{name.value}</text>
      <text x="418" y="302" fill="#83a398" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="21">{data.position.toUpperCase()} · {data.nationality?.replace(/^[^\p{L}\p{N}]+/u, "") || data.origin.toUpperCase()}</text>
      {data.nickname ? <text x="418" y="343" fill="#e3c46e" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="25">« {fitLine(data.nickname, 23)} »</text> : null}

      <rect x="836" y="162" width="162" height="170" rx="32" fill="url(#legacy-gold)" />
      <path d="M853 182h128v130H853Z" fill="none" stroke="#fff" strokeOpacity=".35" />
      <text x="917" y="207" textAnchor="middle" fill="#4e3b10" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="14" letterSpacing="3">GÉN.</text>
      <text x="917" y="287" textAnchor="middle" fill="#09241f" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="78">{data.note}</text>
      <text x="917" y="313" textAnchor="middle" fill="#4e3b10" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="12">SUR 100</text>

      <rect x="418" y="377" width="580" height="118" rx="23" fill="#fff" fillOpacity=".045" stroke="#fff" strokeOpacity=".08" />
      <text x="447" y="409" fill="#6f9a8c" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="12" letterSpacing="3">DERNIER CLUB</text>
      <text x="447" y="452" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="27">{lastClub.toUpperCase()}</text>
      <text x="970" y="450" textAnchor="end" fill="#d9b657" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="19">{data.seasons} SAISONS</text>

      <text x="76" y="552" fill="#739c8f" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="13" letterSpacing="4">CHIFFRES DE CARRIÈRE</text>
      {stats.map(([value, label], index) => {
        const x = 76 + index * 236;
        return <g key={label} transform={`translate(${x}, 574)`}>
          <rect width="218" height="132" rx="22" fill="#fff" fillOpacity=".042" stroke="#fff" strokeOpacity=".075" />
          <text x="20" y="72" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="48">{value}</text>
          <text x="20" y="103" fill="#74a18f" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="12" letterSpacing="2">{label}</text>
          <rect x="20" y="116" width="78" height="3" rx="2" fill="url(#legacy-gold)" />
        </g>;
      })}

      <rect x="76" y="742" width="928" height="224" rx="30" fill="#fff" fillOpacity=".04" stroke="#fff" strokeOpacity=".08" />
      <text x="107" y="787" fill="#d9b657" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="14" letterSpacing="4">PALMARÈS</text>
      {honours.map((honour, index) => <g key={`${honour}-${index}`} transform={`translate(108, ${839 + index * 48})`}>
        <circle cx="13" cy="-8" r="13" fill="url(#legacy-gold)" />
        <path d="m8-8 3 3 7-8" fill="none" stroke="#183229" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        <text x="43" fill="#eef7f3" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="23">{honour}</text>
      </g>)}
      <text x="965" y="787" textAnchor="end" fill="#648a7d" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="12">TOP 3</text>

      <text x="76" y="1027" fill="#709789" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="13" letterSpacing="4">RANG DE LÉGENDE</text>
      <text x="76" y="1102" fill="url(#legacy-gold)" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="68">{data.tier.toUpperCase()}</text>
      <path d="M77 1128h927" stroke="#fff" strokeOpacity=".09" />
      {quote.map((line, index) => <text key={`${line}-${index}`} x="76" y={1172 + index * 34} fill="#a9c0b8" fontFamily="Georgia, serif" fontStyle="italic" fontSize="24">{index === 0 ? `« ${line}` : line}{index === quote.length - 1 ? " »" : ""}</text>)}

      <rect x="76" y="1239" width="928" height="52" rx="16" fill="url(#legacy-gold)" />
      <text x="100" y="1273" fill="#09241f" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="19">J’AI OBTENU {data.note}/100. TU PEUX FAIRE MIEUX ?</text>
      <text x="978" y="1273" textAnchor="end" fill="#17382d" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="14" letterSpacing="2">#ASCENSION</text>
    </svg>
  );
}
