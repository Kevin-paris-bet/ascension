import type { CareerState, HistoryEntry } from "./state";

export type LegacyTierDefinition = {
  /** Note minimale (inclusive) pour atteindre ce tier */
  min: number;
  label: string;
};

export type LegacyConfig = {
  /** Poids de chaque stat dans le calcul de la note, ex. { technique: 1, mental: 0.8 } */
  statWeights: Record<string, number>;
  /** Tiers triés par `min` décroissant en sortie de `resolveTier`, mais peuvent être fournis dans n'importe quel ordre */
  tiers: LegacyTierDefinition[];
};

export type LegacyResult = {
  note: number;
  tier: string;
  /** Citation retenue pour la carte finale (section 11) */
  quote: string;
  quoteSourceEventId: string | null;
};

/**
 * Note dérivée, jamais saisie (règle section 10.3). Moyenne pondérée des
 * stats, plafonnée au `cap` courant de l'état (modifiable en jeu via
 * `capDelta`, lui-même initialisé depuis le pack de contenu — le plafond à
 * 96 de la V1 football est une donnée de config, pas une constante moteur).
 */
export function computeNote(state: CareerState, statWeights: LegacyConfig["statWeights"]): number {
  const entries = Object.entries(statWeights);
  if (entries.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const [stat, weight] of entries) {
    const value = state.stats[stat] ?? 0;
    weightedSum += value * weight;
    totalWeight += weight;
  }
  const raw = totalWeight > 0 ? weightedSum / totalWeight : 0;
  return Math.max(0, Math.min(state.cap, Math.round(raw)));
}

export function resolveTier(note: number, tiers: LegacyTierDefinition[]): string {
  const sorted = [...tiers].sort((a, b) => b.min - a.min);
  for (const tier of sorted) {
    if (note >= tier.min) return tier.label;
  }
  return sorted.length > 0 ? sorted[sorted.length - 1].label : "—";
}

/**
 * Sélection de la citation de fin de carrière. Heuristique v1 : on privilégie
 * les entrées d'historique issues d'une résolution à variance (elles portent
 * plus de tension dramatique que les choix déterministes), en partant de la
 * plus récente. À défaut, le dernier événement joué.
 *
 * Amélioration possible pour la V1.5+ : ajouter un flag `memorable: true` au
 * niveau de l'événement dans le contenu, pour laisser l'auteur désigner
 * explicitement les moments-clés plutôt que de le déduire.
 */
export function pickLegacyQuote(history: HistoryEntry[]): { quote: string; eventId: string | null } {
  if (history.length === 0) return { quote: "", eventId: null };

  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (entry.resolvedSuccess !== undefined) {
      return { quote: entry.outcomeText, eventId: entry.eventId };
    }
  }

  const last = history[history.length - 1];
  return { quote: last.outcomeText, eventId: last.eventId };
}

export function computeLegacy(state: CareerState, config: LegacyConfig): LegacyResult {
  const note = computeNote(state, config.statWeights);
  const tier = resolveTier(note, config.tiers);
  const { quote, eventId } = pickLegacyQuote(state.history);
  return { note, tier, quote, quoteSourceEventId: eventId };
}
