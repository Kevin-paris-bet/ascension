"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import {
  createCareer,
  findNextStep,
  pickChoice,
  getEventPool,
  getConfig,
  getCreationSteps,
  type NextStep,
  type CreationSelection,
} from "@/lib/engineBridge";
import { buildLegacyCard, type CareerIdentity, type LegacyCardData } from "@/lib/legacyCard";
import { LegacyCard } from "@/app/components/LegacyCard";
import { shareCard } from "@/lib/shareCard";
import type { CareerState } from "@/engine/state";
import type { Rng } from "@/engine/rng";

type Screen = "creation" | "identity" | "playing" | "outcome" | "over";

export default function Page() {
  const config = useMemo(() => getConfig(), []);
  const pool = useMemo(() => getEventPool(), []);
  const steps = useMemo(() => getCreationSteps().filter((s) => s.kind === "choice"), []);

  const [screen, setScreen] = useState<Screen>("creation");
  const [stepIndex, setStepIndex] = useState(0);
  const [selection, setSelection] = useState<CreationSelection>({});
  const [name, setName] = useState("");
  const [number, setNumber] = useState("10");
  const [step, setStep] = useState<NextStep | null>(null);
  const [lastOutcome, setLastOutcome] = useState("");
  const [lastSuccess, setLastSuccess] = useState<boolean | undefined>(undefined);
  const [cardData, setCardData] = useState<LegacyCardData | null>(null);
  const [shareState, setShareState] = useState<"idle" | "working" | "done" | "error">("idle");

  const stateRef = useRef<CareerState | null>(null);
  const rngRef = useRef<Rng | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  function chooseCreation(stepId: string, optionId: string) {
    const next = { ...selection, [stepId]: optionId };
    setSelection(next);
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
    else setScreen("identity");
  }

  function startCareer() {
    const { state, rng } = createCareer(selection);
    stateRef.current = state;
    rngRef.current = rng;
    advance(state, rng);
  }

  function advance(state: CareerState, rng: Rng) {
    const { step: nextStep, state: settled } = findNextStep(state, pool, rng);
    stateRef.current = settled;
    setStep(nextStep);
    if (nextStep.kind === "over") {
      const identity: CareerIdentity = {
        name: name.trim() || "Sans Nom",
        number: Math.max(1, Math.min(99, parseInt(number, 10) || 10)),
      };
      setCardData(buildLegacyCard(settled, nextStep.legacy, identity));
      setScreen("over");
    } else {
      setScreen("playing");
    }
  }

  function choose(choiceId: string) {
    if (!step || step.kind !== "event" || !stateRef.current || !rngRef.current) return;
    const choice = step.choices.find((c) => c.id === choiceId);
    if (!choice) return;
    const result = pickChoice(stateRef.current, step.event, choice, rngRef.current);
    stateRef.current = result.state;
    setLastOutcome(result.outcomeText);
    setLastSuccess(result.resolvedSuccess);
    setScreen("outcome");
  }

  function continueAfter() {
    if (!stateRef.current || !rngRef.current) return;
    advance(stateRef.current, rngRef.current);
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
    stateRef.current = null;
    rngRef.current = null;
    setStep(null);
    setSelection({});
    setStepIndex(0);
    setCardData(null);
    setShareState("idle");
    setScreen("creation");
  }

  const current = steps[stepIndex];

  return (
    <main>
      <h1 style={{ fontSize: 20, marginBottom: 2, letterSpacing: 2 }}>ASCENSION</h1>
      <p style={{ opacity: 0.4, fontSize: 11, marginTop: 0, marginBottom: 28 }}>{pool.length} événements</p>

      {screen === "creation" && current && (
        <div>
          <p style={{ fontSize: 17, marginBottom: 16 }}>{current.question}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(current.options ?? []).map((o) => (
              <button key={o.id} onClick={() => chooseCreation(current.id, o.id)} style={choiceStyle}>
                <span style={{ fontWeight: 600 }}>{o.label}</span>
                {"flavor" in o && o.flavor ? (
                  <span style={{ display: "block", opacity: 0.5, fontSize: 13, marginTop: 4 }}>{o.flavor}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === "identity" && (
        <div>
          <p style={{ fontSize: 17, marginBottom: 16 }}>Ton nom et ton numéro.</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 22))}
            placeholder="Nom du joueur"
            style={inputStyle}
          />
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder="10"
            inputMode="numeric"
            style={{ ...inputStyle, width: 100 }}
          />
          <button onClick={startCareer} style={{ ...primaryStyle, marginTop: 16, display: "block" }}>
            Commencer
          </button>
        </div>
      )}

      {screen === "playing" && step?.kind === "event" && (
        <div>
          <p style={{ opacity: 0.45, fontSize: 12 }}>
            {stateRef.current?.age} ans · Acte {step.event.act}
          </p>
          <p style={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>{step.event.prompt}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
            {step.choices.map((c) => (
              <button key={c.id} onClick={() => choose(c.id)} style={c.rewarded ? rewardedStyle : choiceStyle}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === "outcome" && (
        <div>
          <p style={{ whiteSpace: "pre-line", lineHeight: 1.6, fontStyle: "italic", opacity: 0.9 }}>{lastOutcome}</p>
          {lastSuccess !== undefined && (
            <p style={{ fontSize: 12, opacity: 0.45 }}>{lastSuccess ? "Réussite" : "Échec"}</p>
          )}
          <button onClick={continueAfter} style={{ ...primaryStyle, marginTop: 12 }}>
            Continuer
          </button>
        </div>
      )}

      {screen === "over" && cardData && (
        <div>
          <div ref={cardRef} style={{ marginBottom: 16 }}>
            <LegacyCard data={cardData} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onShare} style={{ ...primaryStyle, flex: 1 }}>
              {shareState === "working" ? "…" : shareState === "done" ? "Partagé" : "Partager ma carte"}
            </button>
            <button onClick={restart} style={choiceStyle}>
              Rejouer
            </button>
          </div>
          {shareState === "error" && (
            <p style={{ color: "#e6a23a", fontSize: 13 }}>L&apos;export a échoué. Fais une capture d&apos;écran.</p>
          )}
        </div>
      )}
    </main>
  );
}

const primaryStyle: CSSProperties = {
  background: "#e63946",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "13px 20px",
  fontSize: 15,
  fontWeight: 600,
};

const choiceStyle: CSSProperties = {
  background: "#16161c",
  color: "#f2f2f2",
  border: "1px solid #2a2a33",
  borderRadius: 8,
  padding: "13px 16px",
  fontSize: 14,
  textAlign: "left",
  lineHeight: 1.4,
};

const rewardedStyle: CSSProperties = {
  ...choiceStyle,
  border: "1px solid #e6a23a",
  color: "#f0c674",
};

const inputStyle: CSSProperties = {
  background: "#16161c",
  color: "#f2f2f2",
  border: "1px solid #2a2a33",
  borderRadius: 8,
  padding: "12px 14px",
  fontSize: 15,
  marginBottom: 10,
  display: "block",
  width: "100%",
  maxWidth: 320,
};
