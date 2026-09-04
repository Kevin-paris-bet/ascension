"use client";

import { PlayerAvatar } from "@/app/components/PlayerAvatar";
import type { CareerState } from "@/engine/state";
import type { CreationSelection } from "@/lib/engineBridge";

const POSITION_LABELS: Record<string, string> = {
  opt_gardien: "Gardien", opt_defenseur: "Défenseur", opt_milieu: "Milieu", opt_attaquant: "Attaquant",
};
const ORIGIN_LABELS: Record<string, string> = {
  opt_cite: "Banlieue", opt_village: "Campagne", opt_formation: "Formation", opt_etranger: "Étranger", opt_heritier: "Héritier",
};
const GIFT_LABELS: Record<string, string> = {
  opt_don_technique: "Technicien", opt_don_vitesse: "Explosif", opt_don_vista: "Visionnaire", opt_don_mental: "Mental d'acier",
};

function overall(state: CareerState | null): number | null {
  if (!state) return null;
  const stats = state.stats;
  const weighted = (stats.technique ?? 0) + (stats.physique ?? 0) + (stats.vista ?? 0) + (stats.mental ?? 0) + (stats.aura ?? 0) * 0.5;
  return Math.max(1, Math.min(99, Math.round(weighted / 4.5)));
}

export function PlayerDossier({ state, name, number, selection }: {
  state: CareerState | null;
  name: string;
  number: string;
  selection: CreationSelection;
}) {
  const score = overall(state);
  const position = POSITION_LABELS[selection.poste ?? ""] ?? "Poste à choisir";
  const origin = ORIGIN_LABELS[selection.origine ?? ""] ?? "Origine à choisir";
  const gift = GIFT_LABELS[selection.don ?? ""] ?? "Talent à révéler";
  const age = state?.age ?? 14;
  const progress = Math.max(2, Math.min(100, ((age - 14) / 25) * 100));
  const playerName = name.trim() || "Ton joueur";
  const stats = [
    ["Technique", state?.stats.technique], ["Physique", state?.stats.physique],
    ["Vista", state?.stats.vista], ["Mental", state?.stats.mental],
    ["Aura", state?.stats.aura], ["Vestiaire", state?.stats.vestiaire],
  ] as const;

  return (
    <aside className="player-dossier">
      <div className="dossier-head">
        <PlayerAvatar className="dossier-avatar" seed={state?.seed ?? playerName} />
        <div className="dossier-identity"><span className="dossier-kicker">DOSSIER JOUEUR</span><h2>{playerName}</h2><p>#{number || "10"} · {age} ans</p></div>
        <div className="rating-badge"><span>NOTE</span><strong>{score ?? "—"}</strong></div>
      </div>
      <div className="dossier-tags"><span>{position}</span><span>{origin}</span></div>
      <div className="club-line"><span>{state?.org ?? (state ? "Club actuel confidentiel" : "En attente du premier contrat")}</span><strong>{state ? `Saison ${Math.max(1, state.season + 1)}` : "U15"}</strong></div>
      <div className="career-progress" aria-label={`Progression de carrière ${Math.round(progress)} %`}><span style={{ width: `${progress}%` }} /></div>
      <p className="dossier-section-title">Attributs</p>
      <div className="dossier-stats">{stats.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value ?? "—"}</strong></div>)}</div>
      <div className="talent-chip">✦ {gift}</div>
      <div className="dossier-foot"><span>{state?.history.length ?? 0} décisions</span><span>{state ? `${Math.max(0, state.age - 14)} années de parcours` : "L'histoire commence ici"}</span></div>
    </aside>
  );
}
