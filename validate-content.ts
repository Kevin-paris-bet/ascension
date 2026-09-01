import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EventSchema, ContentPackSchema, type Event } from "../engine/schema.js";

type Issue = { level: "ERREUR" | "ALERTE"; code: string; message: string };
const issues: Issue[] = [];
const fail = (code: string, message: string) => issues.push({ level: "ERREUR", code, message });
const warn = (code: string, message: string) => issues.push({ level: "ALERTE", code, message });

const packDir = process.argv[2] ?? "content/fr-football";
const eventsDir = join(packDir, "events");

/* ---------- 1. Chargement et validation de schéma ---------- */

const events: Event[] = [];
for (const file of readdirSync(eventsDir).filter((f) => f.endsWith(".json"))) {
  const raw = JSON.parse(readFileSync(join(eventsDir, file), "utf8"));
  const parsed = EventSchema.safeParse(raw);
  if (!parsed.success) {
    for (const e of parsed.error.issues) {
      fail("SCHEMA", `${file} → ${e.path.join(".")} : ${e.message}`);
    }
    continue;
  }
  events.push(parsed.data);
}

const packRaw = JSON.parse(readFileSync(join(packDir, "pack.json"), "utf8"));
const packParsed = ContentPackSchema.safeParse(packRaw);
if (!packParsed.success) {
  for (const e of packParsed.error.issues) fail("SCHEMA", `pack.json → ${e.path.join(".")} : ${e.message}`);
}
const pack = packParsed.success ? packParsed.data : { callbacks: [] as any[] };

/* ---------- 2. Unicité des identifiants ---------- */

const seen = new Set<string>();
for (const e of events) {
  if (seen.has(e.id)) fail("ID_DOUBLON", `événement '${e.id}' défini deux fois`);
  seen.add(e.id);
  const choiceIds = new Set<string>();
  for (const c of e.choices) {
    if (choiceIds.has(c.id)) fail("ID_DOUBLON", `${e.id} : choix '${c.id}' défini deux fois`);
    choiceIds.add(c.id);
  }
}

/* ---------- 3. Index des threads : posés / requis / résolus ---------- */

const threadPosedAt = new Map<string, number>();
const threadPosedBy = new Map<string, string[]>();
const threadRequired = new Map<string, { event: string; age: number }[]>();
const threadResolved = new Set<string>();

const noteRequirement = (t: string, event: string, age: number) => {
  if (!threadRequired.has(t)) threadRequired.set(t, []);
  threadRequired.get(t)!.push({ event, age });
};

for (const e of events) {
  const [minAge, maxAge] = e.ageWindow;

  for (const t of e.requires?.threads ?? []) noteRequirement(t, e.id, minAge);
  for (const t of Object.keys(e.requires?.threadLevel ?? {})) noteRequirement(t, e.id, minAge);
  for (const t of e.requires?.threadsAbsent ?? []) noteRequirement(t, e.id, minAge);

  for (const c of e.choices) {
    for (const t of c.requires?.threads ?? []) noteRequirement(t, `${e.id}.${c.id}`, minAge);
    for (const t of Object.keys(c.requires?.threadLevel ?? {})) noteRequirement(t, `${e.id}.${c.id}`, minAge);

    const allEffects = [c.effects, c.resolution?.onSuccess, c.resolution?.onFailure].filter(Boolean) as any[];
    for (const eff of allEffects) {
      for (const t of eff.threads ?? []) {
        const prev = threadPosedAt.get(t);
        if (prev === undefined || maxAge < prev) threadPosedAt.set(t, maxAge);
        if (!threadPosedBy.has(t)) threadPosedBy.set(t, []);
        threadPosedBy.get(t)!.push(e.id);
      }
      for (const t of Object.keys(eff.threadIncrement ?? {})) {
        const prev = threadPosedAt.get(t);
        if (prev === undefined || maxAge < prev) threadPosedAt.set(t, maxAge);
        if (!threadPosedBy.has(t)) threadPosedBy.set(t, []);
        threadPosedBy.get(t)!.push(e.id);
      }
      for (const t of eff.threadsResolve ?? []) threadResolved.add(t);
    }
  }
}

/* ---------- 4. Séquençage : un thread requis doit pouvoir être posé AVANT ---------- */

for (const [thread, usages] of threadRequired) {
  const posedAt = threadPosedAt.get(thread);

  if (posedAt === undefined) {
    warn("THREAD_INCONNU", `thread '${thread}' requis par ${usages.map((u) => u.event).join(", ")} mais posé par aucun événement (vient-il de la création ?)`);
    continue;
  }

  for (const u of usages) {
    if (u.age < posedAt) {
      fail(
        "SEQUENCAGE",
        `'${u.event}' (âge ${u.age}) requiert le thread '${thread}', qui ne peut être posé qu'à partir de ${posedAt} ans. Le choix est inatteignable.`
      );
    }
  }
}

