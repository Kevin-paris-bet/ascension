"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import {
  createCareer,
  findNextStep,
  getCreationSteps,
  getEventPool,
  finishCareer,
  grantCareerExtension,
  pickChoice,
  resolveOutcomeBranch,
  type CreationSelection,
  type NextStep,
} from "@/lib/engineBridge";
import { createRng, type Rng } from "@/engine/rng";
import type { CareerState } from "@/engine/state";
import { eligibleChoices } from "@/engine/resolver";
import type { Choice } from "@/engine/schema";
import { buildLegacyCard, type CareerIdentity, type LegacyCardData } from "@/lib/legacyCard";
import { LegacyCard } from "@/app/components/LegacyCard";
import { shareCard } from "@/lib/shareCard";
import { createCareerSave, parseCareerSave, restoreCareerState, type CareerSave } from "@/lib/careerSave";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { requestRewardedAd } from "@/lib/rewardedAds";
import { CareerLibrary } from "@/app/components/CareerLibrary";
import { PlayerDossier } from "@/app/components/PlayerDossier";
import {
  InitialClubChoice,
  SeasonReview,
  TransferMarket,
  FootballWorld,
  InternationalCallUp,
  NationalityChoice,
} from "@/app/components/FootballCareerScreens";
import {
  acceptClubOffer,
  acceptInternationalOffer,
  declineInternationalOffer,
  generateAcademyOffers,
  generateInternationalOffer,
  generateTransferOffers,
  normalizeFootballCareer,
  returnFromLoanIfDue,
  shouldOpenTransferWindow,
  simulateSeason,
  startFootballCareer,
  type ClubOffer,
  type FootballCareer,
  type InternationalOffer,
  type SeasonSummary,
} from "@/lib/footballCareer";
import type { PendingStepKind, PersistedScreen } from "@/lib/careerSave";
import { nationalTeamIdFromSelection } from "@/lib/nationalTeams";

type Screen = "creation" | "identity" | "club_choice" | "playing" | "outcome" | "season_summary" | "international_offer" | "transfer_market" | "retirement" | "over";
type SaveStatus = "idle" | "saving" | "saved" | "local" | "error";
type AppView = "game" | "world" | "library";
const LOCAL_SAVE_KEY = "ascension:career:v1";
const PENDING_CONSENT_KEY = "ascension:pending-marketing-consent";

