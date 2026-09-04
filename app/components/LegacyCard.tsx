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
  const abbreviated = full.length > 16 && parts.length > 1
    ? `${parts.slice(0, -1).map((part) => `${part[0]}.`).join("")} ${parts.at(-1)}`
    : full;
  const value = abbreviated.length > 18 ? `${abbreviated.slice(0, 17)}…` : abbreviated;
  return { value, size: Math.max(40, Math.min(62, Math.floor(610 / value.length))) };
}

type Props = { data: LegacyCardData; id?: string };

/** Carte sociale 4:5 : lisible dans un feed et exportable sans police externe. */
export function LegacyCard({ data, id = "legacy-card" }: Props) {
  const name = fitName(data.name);
  const lastClub = data.lastClub && data.lastClub.length > 18 ? `${data.lastClub.slice(0, 17)}…` : data.lastClub;
  const quote = wrap(data.quote, 52, 3);
  const honours = data.honours.length > 0 ? data.honours.slice(0, 3) : ["AUCUN TROPHÉE MAJEUR"];
  const stats: Array<[number, string]> = data.position === "Gardien"
    ? [[data.matches, "MATCHS"], [data.cleanSheets, "CLEAN SHEETS"], [data.caps, "SÉLECTIONS"], [data.seasons, "SAISONS"]]
    : [[data.matches, "MATCHS"], [data.goals, "BUTS"], [data.assists, "PASSES D."], [data.caps, "SÉLECTIONS"]];

  return (
    <svg id={id} viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`} xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "auto", display: "block", borderRadius: 22 }}>
      <defs>
        <linearGradient id="social-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#07583f" /><stop offset="1" stopColor="#0b8a5a" /></linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6dc8b" /><stop offset="1" stopColor="#c99a28" /></linearGradient>
      </defs>
      <rect width="1080" height="1350" fill="url(#social-bg)" />
      <path d="M0 300 1080 0v190L0 495Z" fill="#0b694a" opacity=".7" />
      <path d="M0 1110 1080 805v210L0 1320Z" fill="#064a36" opacity=".55" />
      <circle cx="950" cy="245" r="250" fill="none" stroke="#ffffff" strokeOpacity=".06" strokeWidth="70" />

      <text x="62" y="70" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="30" letterSpacing="8">ASCENSION</text>
      <text x="1018" y="70" textAnchor="end" fill="#b8ddcd" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="21" letterSpacing="3">CARTE DE LÉGENDE</text>

      <rect x="50" y="105" width="980" height="1090" rx="44" fill="#fbfaf4" />
      <PlayerAvatar seed={data.seed || data.name} x="84" y="150" width="220" height="244" />
      <text x="335" y="205" fill="#66736d" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="24" letterSpacing="3">FIN DE CARRIÈRE</text>
      <text x="335" y="278" fill="#17382d" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize={name.size}>{name.value}</text>
      <text x="335" y="328" fill="#6d7973" fontFamily="Arial, Helvetica, sans-serif" fontSize="26">#{data.number}  ·  {data.position}{data.nationality ? `  ·  ${data.nationality}` : ""}</text>
      {lastClub ? <text x="335" y="362" fill="#8a948f" fontFamily="Arial, Helvetica, sans-serif" fontSize="21">Dernier club · {lastClub}</text> : null}
      {data.nickname ? <text x="335" y="397" fill="#8d6a12" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="27">« {data.nickname} »</text> : null}

      <rect x="842" y="154" width="140" height="140" rx="30" fill="url(#gold)" />
      <text x="912" y="195" textAnchor="middle" fill="#604810" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="18" letterSpacing="2">NOTE</text>
      <text x="912" y="263" textAnchor="middle" fill="#17382d" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="70">{data.note}</text>

      <line x1="90" y1="430" x2="990" y2="430" stroke="#d9ddd8" strokeWidth="2" />
      <text x="90" y="485" fill="#17382d" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="27" letterSpacing="2">STATISTIQUES</text>
      {stats.map(([value, label], index) => {
        const x = 90 + index * 225;
        return <g key={label} transform={`translate(${x}, 535)`}><text fill="#17382d" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="51">{value}</text><text y="36" fill="#7a857f" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="17" letterSpacing="1">{label}</text></g>;
      })}

      <rect x="80" y="630" width="920" height="190" rx="26" fill="#eef3ef" />
      <text x="110" y="680" fill="#607069" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="18" letterSpacing="3">PALMARÈS</text>
      {honours.map((honour, index) => <g key={honour} transform={`translate(110, ${728 + index * 39})`}><circle cx="7" cy="-7" r="7" fill="#c99a28" /><text x="28" fill="#17382d" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="24">{honour}</text></g>)}

      <text x="90" y="890" fill="#6b7771" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="18" letterSpacing="3">RANG DE LÉGENDE</text>
      <text x="90" y="975" fill="#0a7a52" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="74">{data.tier.toUpperCase()}</text>
      <text x="990" y="970" textAnchor="end" fill="#d0a434" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="40">{data.seasons} SAISONS</text>
      <line x1="90" y1="1010" x2="990" y2="1010" stroke="#d9ddd8" strokeWidth="2" />
      {quote.map((line, index) => <text key={line} x="90" y={1060 + index * 36} fill="#606b66" fontFamily="Georgia, serif" fontStyle="italic" fontSize="26">{index === 0 ? `« ${line}` : line}{index === quote.length - 1 ? " »" : ""}</text>)}

      <rect x="50" y="1225" width="980" height="82" rx="27" fill="#083e2f" />
      <text x="90" y="1277" fill="#ffffff" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="27">J’AI OBTENU {data.note}/100. TU PEUX FAIRE MIEUX ?</text>
      <text x="990" y="1277" textAnchor="end" fill="#f1cf69" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="18" letterSpacing="2">#ASCENSION</text>
    </svg>
  );
}