/* ---------- 5. Callbacks obligatoires : ouverts ET résolvables ---------- */

for (const cb of pack.callbacks ?? []) {
  if (!cb.mandatory) continue;

  const posedBy = threadPosedBy.get(cb.thread) ?? [];
  if (posedBy.length === 0) {
    fail("CALLBACK_ORPHELIN", `callback '${cb.thread}' déclaré obligatoire mais aucun événement ne le pose`);
    continue;
  }
  for (const declared of cb.openedBy) {
    if (!events.find((e) => e.id === declared)) {
      warn("CALLBACK_SOURCE", `callback '${cb.thread}' : l'événement source '${declared}' n'existe pas encore`);
    }
  }

  const resolvers = events.filter((e) => e.resolvesCallback === cb.thread);
  if (resolvers.length === 0) {
    fail("CALLBACK_NON_RESOLU", `callback obligatoire '${cb.thread}' n'a aucun événement de résolution. Promesse narrative non tenue.`);
    continue;
  }
  const inWindow = resolvers.some(
    (r) => r.ageWindow[0] <= cb.windowAge[1] && r.ageWindow[1] >= cb.windowAge[0]
  );
  if (!inWindow) {
    fail(
      "CALLBACK_FENETRE",
      `callback '${cb.thread}' : la fenêtre déclarée [${cb.windowAge}] ne recoupe aucun résolveur (${resolvers.map((r) => `${r.id}[${r.ageWindow}]`).join(", ")})`
    );
  }

  for (const r of resolvers) {
    const branchesResolving = r.choices.filter((c) => {
      const effs = [c.effects, c.resolution?.onSuccess, c.resolution?.onFailure].filter(Boolean) as any[];
      return effs.some((eff) => (eff.threadsResolve ?? []).includes(cb.thread));
    });
    if (branchesResolving.length !== r.choices.length) {
      const manquants = r.choices.filter((c) => !branchesResolving.includes(c)).map((c) => c.id);
      fail(
        "CALLBACK_BRANCHE",
        `${r.id} résout '${cb.thread}' mais les branches [${manquants.join(", ")}] ne le libèrent pas. Le callback pourrait se redéclencher.`
      );
    }
  }
}

/* ---------- 6. Threads posés mais jamais utilisés ---------- */

for (const [thread, posedBy] of threadPosedBy) {
  const used = threadRequired.has(thread) || threadResolved.has(thread);
  const declaredCallback = (pack.callbacks ?? []).some((c: any) => c.thread === thread);
  if (!used && !declaredCallback) {
    warn("THREAD_ORPHELIN", `thread '${thread}' posé par ${[...new Set(posedBy)].join(", ")} mais jamais lu. Contenu mort ?`);
  }
}

/* ---------- 7. Règles de présentation ---------- */

for (const e of events) {
  const conditionnels = e.choices.filter((c) => c.requires);
  if (e.choices.length > 8) {
    warn("ECRAN_CHARGE", `${e.id} : ${e.choices.length} choix définis. Le moteur n'en affichera que 6 maximum.`);
  }
  const rewarded = e.choices.filter((c) => c.rewarded);
  if (rewarded.length > 1) fail("REWARDED", `${e.id} : plus d'un emplacement rewarded sur le même écran`);
  if (e.act === 3 && e.weight === 0) {
    fail("POIDS", `${e.id} : événement d'acte 3 avec weight 0, il ne sera jamais tiré`);
  }
  if (e.act !== 3 && conditionnels.length > 4) {
    warn("CONDITIONNELS", `${e.id} : ${conditionnels.length} choix conditionnels, la règle de priorité en écartera`);
  }
}

/* ---------- Rapport ---------- */

const erreurs = issues.filter((i) => i.level === "ERREUR");
const alertes = issues.filter((i) => i.level === "ALERTE");

console.log(`\n  Ascension — validation du pack « ${packDir} »`);
console.log(`  ${events.length} événements, ${events.reduce((n, e) => n + e.choices.length, 0)} branches, ${(pack.callbacks ?? []).length} callbacks déclarés\n`);

for (const i of issues) {
  const tag = i.level === "ERREUR" ? "  ✗" : "  !";
  console.log(`${tag} [${i.code}] ${i.message}`);
}

if (issues.length === 0) console.log("  ✓ aucun problème détecté");

console.log(`\n  ${erreurs.length} erreur(s), ${alertes.length} alerte(s)\n`);
process.exit(erreurs.length > 0 ? 1 : 0);