export function GameApp() {
  const pool = useMemo(() => getEventPool(), []);
  const steps = useMemo(() => getCreationSteps().filter((item) => item.kind === "choice" || item.kind === "rewarded"), []);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [authReady, setAuthReady] = useState(!isSupabaseConfigured());
  const [user, setUser] = useState<User | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [screen, setScreen] = useState<Screen>("creation");
  const [stepIndex, setStepIndex] = useState(0);
  const [selection, setSelection] = useState<CreationSelection>({});
  const [name, setName] = useState("");
  const [number, setNumber] = useState("10");
  const [step, setStep] = useState<NextStep | null>(null);
  const [lastOutcome, setLastOutcome] = useState("");
  const [lastSuccess, setLastSuccess] = useState<boolean | undefined>();
  const [lastDeltas, setLastDeltas] = useState<Record<string, number>>({});
  const [cardData, setCardData] = useState<LegacyCardData | null>(null);
  const [resumeSave, setResumeSave] = useState<CareerSave | null>(null);
  const [careerState, setCareerState] = useState<CareerState | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [adNotice, setAdNotice] = useState("");
  const [shareState, setShareState] = useState<"idle" | "working" | "shared" | "downloaded" | "error">("idle");
  const [view, setView] = useState<AppView>("game");
  const [football, setFootball] = useState<FootballCareer | null>(null);
  const [initialClubOffers, setInitialClubOffers] = useState<ClubOffer[]>([]);
  const [seasonSummary, setSeasonSummary] = useState<SeasonSummary | null>(null);
  const [transferOffers, setTransferOffers] = useState<ClubOffer[]>([]);
  const [internationalOffer, setInternationalOffer] = useState<InternationalOffer | null>(null);
  const [pendingStep, setPendingStep] = useState<NextStep | null>(null);

  const stateRef = useRef<CareerState | null>(null);
  const rngRef = useRef<Rng | null>(null);
  const footballRef = useRef<FootballCareer | null>(null);
  const actionBusy = useRef(false);
  const [busy, setBusy] = useState(false);
  async function exclusiveAction(action: () => Promise<void>) {
    if (actionBusy.current) return;
    actionBusy.current = true;
    setBusy(true);
    try { await action(); } finally { actionBusy.current = false; setBusy(false); }
  }
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const local = readLocalSave();
    // Synchronisation intentionnelle avec un stockage navigateur externe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (local) setResumeSave(local);
    if (!supabase) return;

    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setAuthReady(true);
      const pending = window.localStorage.getItem(PENDING_CONSENT_KEY);
      if (nextUser && pending !== null) {
        const marketingConsent = pending === "true";
        void supabase.from("profiles").upsert({
          id: nextUser.id,
          marketing_consent: marketingConsent,
          marketing_consented_at: marketingConsent ? new Date().toISOString() : null,
        }).then(({ error }) => {
          if (!error) window.localStorage.removeItem(PENDING_CONSENT_KEY);
        });
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) return;
    let active = true;
    void supabase
      .from("career_saves")
      .select("payload, updated_at")
      .eq("slot", "primary")
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        const cloud = parseCareerSave(data.payload);
        setResumeSave((current) => newestSave(current, cloud));
      });
    return () => { active = false; };
  }, [supabase, user]);

  async function chooseCreation(stepId: string, optionId: string) {
    const creationStep = steps.find((item) => item.id === stepId);
    if (creationStep?.kind === "rewarded" && optionId !== "opt_perk_aucun") {
      setAdNotice("Préparation de l’avantage…");
      const option = creationStep.options?.find((item) => item.id === optionId);
      const result = await requestRewardedAd({ reason: "creation_perk", rewardLabel: option?.label ?? "Avantage de départ" });
      if (result !== "completed") {
        setAdNotice(result === "unavailable" ? "La publicité récompensée n’est pas disponible sur cette version. Tu peux commencer sans avantage." : "La publicité n’a pas été terminée : l’avantage n’a pas été accordé.");
        return;
      }
    }
    setAdNotice("");
    const next = { ...selection, [stepId]: optionId };
    setSelection(next);
    if (stepIndex < steps.length - 1) setStepIndex((value) => value + 1);
    else setScreen("identity");
  }

  function currentIdentity(): CareerIdentity {
    return {
      name: name.trim() || "Sans Nom",
      number: Math.max(1, Math.min(99, Number.parseInt(number, 10) || 10)),
    };
  }

  function startCareer() {
    const identity = currentIdentity();
    const created = createCareer(selection);
    const offers = generateAcademyOffers(created.state);
    stateRef.current = created.state;
    setCareerState(created.state);
    rngRef.current = created.rng;
    setName(identity.name);
    setNumber(String(identity.number));
    setInitialClubOffers(offers);
    setScreen("club_choice");
    if (supabase && user) void supabase.from("profiles").update({ display_name: identity.name }).eq("id", user.id);
    persist(created.state, created.rng, "club_choice", null, identity, "", undefined, {}, { initialClubOffers: offers });
  }

  function chooseInitialClub(offer: ClubOffer) {
    if (!stateRef.current || !rngRef.current) return;
    const started = startFootballCareer(stateRef.current, offer, nationalTeamIdFromSelection(selection.nationalite));
    stateRef.current = started.state;
    setCareerState(started.state);
    footballRef.current = started.career;
    setFootball(started.career);
    setInitialClubOffers([]);
    advance(started.state, rngRef.current, currentIdentity(), started.career);
  }

  function advance(state: CareerState, rng: Rng, identity = currentIdentity(), activeFootball = footballRef.current) {
    const result = findNextStep(state, pool, rng);
    let settled = { ...result.state, rngState: rng.getState() };
    let nextFootball = activeFootball;

    if (nextFootball && result.state.season > state.season) {
      const seasonsElapsed = result.state.season - state.season;
      for (let offset = 1; offset <= seasonsElapsed; offset++) {
        const seasonState = { ...state, age: state.age + offset, season: state.season + offset };
        nextFootball = simulateSeason(seasonState, nextFootball, rng);
      }
      settled = { ...settled, rngState: rng.getState() };
      const summary = nextFootball.seasons.at(-1) ?? null;
      stateRef.current = settled;
      setCareerState(settled);
      footballRef.current = nextFootball;
      setFootball(nextFootball);
      setPendingStep(result.step);
      setSeasonSummary(summary);
      setAdNotice("");
      setScreen("season_summary");
      persist(settled, rng, "season_summary", pendingEventId(result.step), identity, "", undefined, {}, {
        football: nextFootball,
        seasonSummary: summary ?? undefined,
        pendingKind: pendingKind(result.step),
      });
      return;
    }

    presentStep(result.step, settled, rng, identity, nextFootball);
  }

  function presentStep(next: NextStep, settled: CareerState, rng: Rng, identity: CareerIdentity, activeFootball: FootballCareer | null) {
    stateRef.current = settled;
    setCareerState(settled);
    footballRef.current = activeFootball;
    setFootball(activeFootball);
    setPendingStep(null);
    setStep(next);
    setAdNotice("");

    if (next.kind === "retirement_offer") {
      setScreen("retirement");
      persist(settled, rng, "retirement", null, identity, "", undefined, {}, { football: activeFootball ?? undefined });
      return;
    }

    if (next.kind === "over") {
      const card = buildLegacyCard(settled, next.legacy, identity, activeFootball ?? undefined);
      setCardData(card);
      setScreen("over");
      clearSave();
      if (supabase && user) {
        void supabase.from("career_results").insert({
          user_id: user.id,
          seed: settled.seed,
          player_name: card.name,
          final_note: card.note,
          summary: card,
        });
      }
      return;
    }

    setScreen("playing");
    persist(settled, rng, "playing", next.event.id, identity, "", undefined, {}, { football: activeFootball ?? undefined });
  }

  function applySelectedChoice(choice: Choice) {
    if (!step || step.kind !== "event" || !stateRef.current || !rngRef.current) return;
    const before = stateRef.current.stats;
    const result = pickChoice(stateRef.current, step.event, choice, rngRef.current);
    const next = { ...result.state, rngState: rngRef.current.getState() };
    const deltas = statDeltas(before, next.stats);
    stateRef.current = next;
    setCareerState(next);
    setLastOutcome(result.outcomeText);
    setLastSuccess(result.resolvedSuccess);
    setLastDeltas(deltas);
    setScreen("outcome");
    persist(next, rngRef.current, "outcome", step.event.id, currentIdentity(), result.outcomeText, result.resolvedSuccess, deltas, { football: footballRef.current ?? undefined });
  }

  async function choose(choiceId: string) {
    if (!step || step.kind !== "event") return;
    const choice = step.choices.find((item) => item.id === choiceId);
    if (!choice) return;

    if (choice.rewarded) {
      setAdNotice("Préparation de la seconde chance…");
      const result = await requestRewardedAd({
        reason: step.event.id.includes("blessure") ? "injury_recovery" : "second_chance",
        rewardLabel: choice.label,
      });
      if (result !== "completed") {
        setAdNotice(result === "unavailable"
          ? "Aucune vidéo disponible pour le moment. Tu peux choisir une autre option."
          : "La publicité n’a pas été terminée : la récompense reste verrouillée.");
        return;
      }
    }
    applySelectedChoice(choice);
  }

  function continueAfter() {
    if (stateRef.current && rngRef.current) advance(stateRef.current, rngRef.current);
  }

  function continueAfterSeason() {
    if (!stateRef.current || !rngRef.current || !footballRef.current || !seasonSummary || !pendingStep) return;
    const loanReturn = returnFromLoanIfDue(stateRef.current, footballRef.current);
    stateRef.current = loanReturn.state;
    setCareerState(loanReturn.state);
    footballRef.current = loanReturn.career;
    setFootball(loanReturn.career);

    const offer = generateInternationalOffer(loanReturn.state, loanReturn.career);
    if (offer) {
      setInternationalOffer(offer);
      setScreen("international_offer");
      persist(loanReturn.state, rngRef.current, "international_offer", pendingEventId(pendingStep), currentIdentity(), "", undefined, {}, {
        football: loanReturn.career,
        seasonSummary,
        internationalOffer: offer,
        pendingKind: pendingKind(pendingStep),
      });
      return;
    }
    finishPostSeason(loanReturn.state, loanReturn.career);
  }

  function finishPostSeason(activeState: CareerState, activeFootball: FootballCareer) {
    if (!rngRef.current || !seasonSummary || !pendingStep) return;
    if (pendingStep.kind === "event" && shouldOpenTransferWindow(activeState, activeFootball)) {
      const offers = generateTransferOffers(activeState, activeFootball);
      setTransferOffers(offers);
      setScreen("transfer_market");
      persist(activeState, rngRef.current, "transfer_market", pendingEventId(pendingStep), currentIdentity(), "", undefined, {}, {
        football: activeFootball,
        seasonSummary,
        transferOffers: offers,
        pendingKind: pendingKind(pendingStep),
      });
      return;
    }
    presentStep(pendingStep, activeState, rngRef.current, currentIdentity(), activeFootball);
  }

  function chooseInternationalOffer(accept: boolean) {
    if (!stateRef.current || !footballRef.current || !internationalOffer) return;
    const decision = accept
      ? acceptInternationalOffer(stateRef.current, footballRef.current, internationalOffer)
      : declineInternationalOffer(stateRef.current, footballRef.current);
    stateRef.current = decision.state;
    setCareerState(decision.state);
    footballRef.current = decision.career;
    setFootball(decision.career);
    setInternationalOffer(null);
    finishPostSeason(decision.state, decision.career);
  }

  function chooseTransferOffer(offer: ClubOffer) {
    if (!stateRef.current || !rngRef.current || !footballRef.current || !pendingStep) return;
    const accepted = acceptClubOffer(stateRef.current, footballRef.current, offer);
    stateRef.current = accepted.state;
    setCareerState(accepted.state);
    footballRef.current = accepted.career;
    setFootball(accepted.career);
    setTransferOffers([]);
    presentStep(pendingStep, accepted.state, rngRef.current, currentIdentity(), accepted.career);
  }

  async function extendCareer() {
    if (!stateRef.current || !rngRef.current) return;
    setAdNotice("Préparation de la seconde chance…");
    const result = await requestRewardedAd({ reason: "career_extension", rewardLabel: "Une saison supplémentaire" });
    if (result !== "completed") {
      setAdNotice(result === "unavailable" ? "Aucune vidéo disponible pour le moment. Tu peux terminer ta carrière normalement." : "La publicité n’a pas été terminée : la saison supplémentaire reste verrouillée.");
      return;
    }
    const extended = grantCareerExtension(stateRef.current);
    stateRef.current = extended;
    setCareerState(extended);
    advance(extended, rngRef.current);
  }

  function retireNow() {
    if (!stateRef.current) return;
    const identity = currentIdentity();
    const final = finishCareer(stateRef.current);
    const card = buildLegacyCard(stateRef.current, final.legacy, identity, footballRef.current ?? undefined);
    setCardData(card);
    setStep(final);
    setScreen("over");
    clearSave();
    if (supabase && user) void supabase.from("career_results").insert({ user_id: user.id, seed: stateRef.current.seed, player_name: card.name, final_note: card.note, summary: card });
  }

  function resumeCareer(save: CareerSave) {
    const restored = restoreCareerState(save);
    const rng = createRng(restored.seed, save.rngState);
    stateRef.current = restored;
    setCareerState(restored);
    rngRef.current = rng;
    setName(save.identity.name);
    setNumber(String(save.identity.number));
    setSelection(save.selection);
    setLastOutcome(save.lastOutcome);
    setLastSuccess(save.lastSuccess);
    setLastDeltas(save.lastDeltas);
    if (!save.football) {
      const offers = save.initialClubOffers?.length ? save.initialClubOffers : generateAcademyOffers(restored);
      setInitialClubOffers(offers);
      setScreen("club_choice");
      setResumeSave(null);
      return;
    }
    const restoredFootball = normalizeFootballCareer(save.football, nationalTeamIdFromSelection(save.selection.nationalite));
    footballRef.current = restoredFootball;
    setFootball(restoredFootball);
    if (save.screen === "club_choice") {
      const offers = save.initialClubOffers?.length ? save.initialClubOffers : generateAcademyOffers(restored);
      setInitialClubOffers(offers);
      setScreen("club_choice");
      setResumeSave(null);
      return;
    }
    if (save.screen === "playing" && save.eventId) {
      const event = pool.find((item) => item.id === save.eventId);
      if (event) {
        const choices = event.kind === "outcome" ? resolveOutcomeBranch(restored, event) : eligibleChoices(restored, event);
        setStep({ kind: "event", event, choices });
        setScreen("playing");
        setResumeSave(null);
        return;
      }
    }
    if (save.screen === "retirement") {
      setStep({ kind: "retirement_offer" });
      setScreen("retirement");
      setResumeSave(null);
      return;
    }
    if ((save.screen === "season_summary" || save.screen === "international_offer" || save.screen === "transfer_market") && save.seasonSummary) {
      const pending = restorePendingStep(save.pendingKind, save.eventId, restored, pool);
      if (pending) {
        setPendingStep(pending);
        setSeasonSummary(save.seasonSummary);
        if (save.screen === "international_offer" && save.internationalOffer) {
          setInternationalOffer(save.internationalOffer);
          setScreen("international_offer");
        } else if (save.screen === "transfer_market" && save.transferOffers?.length) {
          setTransferOffers(save.transferOffers);
          setScreen("transfer_market");
        } else {
          setScreen("season_summary");
        }
        setResumeSave(null);
        return;
      }
    }
    setStep(null);
    setScreen("outcome");
    setResumeSave(null);
  }

  async function onShare() {
    const svg = cardRef.current?.querySelector("svg");
    if (!svg || !cardData) return;
    setShareState("working");
    try {
      const channel = await shareCard(svg as SVGSVGElement, cardData.name, cardData.note);
      setShareState(channel === "cancelled" ? "idle" : channel === "share" ? "shared" : "downloaded");
    } catch {
      setShareState("error");
    }
  }

  function restart() {
    clearSave();
    stateRef.current = null;
    setCareerState(null);
    rngRef.current = null;
    setStep(null);
    setSelection({});
    setStepIndex(0);
    setCardData(null);
    setLastDeltas({});
    setShareState("idle");
    footballRef.current = null;
    setFootball(null);
    setInitialClubOffers([]);
    setSeasonSummary(null);
    setTransferOffers([]);
    setInternationalOffer(null);
    setPendingStep(null);
    setScreen("creation");
  }

  function persist(state: CareerState, rng: Rng, savedScreen: PersistedScreen, eventId: string | null, identity: CareerIdentity, outcome: string, success: boolean | undefined, deltas: Record<string, number>, extra: {
    football?: FootballCareer;
    initialClubOffers?: ClubOffer[];
    seasonSummary?: SeasonSummary;
    transferOffers?: ClubOffer[];
    internationalOffer?: InternationalOffer;
    pendingKind?: PendingStepKind;
  } = {}) {
    const payload = createCareerSave({ screen: savedScreen, identity, selection, state, rngState: rng.getState(), eventId, lastOutcome: outcome, lastSuccess: success, lastDeltas: deltas, ...extra });
    window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(payload));
    setSaveStatus("local");
    if (!supabase || !user) return;
    setSaveStatus("saving");
    void supabase.from("career_saves").upsert({ user_id: user.id, slot: "primary", payload, updated_at: payload.savedAt })
      .then(({ error }) => setSaveStatus(error ? "error" : "saved"));
  }

  function clearSave() {
    window.localStorage.removeItem(LOCAL_SAVE_KEY);
    setResumeSave(null);
    if (supabase && user) void supabase.from("career_saves").delete().eq("slot", "primary");
  }

  if (!authReady) return <AppFrame user={null}><div className="auth-wrap"><p>Connexion au vestiaire…</p></div></AppFrame>;
  if (!user && !demoMode) {
    return <AppFrame user={null}><AuthGate configured={Boolean(supabase)} onDemo={() => setDemoMode(true)} onSubmit={async (email, marketingConsent) => {
      if (!supabase) return "Supabase n’est pas encore configuré sur cet environnement.";
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { marketing_consent: marketingConsent }, shouldCreateUser: true } });
      if (!error) window.localStorage.setItem(PENDING_CONSENT_KEY, String(marketingConsent));
      return error ? error.message : null;
    }} /></AppFrame>;
  }

  const current = steps[stepIndex];
  const state = careerState;

  return (
    <AppFrame busy={busy} user={user} view={view} onViewChange={setView} onSignOut={supabase && user ? () => void supabase.auth.signOut() : undefined}>
      {view === "world" ? <FootballWorld currentClubId={football?.currentClubId} onPlay={() => setView("game")} /> : view === "library" && supabase && user ? <CareerLibrary supabase={supabase} userId={user.id} onPlay={() => setView("game")} /> : <>
      {resumeSave && screen === "creation" && <div className="resume-card"><p>Une carrière de {resumeSave.identity.name} est disponible ({resumeSave.state.age} ans).</p><div className="button-row"><button className="primary-button" onClick={() => resumeCareer(resumeSave)}>Reprendre</button><button className="quiet-button" onClick={clearSave}>Nouvelle carrière</button></div></div>}
      <div className="game-layout">
        <section className="game-stage"><div className="stage-content">
          {screen === "creation" && current && <>
            <div className="progress" aria-label={`Étape ${stepIndex + 1} sur ${steps.length}`}>{steps.map((item, index) => <span key={item.id} className={index <= stepIndex ? "active" : ""} />)}</div>
            {current.id === "nationalite"
              ? <NationalityChoice onChoose={(optionId) => void exclusiveAction(() => chooseCreation(current.id, optionId))} />
              : <><p className="eyebrow">Crée ton histoire · {pool.length} événements</p><h1 className="display-title">Une carrière.<br />Tes choix.</h1><p className="lede">Pas de bonne réponse. Seulement des conséquences qui te suivront jusque dans le dernier vestiaire.</p><h2 className="question">{current.question}</h2><div className="choice-list two-columns">{(current.options ?? []).map((option) => <button className={`choice-button${current.kind === "rewarded" && option.id !== "opt_perk_aucun" ? " rewarded" : ""}`} key={option.id} onClick={() => void exclusiveAction(() => chooseCreation(current.id, option.id))}><strong>{option.label}</strong>{"flavor" in option && option.flavor ? <small>{option.flavor}</small> : null}</button>)}</div>{adNotice && <p className="notice">{adNotice}</p>}</>}
          </>}
          {screen === "identity" && <><p className="eyebrow">Dernier détail avant le tunnel</p><h1 className="display-title">Quel nom<br />restera ?</h1><p className="lede">Ce nom apparaîtra dans ta bibliothèque et sur ta carte de fin de carrière.</p><div className="inline-fields"><div className="form-field"><label htmlFor="player-name">Nom du joueur</label><input id="player-name" className="text-input" value={name} onChange={(event) => setName(event.target.value.slice(0,22))} placeholder="K. Diallo" autoComplete="off" /></div><div className="form-field"><label htmlFor="player-number">Numéro</label><input id="player-number" className="text-input" value={number} onChange={(event) => setNumber(event.target.value.replace(/\D/g,"").slice(0,2))} inputMode="numeric" /></div></div><button className="primary-button" onClick={startCareer}>Entrer sur le terrain</button></>}
          {screen === "club_choice" && initialClubOffers.length > 0 && <InitialClubChoice offers={initialClubOffers} onChoose={chooseInitialClub} />}
          {screen === "playing" && step?.kind === "event" && <><div className="event-meta"><span>{state?.age} ans · Acte {step.event.act}</span><span>Saison {Math.max(1,(state?.season ?? 0)+1)}</span></div><p className="eyebrow" style={{ marginTop: 34 }}>Le moment du choix</p><h1 className="question">{step.event.theme ?? "Ta carrière bascule"}</h1><p className="prompt">{step.event.prompt}</p><div className="choice-list">{step.choices.map((choice) => <button className={`choice-button${choice.rewarded ? " rewarded" : ""}`} key={choice.id} onClick={() => void exclusiveAction(() => choose(choice.id))}>{choice.label}</button>)}</div>{adNotice && <p className="notice">{adNotice}</p>}</>}
          {screen === "outcome" && <><p className="eyebrow">La conséquence</p><div className={`outcome-card${lastSuccess === false ? " failure" : ""}`}><p className="outcome-text">{lastOutcome}</p></div><div className="delta-row">{Object.entries(lastDeltas).map(([statName, delta]) => <span className={`delta-chip${delta < 0 ? " negative" : ""}`} key={statName}>{statName} {delta > 0 ? "+" : ""}{delta}</span>)}</div><button className="primary-button" onClick={continueAfter}>Saison suivante</button></>}
          {screen === "season_summary" && seasonSummary && <SeasonReview summary={seasonSummary} onContinue={continueAfterSeason} />}
          {screen === "international_offer" && internationalOffer && <InternationalCallUp offer={internationalOffer} onAccept={() => chooseInternationalOffer(true)} onDecline={() => chooseInternationalOffer(false)} />}
          {screen === "transfer_market" && transferOffers.length > 0 && <TransferMarket offers={transferOffers} onChoose={chooseTransferOffer} />}
          {screen === "retirement" && <><p className="eyebrow">Le corps décide</p><h1 className="display-title">Encore une<br />saison ?</h1><p className="prompt">À {state?.age} ans, ton entourage pense que le moment est venu. Tu peux quitter le terrain maintenant, ou demander une dernière chance.</p><button className="choice-button rewarded" onClick={() => void exclusiveAction(extendCareer)}>Regarder une publicité pour jouer une saison de plus</button><div className="button-row"><button className="quiet-button" onClick={retireNow}>Prendre ma retraite</button></div>{adNotice && <p className="notice">{adNotice}</p>}</>}
          {screen === "over" && cardData && <><p className="eyebrow">Le dernier coup de sifflet</p><h1 className="question">Voilà ce qu’il reste de ta carrière.</h1><div className="card-wrap" ref={cardRef}><LegacyCard data={cardData} /></div><div className="button-row"><button className="primary-button share-button" onClick={() => void exclusiveAction(onShare)}>{shareState === "working" ? "Préparation…" : shareState === "shared" ? "Partage ouvert ✓" : shareState === "downloaded" ? "Image téléchargée ✓" : "Partager cette carrière"}</button><button className="quiet-button" onClick={restart}>Rejouer</button></div>{shareState === "error" && <p className="notice">L’export a échoué. Une capture d’écran fonctionne aussi.</p>}</>}
        </div></section>
        <div className="dossier-column"><PlayerDossier state={state} name={name} number={number} selection={selection} football={football} /><p className="save-status">{saveStatus === "saving" ? "Sauvegarde…" : saveStatus === "saved" ? "✓ Sauvegardé dans ton compte" : saveStatus === "local" ? "✓ Sauvegardé sur cet appareil" : saveStatus === "error" ? "Sauvegarde cloud à réessayer" : user ? "Compte connecté" : "Mode découverte"}</p></div>
      </div>
      </>}
    </AppFrame>
  );
}

