import { z } from "zod";

/**
 * Schéma agnostique. Aucun vocabulaire sportif ici.
 * Le moteur ne connaît que : Stat, Thread, Event, Choice, Milestone, Org, Competition.
 * Le vocabulaire d'affichage vient de config.json du pack de contenu.
 */

const ID = z.string().regex(/^[a-z0-9_:]+$/, "id en snake_case, ':' autorisé pour les namespaces");

/* ---------- Comparateurs ---------- */

export const ComparisonSchema = z.tuple([
  z.enum([">=", "<=", ">", "<", "=="]),
  z.number(),
]);

/* ---------- Préconditions ---------- */

export const RequiresSchema = z
  .object({
    age: z.tuple([z.number().int(), z.number().int()]).optional(),
    /** Seuils sur les stats, ex. { mental: [">=", 60] } */
    stats: z.record(ID, ComparisonSchema).optional(),
    /** Threads qui doivent être présents */
    threads: z.array(ID).optional(),
    /** Threads qui doivent être absents */
    threadsAbsent: z.array(ID).optional(),
    /** Seuil sur un thread cumulatif, ex. { corps_sacrifie: [">=", 4] } */
    threadLevel: z.record(ID, ComparisonSchema).optional(),
    /** Nombre minimum de saisons écoulées depuis la pose d'un thread */
    seasonsSinceThread: z.record(ID, ComparisonSchema).optional(),
    /** Le joueur doit appartenir à une Org d'un tier donné */
    orgTier: ComparisonSchema.optional(),
  })
  .strict();

/* ---------- Effets ---------- */

export const EffectsSchema = z
  .object({
    stats: z.record(ID, z.number()).optional(),
    /** Threads posés */
    threads: z.array(ID).optional(),
    /** Threads incrémentés (cumulatifs, ex. corps_sacrifie) */
    threadIncrement: z.record(ID, z.number().int()).optional(),
    /** Threads retirés (résolution d'un callback) */
    threadsResolve: z.array(ID).optional(),
    /** Événements rendus accessibles */
    unlocks: z.array(ID).optional(),
    /** Événements bloqués pendant lockDuration saisons */
    locks: z.array(ID).optional(),
    lockDuration: z.number().int().min(1).optional(),
    /** Modification du plafond de progression */
    capDelta: z.number().optional(),
  })
  .strict();

/* ---------- Résolution à variance ---------- */

export const ResolutionSchema = z
  .object({
    /** Stat qui module la probabilité. null = coup de dés pur (ex. pari contractuel) */
    pilot: ID.nullable(),
    /** Probabilité de base en pourcentage */
    pBase: z.number().min(0).max(100),
    onSuccess: EffectsSchema,
    onFailure: EffectsSchema,
    textSuccess: z.string().min(1),
    textFailure: z.string().min(1),
  })
  .strict();

/* ---------- Choix ---------- */

export const ChoiceSchema = z
  .object({
    id: ID,
    label: z.string().min(1),
    /** Texte de conséquence affiché après sélection */
    outcome: z.string().min(1),
    /** Si présent, le choix est conditionnel (n'apparaît pas toujours) */
    requires: RequiresSchema.optional(),
    /** Effets déterministes. Exclusif avec resolution. */
    effects: EffectsSchema.optional(),
    /** Résolution probabiliste. Exclusif avec effects. */
    resolution: ResolutionSchema.optional(),
    /** Retire le contrôle au joueur : choix affiché mais imposé */
    forced: z.boolean().optional(),
    /** Emplacement rewarded opt-in */
    rewarded: z.boolean().optional(),
  })
  .strict()
  .refine((c) => !!c.effects !== !!c.resolution, {
    message: "un choix porte soit 'effects', soit 'resolution', jamais les deux ni aucun",
  });

/* ---------- Événement ---------- */

export const EventSchema = z
  .object({
    id: ID,
    act: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    /** Poids de tirage. Ignoré pour les événements linéaires (actes 1 et 2). */
    weight: z.number().int().min(0).default(10),
    category: z.enum(["core", "offstage"]),
    /** Thématique, pilote le cooldown */
    theme: z.string().optional(),
    ageWindow: z.tuple([z.number().int(), z.number().int()]),
    requires: RequiresSchema.optional(),
    excludes: z.array(ID).optional(),
    /** Une seule fois par carrière */
    once: z.boolean().default(true),
    /** Résout un callback obligatoire posé ailleurs */
    resolvesCallback: ID.optional(),
    prompt: z.string().min(1),
    choices: z.array(ChoiceSchema).min(2),
  })
  .strict()
  .refine((e) => e.ageWindow[0] <= e.ageWindow[1], {
    message: "ageWindow doit être croissante",
  })
  .refine(
    (e) => e.choices.filter((c) => !c.requires).length >= 2,
    { message: "au moins 2 choix de base (sans requires) par événement" }
  )
  .refine(
    (e) => e.choices.filter((c) => !c.requires).length <= 4,
    { message: "maximum 4 choix de base par événement" }
  );

export type Event = z.infer<typeof EventSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type Requires = z.infer<typeof RequiresSchema>;
export type Effects = z.infer<typeof EffectsSchema>;
export type Resolution = z.infer<typeof ResolutionSchema>;

/* ---------- Déclaration des callbacks obligatoires ---------- */

export const CallbackContractSchema = z
  .object({
    thread: ID,
    /** Où le thread est posé */
    openedBy: z.array(ID).min(1),
    /** Fenêtre d'âge dans laquelle la résolution doit pouvoir tomber */
    windowAge: z.tuple([z.number().int(), z.number().int()]),
    mandatory: z.boolean().default(true),
  })
  .strict();

export const ContentPackSchema = z
  .object({
    id: z.string(),
    locale: z.string(),
    callbacks: z.array(CallbackContractSchema),
  })
  .strict();

export type CallbackContract = z.infer<typeof CallbackContractSchema>;
export type ContentPack = z.infer<typeof ContentPackSchema>;
