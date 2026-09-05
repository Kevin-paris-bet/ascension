"use client";

import { ClubCrest } from "@/app/components/FootballCareerScreens";
import { CountryFlag } from "@/app/components/CountryFlag";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";
import { AcademyPortrait, portraitIndex } from "@/app/components/AcademyPortrait";
import type { CareerState } from "@/engine/state";
import type { CreationSelection } from "@/lib/engineBridge";
import { computeOverall, getClub, getLeague, type FootballCareer } from "@/lib/footballCareer";
import { getNationalTeam, nationalTeamIdFromSelection } from "@/lib/nationalTeams";

const POSITION_LABELS: Record<string, string> = {
  opt_gardien: "Gardien", opt_defenseur: "Défenseur", opt_milieu: "Milieu", opt_attaquant: "Attaquant",
};
const ORIGIN_LABELS: Record<string, string> = {
  opt_cite: "Banlieue", opt_village: "Campagne", opt_formation: "Formation", opt_etranger: "Étranger", opt_heritier: "Héritier",
};
const GIFT_LABELS: Record<string, string> = {
  opt_don_technique: "Technicien", opt_don_vitesse: "Explosif", opt_don_vista: "Visionnaire", opt_don_mental: "Mental d'acier",
};

function formatMoney(value: number): string {
  return value < 1 ? `${Math.round(value * 1000)} k€` : `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€`;
}

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
    ["Aura", state?.stats.aura], ["Collectif", state?.stats.vestiaire],
  ] as const;
  const club = football ? getClub(football.currentClubId) : null;
  const league = club ? getLeague(football?.currentLeagueId ?? club.leagueId) : null;
  const latestSeason = football?.seasons.at(-1);
  const honours = football?.seasons.flatMap((season) => [...season.trophies, ...season.individualAwards]).length ?? 0;
  const nationalTeamId = football?.international?.teamId ?? (selection.nationalite ? nationalTeamIdFromSelection(selection.nationalite) : null);
  const nationalTeam = nationalTeamId ? getNationalTeam(nationalTeamId) : null;
  const international = football?.international;

  return (
    <aside className="player-dossier">
      <div className="dossier-glow" aria-hidden="true" />
      <div className="dossier-topline"><span>ASCENSION // PLAYER ID</span><em>{state ? "PROFIL ACTIF" : "PROFIL ESPOIR"}</em></div>

      <div className="dossier-head">
        {selection.portrait
          ? <AcademyPortrait className="dossier-avatar dossier-photo" index={portraitIndex(selection.portrait)} label={`Portrait de ${playerName}`} />
          : <PlayerAvatar className="dossier-avatar" seed={state?.seed ?? playerName} />}
        <div className="dossier-identity">
          <span className="dossier-kicker">DOSSIER JOUEUR</span>
          <h2>{playerName}</h2>
          <p><strong>#{number || "10"}</strong><span>{position}</span><span>{age} ans</span></p>
          <div className="dossier-tags"><span>✦ {gift}</span><span>{origin}</span></div>
        </div>
        <div className="rating-badge"><span>GÉN.</span><strong>{score ?? "—"}</strong><small>/ 99</small></div>
      </div>

      <div className="dossier-club-panel">
        <div className="club-line club-line-rich">
          {club ? <><ClubCrest clubId={club.id} size="small" /><span><small>CLUB ACTUEL</small><strong>{club.name}</strong><em>{league && <CountryFlag code={league.flagCode} label={league.country} className="inline-country-flag" />} {league?.name}</em></span></> : <span><small>PROCHAIN OBJECTIF</small><strong>{state ? "Décrocher le bon projet" : "Signer un premier contrat"}</strong></span>}
          <strong className="season-chip">{state ? `S${Math.max(1, state.season + 1)}` : "U15"}</strong>
        </div>
        {football && <div className="contract-line"><span>{football.contract.role}</span><span>{formatMoney(football.contract.salaryM)}/an</span><span>Contrat · S{football.contract.endSeason}</span></div>}
      </div>

      <div className="dossier-highlights">
        <div><small>{latestSeason ? "MATCHS" : "DÉCISIONS"}</small><strong>{latestSeason?.appearances ?? state?.history.length ?? 0}</strong></div>
        <div><small>{latestSeason ? (position === "Gardien" ? "CLEAN SHEETS" : "B + PD") : "SAISON"}</small><strong>{latestSeason ? (position === "Gardien" ? latestSeason.cleanSheets : latestSeason.goals + latestSeason.assists) : Math.max(0, state?.season ?? 0)}</strong></div>
        <div><small>{latestSeason ? "NOTE SAISON" : "PALMARÈS"}</small><strong>{latestSeason?.averageRating ?? honours}</strong></div>
        <div><small>{latestSeason ? "VALEUR" : "SÉLECTIONS"}</small><strong>{latestSeason ? formatMoney(latestSeason.marketValueM) : international?.caps ?? 0}</strong></div>
      </div>

      {nationalTeam && <div className={`international-line ${international?.status ?? "eligible"}`}>
        <CountryFlag code={nationalTeam.flagCode} label={nationalTeam.name} className="international-flag" />
        <span><small>SÉLECTION NATIONALE</small><strong>{international?.status === "active" ? `${nationalTeam.name} · ${international.role} · ${international.caps} sél.` : international?.status === "declined" ? `${nationalTeam.name} · toujours éligible` : `${nationalTeam.name} · en attente`}</strong></span>
        {international?.captain && <em>CAP.</em>}
      </div>}

      <div className="dossier-attributes-head"><span>ATTRIBUTS</span><strong>{gift}</strong></div>
      <div className="dossier-stats">
        {stats.map(([label, value]) => {
          const normalized = Math.max(0, Math.min(99, value ?? 0));
          return <div key={label}><span><small>{label}</small><strong>{value ?? "—"}</strong></span><i aria-hidden="true"><b style={{ width: `${normalized}%` }} /></i></div>;
        })}
      </div>

      <div className="career-progress-copy"><span>PARCOURS</span><strong>{Math.round(progress)}%</strong></div>
      <div className="career-progress" aria-label={`Progression de carrière ${Math.round(progress)} %`}><span style={{ width: `${progress}%` }} /></div>
      <div className="dossier-foot"><span>{football?.clubHistory.length ?? 0} CLUB{football?.clubHistory.length === 1 ? "" : "S"}</span><span>{honours} TITRE{honours === 1 ? "" : "S"} & DIST.</span><span>{international?.caps ?? 0} SÉLECTION{international?.caps === 1 ? "" : "S"}</span></div>
    </aside>
  );
}
