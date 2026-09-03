"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import {
  createCareer,
  findNextStep,
  getConfig,
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

type Screen = "creation" | "identity" | "playing" | "outcome" | "retirement" | "over";
type SaveStatus = "idle" | "saving" | "saved" | "local" | "error";
const LOCAL_SAVE_KEY = "ascension:career:v1";
const PENDING_CONSENT_KEY = "ascension:pending-marketing-consent";

export function GameApp() {
  const config = useMemo(() => getConfig(), []);
  const pool = useMemo(() => getEventPool(), []);
  const steps = useMemo(() => getCreationSteps().filter((item) => item.kind === "choice"), []);
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
  const [shareState, setShareState] = useState<"idle" | "working" | "done" | "error">("idle");

  const stateRef = useRef<CareerState | null>(null);
  const rngRef = useRef<Rng | null>(null);
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

  function chooseCreation(stepId: string, optionId: string) {
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
    stateRef.current = created.state;
    setCareerState(created.state);
    rngRef.current = created.rng;
    setName(identity.name);
    setNumber(String(identity.number));
    if (supabase && user) void supabase.from("profiles").update({ display_name: identity.name }).eq("id", user.id);
    advance(created.state, created.rng, identity);
  }

  function advance(state: CareerState, rng: Rng, identity = currentIdentity()) {
    const result = findNextStep(state, pool, rng);
    const settled = { ...result.state, rngState: rng.getState() };
    stateRef.current = settled;
    setCareerState(settled);
    setStep(result.step);
    setAdNotice("");

    if (result.step.kind === "retirement_offer") {
      setScreen("retirement");
      persist(settled, rng, "retirement", null, identity, "", undefined, {});
      return;
    }

    if (result.step.kind === "over") {
      const card = buildLegacyCard(settled, result.step.legacy, identity);
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
    persist(settled, rng, "playing", result.step.event.id, identity, "", undefined, {});
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
    persist(next, rngRef.current, "outcome", step.event.id, currentIdentity(), result.outcomeText, result.resolvedSuccess, deltas);
  }

  async function choose(choiceId: string) {
    if (!step || step.kind !== "event") return;
    const choice = step.choices.find((item) => item.id === choiceId);
    if (!choice) return;

    if (choice.rewarded) {
      setAdNotice("Préparation de la seconde chance…");
      const result = await requestRewardedAd({
        reason: step.event.id.includes("blessure") ? "injury_recovery" : "career_extension",
        rewardLabel: choice.label,
      });
      if (result !== "completed") {
        setAdNotice(result === "unavailable"
          ? "La régie publicitaire n’est pas encore branchée sur cette version web. Aucune récompense n’a été accordée."
          : "La publicité n’a pas été terminée : la récompense reste verrouillée.");
        return;
      }
    }
    applySelectedChoice(choice);
  }

  function continueAfter() {
    if (stateRef.current && rngRef.current) advance(stateRef.current, rngRef.current);
  }

  async function extendCareer() {
    if (!stateRef.current || !rngRef.current) return;
    setAdNotice("Préparation de la seconde chance…");
    const result = await requestRewardedAd({ reason: "career_extension", rewardLabel: "Une saison supplémentaire" });
    if (result !== "completed") {
      setAdNotice(result === "unavailable" ? "La régie publicitaire n’est pas encore branchée. Tu peux terminer ta carrière normalement." : "La publicité n’a pas été terminée : la saison supplémentaire reste verrouillée.");
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
    const card = buildLegacyCard(stateRef.current, final.legacy, identity);
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
    setStep(null);
    setScreen("outcome");
    setResumeSave(null);
  }

  async function onShare() {
    const svg = cardRef.current?.querySelector("svg");
    if (!svg || !cardData) return;
    setShareState("working");
    try {
      await shareCard(svg as SVGSVGElement, cardData.name);
      setShareState("done");
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
    setScreen("creation");
  }

  function persist(state: CareerState, rng: Rng, savedScreen: "playing" | "outcome" | "retirement", eventId: string | null, identity: CareerIdentity, outcome: string, success: boolean | undefined, deltas: Record<string, number>) {
    const payload = createCareerSave({ screen: savedScreen, identity, selection, state, rngState: rng.getState(), eventId, lastOutcome: outcome, lastSuccess: success, lastDeltas: deltas });
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
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin, data: { marketing_consent: marketingConsent } } });
      if (!error) window.localStorage.setItem(PENDING_CONSENT_KEY, String(marketingConsent));
      return error ? error.message : null;
    }} /></AppFrame>;
  }

  const current = steps[stepIndex];
  const state = careerState;
  const visibleStats = config.stats.visible.filter((item) => item.id !== "compte").slice(0, 4);

  return (
    <AppFrame user={user} onSignOut={supabase && user ? () => void supabase.auth.signOut() : undefined}>
      {resumeSave && screen === "creation" && <div className="resume-card"><p>Une carrière de {resumeSave.identity.name} est disponible ({resumeSave.state.age} ans).</p><div className="button-row"><button className="primary-button" onClick={() => resumeCareer(resumeSave)}>Reprendre</button><button className="quiet-button" onClick={clearSave}>Nouvelle carrière</button></div></div>}
      <div className="game-layout">
        <section className="game-stage"><div className="stage-content">
          {screen === "creation" && current && <><div className="progress" aria-label={`Étape ${stepIndex + 1} sur ${steps.length}`}>{steps.map((item, index) => <span key={item.id} className={index <= stepIndex ? "active" : ""} />)}</div><p className="eyebrow">Crée ton histoire · {pool.length} événements</p><h1 className="display-title">Une carrière.<br />Tes choix.</h1><p className="lede">Pas de bonne réponse. Seulement des conséquences qui te suivront jusque dans le dernier vestiaire.</p><h2 className="question">{current.question}</h2><div className="choice-list two-columns">{(current.options ?? []).map((option) => <button className="choice-button" key={option.id} onClick={() => chooseCreation(current.id, option.id)}><strong>{option.label}</strong>{"flavor" in option && option.flavor ? <small>{option.flavor}</small> : null}</button>)}</div></>}
          {screen === "identity" && <><p className="eyebrow">Dernier détail avant le tunnel</p><h1 className="display-title">Quel nom<br />restera ?</h1><p className="lede">Ce nom apparaîtra dans ta bibliothèque et sur ta carte de fin de carrière.</p><div className="inline-fields"><div className="form-field"><label htmlFor="player-name">Nom du joueur</label><input id="player-name" className="text-input" value={name} onChange={(event) => setName(event.target.value.slice(0,22))} placeholder="K. Diallo" autoComplete="off" /></div><div className="form-field"><label htmlFor="player-number">Numéro</label><input id="player-number" className="text-input" value={number} onChange={(event) => setNumber(event.target.value.replace(/\D/g,"").slice(0,2))} inputMode="numeric" /></div></div><button className="primary-button" onClick={startCareer}>Entrer sur le terrain</button></>}
          {screen === "playing" && step?.kind === "event" && <><div className="event-meta"><span>{state?.age} ans · Acte {step.event.act}</span><span>Saison {Math.max(1,(state?.season ?? 0)+1)}</span></div><p className="eyebrow" style={{ marginTop: 34 }}>Le moment du choix</p><h1 className="question">{step.event.theme ?? "Ta carrière bascule"}</h1><p className="prompt">{step.event.prompt}</p><div className="choice-list">{step.choices.map((choice) => <button className={`choice-button${choice.rewarded ? " rewarded" : ""}`} key={choice.id} onClick={() => void choose(choice.id)}>{choice.label}</button>)}</div>{adNotice && <p className="notice">{adNotice}</p>}</>}
          {screen === "outcome" && <><p className="eyebrow">La conséquence</p><div className={`outcome-card${lastSuccess === false ? " failure" : ""}`}><p className="outcome-text">{lastOutcome}</p></div><div className="delta-row">{Object.entries(lastDeltas).map(([statName, delta]) => <span className={`delta-chip${delta < 0 ? " negative" : ""}`} key={statName}>{statName} {delta > 0 ? "+" : ""}{delta}</span>)}</div><button className="primary-button" onClick={continueAfter}>Saison suivante</button></>}
          {screen === "retirement" && <><p className="eyebrow">Le corps décide</p><h1 className="display-title">Encore une<br />saison ?</h1><p className="prompt">À {state?.age} ans, ton entourage pense que le moment est venu. Tu peux quitter le terrain maintenant, ou demander une dernière chance.</p><button className="choice-button rewarded" onClick={() => void extendCareer()}>Regarder une publicité pour jouer une saison de plus</button><div className="button-row"><button className="quiet-button" onClick={retireNow}>Prendre ma retraite</button></div>{adNotice && <p className="notice">{adNotice}</p>}</>}
          {screen === "over" && cardData && <><p className="eyebrow">Le dernier coup de sifflet</p><h1 className="question">Voilà ce qu’il reste de ta carrière.</h1><div className="card-wrap" ref={cardRef}><LegacyCard data={cardData} /></div><div className="button-row"><button className="primary-button" onClick={onShare}>{shareState === "working" ? "Préparation…" : shareState === "done" ? "Carte partagée" : "Partager ma légende"}</button><button className="quiet-button" onClick={restart}>Rejouer</button></div>{shareState === "error" && <p className="notice">L’export a échoué. Une capture d’écran fonctionne aussi.</p>}</>}
        </div></section>
        <aside className={`side-panel${state ? " compact" : ""}`}><p className="panel-title">Dossier du joueur</p><div className="stat-grid">{visibleStats.map((item) => <div className="stat" key={item.id}><span className="stat-label">{item.label}</span><span className="stat-value">{state?.stats[item.id] ?? "—"}</span></div>)}</div><p className="save-status">{saveStatus === "saving" ? "Sauvegarde…" : saveStatus === "saved" ? "Sauvegardé dans ton compte" : saveStatus === "local" ? "Sauvegardé sur cet appareil" : saveStatus === "error" ? "Sauvegarde cloud à réessayer" : user ? "Compte connecté" : "Mode découverte"}</p></aside>
      </div>
    </AppFrame>
  );
}

function AppFrame({ children, user, onSignOut }: { children: ReactNode; user: User | null; onSignOut?: () => void }) {
  return <main className="app-shell"><header className="topbar"><div className="brand"><span className="brand-mark">A</span><span className="brand-name">Ascension</span></div>{user ? <button className="account-pill" onClick={onSignOut} title="Se déconnecter">{user.email}</button> : <span className="account-pill">Carrière narrative</span>}</header>{children}</main>;
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