function AppFrame({ children, user, busy = false, view = "game", onViewChange, onSignOut }: { children: ReactNode; user: User | null; busy?: boolean; view?: AppView; onViewChange?: (view: AppView) => void; onSignOut?: () => void }) {
  return <fieldset disabled={busy} aria-busy={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><main className="app-shell"><header className="topbar"><div className="brand"><span className="brand-mark">A</span><span className="brand-name">Ascension</span></div>{onViewChange ? <nav className="app-nav" aria-label="Navigation principale"><button className={view === "game" ? "active" : ""} onClick={() => onViewChange("game")}>Jouer</button><button className={view === "world" ? "active" : ""} onClick={() => onViewChange("world")}>Monde</button>{user ? <button className={view === "library" ? "active" : ""} onClick={() => onViewChange("library")}>Mes carrières</button> : null}</nav> : null}{user ? <button className="account-pill" onClick={onSignOut} title="Se déconnecter">{user.email}</button> : <span className="account-pill">Carrière narrative</span>}</header>{children}</main></fieldset>;
}

function AuthGate({ configured, onDemo, onSubmit }: { configured: boolean; onDemo: () => void; onSubmit: (email: string, marketingConsent: boolean) => Promise<string | null> }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setStatus("sending"); setMessage("");
    const error = await onSubmit(email.trim(), consent);
    if (error) { setStatus("idle"); setMessage(error); return; }
    setStatus("sent"); setMessage("Le lien de connexion est parti. Ouvre-le sur cet appareil pour retrouver ta carrière.");
  }
  return <div className="auth-wrap"><section className="auth-card"><p className="eyebrow">Ton vestiaire personnel</p><h1>Ta carrière<br />te suit.</h1><p>Entre ton e-mail pour sauvegarder tes choix et reprendre sur n’importe quel appareil. Aucun mot de passe.</p><form onSubmit={submit}><div className="form-field"><label htmlFor="email">Adresse e-mail</label><input id="email" className="text-input" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="toi@exemple.fr" /></div><label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Je souhaite recevoir les nouveautés d’Ascension. Facultatif — le compte et la sauvegarde fonctionnent sans ce consentement.</span></label><button className="primary-button" disabled={!configured || status !== "idle"}>{status === "sending" ? "Envoi…" : status === "sent" ? "E-mail envoyé" : "Recevoir mon lien"}</button></form>{message && <p className="notice">{message}</p>}<div className="button-row"><button className="quiet-button" onClick={onDemo}>Explorer sans sauvegarde</button></div>{!configured && <p className="notice">La connexion Supabase doit encore être ajoutée à cet environnement de déploiement.</p>}</section></div>;
}

