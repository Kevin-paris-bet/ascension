"use client";

import { useState, type CSSProperties } from "react";
import {
  getClub,
  getClubs,
  getLeague,
  getLeagues,
  type ClubOffer,
  type SeasonSummary,
} from "@/lib/footballCareer";

const MOVE_LABELS = {
  academy: "Centre de formation",
  stay: "Prolongation",
  loan: "Prêt",
  transfer: "Transfert",
} as const;

export function ClubCrest({ clubId, size = "normal" }: { clubId: string; size?: "small" | "normal" | "large" }) {
  const club = getClub(clubId);
  return <span className={`club-crest ${size}`} style={{ "--crest-a": club.colors[0], "--crest-b": club.colors[1] } as CSSProperties}>{club.short}</span>;
}

export function InitialClubChoice({ offers, onChoose }: { offers: ClubOffer[]; onChoose: (offer: ClubOffer) => void }) {
  return <>
    <p className="eyebrow">Premier contrat · 3 propositions</p>
    <h1 className="display-title">Les clubs<br />t’ont repéré.</h1>
    <p className="lede">Chaque projet change ton exposition, ta concurrence et ton chemin vers l’équipe première.</p>
    <div className="club-offer-list">
      {offers.map((offer) => <ClubOfferButton key={offer.id} offer={offer} onChoose={onChoose} />)}
    </div>
  </>;
}

export function SeasonReview({ summary, onContinue }: { summary: SeasonSummary; onContinue: () => void }) {
  const club = getClub(summary.clubId);
  const league = getLeague(summary.leagueId);
  return <>
    <div className="event-meta"><span>Saison {summary.season}</span><span>{summary.age} ans · {league.flag} {league.country}</span></div>
    <div className="season-hero">
      <ClubCrest clubId={club.id} size="large" />
      <div><p className="eyebrow">Bilan de saison</p><h1 className="question">{club.name}</h1><p>{league.name} · {summary.role}</p></div>
      <strong className="season-rating">{summary.averageRating}</strong>
    </div>
    <div className="season-stat-grid">
      <SeasonStat value={summary.appearances} label="Matchs" />
      <SeasonStat value={summary.starts} label="Titularisations" />
      <SeasonStat value={summary.goals} label="Buts" />
      <SeasonStat value={summary.assists} label="Passes déc." />
    </div>
    <div className="season-objective">
      <div><span>Championnat</span><strong>{summary.tableFinish}<sup>e</sup> / {summary.tableSize}</strong></div>
      <div><span>Objectif du club</span><strong className={summary.objectiveMet ? "success-text" : "danger-text"}>{summary.objectiveMet ? "Atteint" : "Manqué"}</strong><small>{summary.objective}</small></div>
    </div>
    {summary.trophies.length > 0 && <div className="trophy-strip">🏆 {summary.trophies.join(" · ")}</div>}
    <div className="market-line"><span>Valeur estimée</span><strong>{formatMoney(summary.marketValueM)}</strong><span>Salaire</span><strong>{formatMoney(summary.salaryM)}/an</strong></div>
    <button className="primary-button full-button" onClick={onContinue}>Ouvrir la suite de la carrière</button>
  </>;
}

export function TransferMarket({ offers, onChoose }: { offers: ClubOffer[]; onChoose: (offer: ClubOffer) => void }) {
  const externalCount = offers.filter((offer) => offer.moveType !== "stay").length;
  return <>
    <p className="eyebrow">Mercato · {externalCount} clubs intéressés</p>
    <h1 className="display-title">À toi de<br />choisir.</h1>
    <p className="lede">Le plus grand club n’est pas toujours le meilleur choix. Compare le rôle, la concurrence, le championnat et le contrat.</p>
    <div className="club-offer-list transfer-list">
      {offers.map((offer) => <ClubOfferButton key={offer.id} offer={offer} onChoose={onChoose} />)}
    </div>
  </>;
}

export function FootballWorld({ currentClubId, onPlay }: { currentClubId?: string; onPlay: () => void }) {
  const leagues = getLeagues();
  const clubs = getClubs();
  const countryCount = new Set(leagues.map((league) => league.country)).size;
  const currentLeagueId = currentClubId ? getClub(currentClubId).leagueId : undefined;
  const [selectedLeagueId, setSelectedLeagueId] = useState(currentLeagueId ?? leagues[0].id);
  const selectedLeague = getLeague(selectedLeagueId);
  const leagueClubs = clubs.filter((club) => club.leagueId === selectedLeagueId).sort((a, b) => b.strength - a.strength);

  return <section className="world-page">
    <header className="world-heading">
      <div><p className="eyebrow">Le monde d’Ascension</p><h1 className="display-title">Championnats<br />& clubs.</h1><p>{leagues.length} compétitions · {countryCount} pays · {clubs.length} équipes originales</p></div>
      <button className="primary-button" onClick={onPlay}>Reprendre ma carrière</button>
    </header>
    <div className="league-picker" aria-label="Choisir un championnat">
      {leagues.map((league) => <button key={league.id} className={selectedLeagueId === league.id ? "active" : ""} onClick={() => setSelectedLeagueId(league.id)}><span>{league.flag}</span><strong>{league.name}</strong><small>{league.country} · D{league.tier}</small></button>)}
    </div>
    <article className="league-board">
      <div className="league-board-head"><div><p className="eyebrow">{selectedLeague.flag} {selectedLeague.country}</p><h2>{selectedLeague.name}</h2></div><span>Indice club</span></div>
      <div className="club-table">
        {leagueClubs.map((club, index) => <div className={club.id === currentClubId ? "current" : ""} key={club.id}>
          <span className="table-rank">{index + 1}</span><ClubCrest clubId={club.id} size="small" /><span className="table-club"><strong>{club.name}</strong><small>{club.id === currentClubId ? "Ton club actuel" : `Prestige ${club.prestige}`}</small></span><strong className="strength-score">{club.strength}</strong>
        </div>)}
      </div>
    </article>
  </section>;
}

function ClubOfferButton({ offer, onChoose }: { offer: ClubOffer; onChoose: (offer: ClubOffer) => void }) {
  const club = getClub(offer.clubId);
  const league = getLeague(club.leagueId);
  return <button className={`club-offer${offer.moveType === "stay" ? " stay" : ""}`} onClick={() => onChoose(offer)}>
    <ClubCrest clubId={club.id} />
    <span className="offer-main"><small>{MOVE_LABELS[offer.moveType]} · {league.flag} {league.name}</small><strong>{club.name}</strong><em>{offer.reason}</em></span>
    <span className="offer-facts"><strong>{offer.role}</strong><small>{offer.duration} an{offer.duration > 1 ? "s" : ""} · {formatMoney(offer.salaryM)}/an</small><span>Concurrence {offer.competition}%</span></span>
  </button>;
}

function SeasonStat({ value, label }: { value: number; label: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function formatMoney(value: number): string {
  return value < 1 ? `${Math.round(value * 1000)} k€` : `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€`;
}
