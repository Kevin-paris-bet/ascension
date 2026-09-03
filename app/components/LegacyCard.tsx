"use client";

import type { LegacyCardData } from "@/lib/legacyCard";
import { getCardLabels } from "@/lib/legacyCard";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

/** Découpe un texte en lignes tenant dans une largeur donnée (approximation par caractères). */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxChars) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  const joined = lines.join(" ");
  if (joined.length < text.replace(/\s+/g, " ").trim().length && lines.length === maxLines) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[,;:.]?$/, "") + "…";
  }
  return lines;
}

const NAME_MAX_CHARS = 20;

function fitName(raw: string): string {
  const name = raw.trim().toUpperCase().replace(/\s+/g, " ");
  if (name.length <= NAME_MAX_CHARS) return name;

  const parts = name.split(" ");
  if (parts.length > 1) {
    const surname = parts[parts.length - 1];
    const initials = parts.slice(0, -1).map((p) => `${p[0]}.`).join("");
    const abbreviated = `${initials} ${surname}`;
    if (abbreviated.length <= NAME_MAX_CHARS) return abbreviated;
    return surname.length <= NAME_MAX_CHARS ? surname : `${surname.slice(0, NAME_MAX_CHARS - 1)}…`;
  }
  return `${name.slice(0, NAME_MAX_CHARS - 1)}…`;
}

type Props = { data: LegacyCardData; id?: string };

/**
 * La carte est le produit (section 11). Deux éléments sont non négociables :
 * le RANG DE LÉGENDE — les gens partagent un classement, pas des statistiques —
 * et la citation en bas, qui rend deux captures différentes à stats égales.
 */