function statDeltas(before: Record<string, number>, after: Record<string, number>) {
  return Object.fromEntries(Object.keys(after).map((key) => [key, after[key] - (before[key] ?? 0)]).filter(([, value]) => value !== 0));
}
function readLocalSave(): CareerSave | null {
  try { return parseCareerSave(JSON.parse(window.localStorage.getItem(LOCAL_SAVE_KEY) ?? "null")); } catch { return null; }
}
function newestSave(first: CareerSave | null, second: CareerSave | null): CareerSave | null {
  if (!first) return second;
  if (!second) return first;
  return Date.parse(first.savedAt) >= Date.parse(second.savedAt) ? first : second;
}

function pendingKind(step: NextStep): PendingStepKind {
  return step.kind === "event" ? "event" : step.kind === "retirement_offer" ? "retirement" : "over";
}

function pendingEventId(step: NextStep): string | null {
  return step.kind === "event" ? step.event.id : null;
}

function restorePendingStep(kind: PendingStepKind | undefined, eventId: string | null, state: CareerState, pool: ReturnType<typeof getEventPool>): NextStep | null {
  if (kind === "retirement") return { kind: "retirement_offer" };
  if (kind === "over") return finishCareer(state);
  if (kind === "event" && eventId) {
    const event = pool.find((item) => item.id === eventId);
    if (!event) return null;
    const choices = event.kind === "outcome" ? resolveOutcomeBranch(state, event) : eligibleChoices(state, event);
    return { kind: "event", event, choices };
  }
  return null;
}
