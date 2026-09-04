"use client";

import { useState, type CSSProperties } from "react";
import {
  getClub,
  getClubs,
  getLeague,
  getLeagues,
  type ClubOffer,
  type InternationalOffer,
  type SeasonSummary,
} from "@/lib/footballCareer";
import { getNationalTeam, getNationalTeams, type Confederation } from "@/lib/nationalTeams";

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

export function NationalityChoice({ onChoose }: { onChoose: (optionId: string) => void }) {
  const teams = getNationalTeams();
  const [region, setRegion] = useState<Confederation | "Toutes">("Toutes");
  const visible = region === "Toutes" ? teams : teams.filter((team) => team.confederation === region);
  const regions: Array<Confederation | "Toutes"> = ["Toutes", "Europe", "Afrique", "Amériques", "Asie"];
  return <>
    <p className="eyebrow">Identité internationale</p>
    <h1 className="display-title">Quel maillot<br />national ?</h1>
    <p className="lede">Ce choix détermine la sélection qui pourra te convoquer. Ton club, lui, pourra être dans n’importe quel pays.</p>
    <div className="region-picker" aria-label="Filtrer les sélections">
      {regions.map((item) => <button key={item} className={region === item ? "active" : ""} onClick={() => setRegion(item)}>{item}</button>)}
    </div>
    <div className="nationality-grid">
      {visible.map((team) => <button key={team.id} className="nationality-button" onClick={() => onChoose(`opt_nat_${team.id}`)}><span>{team.flag}</span><strong>{team.name}</strong><small>{team.confederation}</small></button>)}
    </div>
    <button className="quiet-button random-country" onClick={() => onChoose(`opt_nat_${teams[Math.floor(Math.random() * teams.length)].id}`)}>🎲 Choisir pour moi</button>
  </>;
}

export function InternationalCallUp({ offer, onAccept, onDecline }: { offer: InternationalOffer; onAccept: () => void; onDecline: () => void }) {
  const team = getNationalTeam(offer.teamId);
  return <>
    <p className="eyebrow">Convocation internationale</p>
    <div className="national-callup">
      <span className="national-flag">{team.flag}</span>
      <div><h1>{team.name}</h1><p>{offer.reason}</p></div>
      <span className="callup-role">Rôle proposé<strong>{offer.role}</strong></span>
    </div>
    <p className="prompt">{offer.previousRefusals > 0 ? "Tu as déjà refusé une convocation. Cette fois encore, le choix t’appartient." : "Accepter ouvre une seconde carrière : sélections, grandes compétitions et trophées internationaux."}</p>
    <div className="callup-actions">
      <button className="primary-button" onClick={onAccept}>Accepter la sélection</button>
      <button className="quiet-button" onClick={onDecline}>Refuser pour le moment</button>
    </div>
    <p className="callup-note">Un refus n’est pas définitif : si tes performances restent suffisantes, le sélectionneur pourra revenir plus tard.</p>
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
      {summary.cleanSheets > 0 && <SeasonStat value={summary.cleanSheets} label="Clean sheets" />}
    </div>
    <div className="season-objective">
      <div><span>Championnat</span><strong>{summary.tableFinish}<sup>e</sup> / {summary.tableSize}</strong></div>
      <div><span>Objectif du club</span><strong className={summary.objectiveMet ? "success-text" : "danger-text"}>{summary.objectiveMet ? "Atteint" : "Manqué"}</strong><small>{summary.objective}</small></div>
    </div>
    <div className="competition-grid">
      <CompetitionLine label={summary.domesticCup.name} stage={summary.domesticCup.stage} won={summary.domesticCup.won} />
      {summary.continentalCup && <CompetitionLine label={summary.continentalCup.name} stage={summary.continentalCup.stage} won={summary.continentalCup.won} />}
      {summary.international && <CompetitionLine label={`Sélection · ${getNationalTeam(summary.international.teamId).name}`} stage={`${summary.international.caps} sélections${summary.international.tournament ? ` · ${summary.international.tournament.stage}` : ""}`} won={Boolean(summary.international.tournament?.won)} />}
    </div>
    {summary.divisionChange && <div className={`division-change ${summary.divisionChange}`}>{summary.divisionChange === "promotion" ? "⬆ Promotion acquise pour la saison prochaine" : "⬇ Relégation : le club descend d’une division"}</div>}
    {summary.trophies.length > 0 && <div className="trophy-strip">🏆 {summary.trophies.join(" · ")}</div>}
    {summary.individualAwards.length > 0 && <div className="award-strip">✦ {summary.individualAwards.join(" · ")}</div>}
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
  const [worldView, setWorldView] = useState<"clubs" | "nations">("clubs");
  const selectedLeague = getLeague(selectedLeagueId);
  const leagueClubs = clubs.filter((club) => club.leagueId === selectedLeagueId).sort((a, b) => b.strength - a.strength);

  return <section className="world-page">
    <header className="world-heading">
      <div><p className="eyebrow">Le monde d’Ascension</p><h1 className="display-title">Clubs &<br />sélections.</h1><p>{leagues.length} compétitions · {countryCount} pays · {clubs.length} clubs · {getNationalTeams().length} sélections</p></div>
      <button className="primary-button" onClick={onPlay}>Reprendre ma carrière</button>
    </header>
    <div className="world-tabs"><button className={worldView === "clubs" ? "active" : ""} onClick={() => setWorldView("clubs")}>Championnats & clubs</button><button className={worldView === "nations" ? "active" : ""} onClick={() => setWorldView("nations")}>Sélections nationales</button></div>
    {worldView === "clubs" ? <><div className="league-picker" aria-label="Choisir un championnat">
      {leagues.map((league) => <button key={league.id} className={selectedLeagueId === league.id ? "active" : ""} onClick={() => setSelectedLeagueId(league.id)}><span>{league.flag}</span><strong>{league.name}</strong><small>{league.country} · D{league.tier}</small></button>)}
    </div>
    <article className="league-board">
      <div className="league-board-head"><div><p className="eyebrow">{selectedLeague.flag} {selectedLeague.country}</p><h2>{selectedLeague.name}</h2></div><span>Indice club</span></div>
      <div className="club-table">
        {leagueClubs.map((club, index) => <div className={club.id === currentClubId ? "current" : ""} key={club.id}>
          <span className="table-rank">{index + 1}</span><ClubCrest clubId={club.id} size="small" /><span className="table-club"><strong>{club.name}</strong><small>{club.id === currentClubId ? "Ton club actuel" : `Prestige ${club.prestige}`}</small></span><strong className="strength-score">{club.strength}</strong>
        </div>)}
      </div>
    </article></> : <article className="national-board"><div className="league-board-head"><div><p className="eyebrow">Carrière internationale</p><h2>34 sélections jouables</h2></div><span>Indice sélection</span></div><div className="national-team-table">{getNationalTeams().map((team) => <div key={team.id}><span className="national-table-flag">{team.flag}</span><span><strong>{team.name}</strong><small>{team.confederation}</small></span><strong>{team.strength}</strong></div>)}</div></article>}
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

function CompetitionLine({ label, stage, won }: { label: string; stage: string; won: boolean }) {
  return <div className={won ? "won" : ""}><span>{won ? "🏆" : "◈"}</span><span><small>{label}</small><strong>{stage}</strong></span></div>;
}

function formatMoney(value: number): string {
  return value < 1 ? `${Math.round(value * 1000)} k€` : `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€`;
}