export function LegacyCard({ data, id = "legacy-card" }: Props) {
  const labels = getCardLabels();
  const isKeeper = data.position === "Gardien";
  const quoteLines = wrap(data.quote, 40, 4);

  // Le nom doit tenir sur une ligne dans les 920 px disponibles. Plutôt que de
  // couper brutalement un nom long, on abrège les prénoms en initiales — c'est
  // la convention des feuilles de match, et ça reste lisible.
  const displayName = fitName(data.name);
  const nameFontSize = Math.min(104, Math.floor(920 / (displayName.length * 0.62)));

  // Un gardien affiche ses clean sheets ; les autres, buts et passes.
  const stats: Array<[number, string]> = isKeeper
    ? [
        [data.matches, labels.matches],
        [data.cleanSheets, labels.cleanSheets],
      ]
    : [
        [data.matches, labels.matches],
        [data.goals, labels.goals],
        [data.assists, labels.assists],
      ];

  return (
    <svg
      id={id}
      viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "auto", display: "block", borderRadius: 12 }}
    >
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#12121a" />
          <stop offset="55%" stopColor="#0b0b10" />
          <stop offset="100%" stopColor="#170d10" />
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e63946" />
          <stop offset="100%" stopColor="#f0a13a" />
        </linearGradient>
      </defs>

      <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#bg)" />
      <rect x="0" y="0" width={CARD_WIDTH} height="10" fill="url(#accent)" />

      {/* En-tête : identité */}
      <text x="80" y="200" fill="#6a6a78" fontSize="34" letterSpacing="10" fontFamily="Helvetica, Arial, sans-serif">
        ASCENSION
      </text>

      <text
        x="80"
        y="330"
        fill="#ffffff"
        fontSize={nameFontSize}
        fontWeight="700"
        fontFamily="Helvetica, Arial, sans-serif"
      >
        {displayName}
      </text>

      {data.nickname && (
        <text x="80" y="400" fill="#f0a13a" fontSize="44" fontStyle="italic" fontFamily="Georgia, serif">
          « {data.nickname} »
        </text>
      )}

      <text x="80" y={data.nickname ? 470 : 410} fill="#9a9aa8" fontSize="40" fontFamily="Helvetica, Arial, sans-serif">
        {data.position}
        {data.origin ? ` · ${data.origin}` : ""}
      </text>

      {/* Numéro de maillot — compte plus qu'on ne croit pour le partage (section 10.2).
          Placé en haut à droite, au-dessus du bloc nom, pour ne jamais le chevaucher. */}
      <text
        x={CARD_WIDTH - 80}
        y="215"
        fill="#3a3a48"
        fontSize="150"
        fontWeight="700"
        textAnchor="end"
        fontFamily="Helvetica, Arial, sans-serif"
      >
        {data.number}
      </text>

      <line x1="80" y1="560" x2={CARD_WIDTH - 80} y2="560" stroke="#26262f" strokeWidth="3" />

      {/* Saisons */}
      <text x="80" y="670" fill="#ffffff" fontSize="72" fontWeight="700" fontFamily="Helvetica, Arial, sans-serif">
        {data.seasons}
      </text>
      <text x="80" y="720" fill="#7a7a88" fontSize="36" fontFamily="Helvetica, Arial, sans-serif">
        {labels.seasons}
      </text>

      {/* Statistiques */}
      {stats.map(([value, label], i) => (
        <g key={label} transform={`translate(${80 + i * 320}, 860)`}>
          <text fill="#ffffff" fontSize="76" fontWeight="700" fontFamily="Helvetica, Arial, sans-serif">
            {value}
          </text>
          <text y="52" fill="#7a7a88" fontSize="34" fontFamily="Helvetica, Arial, sans-serif">
            {label}
          </text>
        </g>
      ))}

      {data.caps > 0 && (
        <text x="80" y="1010" fill="#9a9aa8" fontSize="38" fontFamily="Helvetica, Arial, sans-serif">
          {data.caps} {labels.caps}
        </text>
      )}

      {/* Palmarès */}
      {/* Puce dessinée en vectoriel plutôt qu'un caractère « ★ » : le glyphe
          n'est pas présent dans toutes les polices système et disparaîtrait
          silencieusement à la rastérisation. */}
      {data.honours.map((h, i) => (
        <g key={h} transform={`translate(0, ${1130 + i * 68})`}>
          <path d="M 92 -14 L 104 -2 L 92 10 L 80 -2 Z" fill="#f0c674" />
          <text x="126" y="0" fill="#f0c674" fontSize="42" letterSpacing="2" fontFamily="Helvetica, Arial, sans-serif">
            {h}
          </text>
        </g>
      ))}

      {/* RANG DE LÉGENDE — l'élément qui déclenche le partage */}
      <line x1="80" y1="1450" x2={CARD_WIDTH - 80} y2="1450" stroke="#26262f" strokeWidth="3" />
      <text x="80" y="1530" fill="#7a7a88" fontSize="34" letterSpacing="6" fontFamily="Helvetica, Arial, sans-serif">
        {labels.legacyRank}
      </text>
      <text x="80" y="1630" fill="#ffffff" fontSize="90" fontWeight="700" fontFamily="Helvetica, Arial, sans-serif">
        {data.tier.toUpperCase()}
      </text>
      <text
        x={CARD_WIDTH - 80}
        y="1630"
        fill="#e63946"
        fontSize="90"
        fontWeight="700"
        textAnchor="end"
        fontFamily="Helvetica, Arial, sans-serif"
      >
        {data.note}
      </text>
      <line x1="80" y1="1690" x2={CARD_WIDTH - 80} y2="1690" stroke="#26262f" strokeWidth="3" />

      {/* Citation — rend deux captures différentes à statistiques égales */}
      {quoteLines.map((line, i) => (
        <text
          key={i}
          x="80"
          y={1770 + i * 44}
          fill="#8a8a98"
          fontSize="36"
          fontStyle="italic"
          fontFamily="Georgia, serif"
        >
          {i === 0 ? `« ${line}` : line}
          {i === quoteLines.length - 1 ? " »" : ""}
        </text>
      ))}
    </svg>
  );
}
