"use client";

import { PlayerAvatar } from "@/app/components/PlayerAvatar";
import type { CareerState } from "@/engine/state";
import type { CreationSelection } from "@/lib/engineBridge";
import { computeOverall, getClub, getLeague, type FootballCareer } from "@/lib/footballCareer";
import { ClubCrest } from "@/app/components/FootballCareerScreens";

const POSITION_LABELS: Record<string, string> = {
  opt_gardien: "Gardien", opt_defenseur: "Défenseur", opt_milieu: "Milieu", opt_attaquant: "Attaquant",
};
const ORIGIN_LABELS: Record<string, string> = {
  opt_cite: "Banlieue", opt_village: "Campagne", opt_formation: "Formation", opt_etranger: "Étranger", opt_heritier: "Héritier",
};
const GIFT_LABELS: Record<string, string> = {
  opt_don_technique: "Technicien", opt_don_vitesse: "Explosif", opt_don_vista: "Visionnaire", opt_don_mental: "Mental d'acier",
};

export function PlayerDossier({ state, name, number, selection, football }: {
  state: CareerState | null;
  name: string;
  number: string;
  selection: CreationSelection;
  football: FootballCareer | null;
}) {
  const score = state ? computeOverall(state) : null;
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
  const club = football ? getClub(football.currentClubId) : null;
  const league = club ? getLeague(club.leagueId) : null;
  const latestSeason = football?.seasons.at(-1);

  return (
    <aside className="player-dossier">
      <div className="dossier-head">
        <PlayerAvatar className="dossier-avatar" seed={state?.seed ?? playerName} />
        <div className="dossier-identity"><span className="dossier-kicker">DOSSIER JOUEUR</span><h2>{playerName}</h2><p>#{number || "10"} · {age} ans</p></div>
        <div className="rating-badge"><span>NOTE</span><strong>{score ?? "—"}</strong></div>
      </div>
      <div className="dossier-tags"><span>{position}</span><span>{origin}</span></div>
      <div className="club-line club-line-rich">
        {club ? <><ClubCrest clubId={club.id} size="small" /><span><strong>{club.name}</strong><small>{league?.flag} {league?.name}</small></span></> : <span>{state ? "Les clubs préparent leurs offres" : "En attente du premier contrat"}</span>}
        <strong>{state ? `S${Math.max(1, state.season + 1)}` : "U15"}</strong>
      </div>
      {football && <div className="contract-line"><span>{football.contract.role}</span><span>{football.contract.salaryM < 1 ? `${Math.round(football.contract.salaryM * 1000)} k€` : `${football.contract.salaryM.toFixed(1)} M€`}/an</span><span>jusqu’en S{football.contract.endSeason}</span></div>}
      <div className="career-progress" aria-label={`Progression de carrière ${Math.round(progress)} %`}><span style={{ width: `${progress}%` }} /></div>
      <p className="dossier-section-title">Attributs</p>
      <div className="dossier-stats">{stats.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value ?? "—"}</strong></div>)}</div>
      <div className="talent-chip">✦ {gift}</div>
      <div className="dossier-foot"><span>{football?.clubHistory.length ?? 0} club{football?.clubHistory.length === 1 ? "" : "s"}</span><span>{latestSeason ? `${latestSeason.appearances} matchs · note ${latestSeason.averageRating}` : state ? `${state.history.length} décisions` : "L'histoire commence ici"}</span></div>
    </aside>
  );
}
