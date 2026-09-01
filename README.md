# Ascension — moteur (semaine 1)

Moteur de simulation de carrière, agnostique du sport (section 8 des specs).
Aucun fichier de `/engine` ne contient de vocabulaire sportif.

## Structure

```
engine/
  schema.ts       schéma Zod agnostique (Event, Choice, Requires, Effects, Resolution)
  rng.ts          PRNG déterministe par seed (mulberry32 + xmur3)
  state.ts        machine à états de carrière (CareerState)
  resolver.ts     sélection d'événement et de choix selon préconditions
  progression.ts  application des effets, résolution probabiliste
  legacy.ts       note finale, tier, citation de la carte
  index.ts        exports groupés

content/fr-football/
  events/*.json   3 événements de référence (validés, testés)
  pack.json       manifeste des callbacks obligatoires

scripts/
  validate-content.ts   validateur de contenu (casse le build, jamais le runtime)
  smoke-test.ts         test de bout en bout du moteur
```

## Commandes

```bash
npm install
npm run typecheck   # npx tsc --noEmit — obligatoire avant chaque push
npm run validate     # valide le pack de contenu fr-football
npm run test         # test de fumée : resolver + progression + callbacks + legacy
```

## État actuel

- ✅ Moteur complet et testé (resolver, progression, résolution probabiliste, locks/unlocks, callbacks, legacy)
- ✅ Schéma Zod + validateur (récupérés d'une session précédente, déjà éprouvés sur 46 événements)
- ⚠️ Seuls 3 événements de référence sont présents ici. Le contenu complet (43 carrefours, 242 branches, 13 callbacks) a été écrit dans une session précédente mais doit être reconverti en JSON et repoussé dans ce repo — c'est la prochaine étape (semaine 2 de la roadmap).
- ⏳ Pas encore de `config.json` (vocabulaire d'affichage, stats, postes — section 8)
- ⏳ Pas encore d'UI Next.js

## Résolution probabiliste

`P = pBase + (stat − 50) × 0,6`, bornée [8, 92]. Sans pilote (`pilot: null`), pBase seul s'applique.

## Déterminisme

Toute la carrière est reproductible : même seed + mêmes choix → même résultat. C'est le prérequis du défi du jour (section 9.4 / 12).
