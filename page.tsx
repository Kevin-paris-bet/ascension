"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import {
  createCareer,
  findNextStep,
  pickChoice,
  getEventPool,
  getConfig,
  type NextStep,
} from "@/lib/engineBridge";
import type { CareerState } from "@/engine/state";
import type { Rng } from "@/engine/rng";

type Screen = "creation" | "playing" | "outcome" | "over";

export default function Page() {
  const config = useMemo(() => getConfig(), []);
  const pool = useMemo(() => getEventPool(), []);

  const [screen, setScreen] = useState<Screen>("creation");
  const [origin, setOrigin] = useState<string>(config.creation.origines[0].id);
  const [step, setStep] = useState<NextStep | null>(null);
  const [lastOutcome, setLastOutcome] = useState<string>("");
  const [lastSuccess, setLastSuccess] = useState<boolean | undefined>(undefined);

  const stateRef = useRef<CareerState | null>(null);
  const rngRef = useRef<Rng | null>(null);

  function startCareer() {
    const { state, rng } = createCareer({ origin });
    stateRef.current = state;
    rngRef.current = rng;
    advance(state, rng);
  }

  function advance(state: CareerState, rng: Rng) {
    const { step: nextStep, state: settledState } = findNextStep(state, pool, rng);
    stateRef.current = settledState;
    setStep(nextStep);
    setScreen(nextStep.kind === "over" ? "over" : "playing");
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

  function continueAfterOutcome() {
    if (!stateRef.current || !rngRef.current) return;
    advance(stateRef.current, rngRef.current);
  }

  function restart() {
    stateRef.current = null;
    rngRef.current = null;
    setStep(null);
    setScreen("creation");
  }

  return (
    <main>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Ascension</h1>
      <p style={{ opacity: 0.6, fontSize: 13, marginTop: 0, marginBottom: 24 }}>
        Prototype moteur — {pool.length} événements de référence chargés
      </p>

      {screen === "creation" && (
        <div>
          <p>D'où viens-tu ?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {config.creation.origines.map((o) => (
              <label key={o.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name="origin"
                  checked={origin === o.id}
                  onChange={() => setOrigin(o.id)}
                />
                {o.label}
              </label>
            ))}
          </div>
          <button onClick={startCareer} style={primaryButtonStyle}>
            Commencer la carrière
          </button>
        </div>
      )}

      {screen === "playing" && step?.kind === "event" && (
        <div>
          <p style={{ opacity: 0.6, fontSize: 13 }}>
            {stateRef.current?.age} ans — Acte {step.event.act}
          </p>
          <p style={{ whiteSpace: "pre-line", lineHeight: 1.5 }}>{step.event.prompt}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            {step.choices.map((c) => (
              <button key={c.id} onClick={() => choose(c.id)} style={choiceButtonStyle}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === "outcome" && (
        <div>
          <p style={{ whiteSpace: "pre-line", lineHeight: 1.5, fontStyle: "italic" }}>
            {lastOutcome}
            {lastSuccess !== undefined ? (lastSuccess ? "  ✓" : "  ✗") : ""}
          </p>
          <button onClick={continueAfterOutcome} style={primaryButtonStyle}>
            Continuer
          </button>
        </div>
      )}

      {screen === "over" && step?.kind === "over" && (
        <div>
          <h2>Fin de carrière</h2>
          <p style={{ fontSize: 32, fontWeight: 700, margin: "8px 0" }}>
            {step.legacy.note} / {stateRef.current?.cap}
          </p>
          <p style={{ opacity: 0.8 }}>{step.legacy.tier}</p>
          <p style={{ whiteSpace: "pre-line", fontStyle: "italic", marginTop: 16 }}>
            « {step.legacy.quote} »
          </p>
          <button onClick={restart} style={{ ...primaryButtonStyle, marginTop: 24 }}>
            Rejouer
          </button>
        </div>
      )}
    </main>
  );
}

const primaryButtonStyle: CSSProperties = {
  background: "#e63946",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "12px 20px",
  fontSize: 15,
  fontWeight: 600,
};

const choiceButtonStyle: CSSProperties = {
  background: "#1c1c22",
  color: "#f2f2f2",
  border: "1px solid #2e2e36",
  borderRadius: 8,
  padding: "12px 16px",
  fontSize: 14,
  textAlign: "left",
};
