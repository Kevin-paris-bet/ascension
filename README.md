# Ascension

Simulateur de carrière sportive narratif. Moteur agnostique + pack de contenu `fr-football`.

**État : jouable de bout en bout, carte de partage incluse. 52 événements, 230 branches, 8 callbacks, 0 erreur, build production OK.**

## Ce qu'on peut faire aujourd'hui

Créer un joueur (origine, poste, don, perk), jouer une carrière complète de 14 ans à la retraite (~6,5 min), et obtenir une carte 9:16 exportable en PNG avec partage natif sur mobile.

## Structure

```
engine/              moteur agnostique — aucun vocabulaire sportif (section 8)
  schema.ts          schéma Zod
  rng.ts             PRNG déterministe par seed
  state.ts           machine à états
  resolver.ts        sélection selon préconditions (moteur de cohérence)
  progression.ts     effets, résolution probabiliste
  retirement.ts      fin de carrière, seuils pilotés par le pack
  legacy.ts          note, tier, citation

content/fr-football/
  config.json        stats, postes, paliers, retraite
  creation.json      5 origines, poste, don, perk rewarded
  card.json          palmarès, surnoms, libellés de la carte
  naming.json        clubs fictifs (12 pays), compétitions, trophées
  pack.json          8 callbacks obligatoires + 114 scoreThreads
  events/            52 événements + index.ts

lib/
  engineBridge.ts    pont moteur ↔ UI
  legacyCard.ts      dérivation des stats de carrière pour la carte
  shareCard.ts       export SVG → PNG, partage natif

app/
  page.tsx           boucle de jeu complète
  components/LegacyCard.tsx   la carte 9:16
  api/og/route.tsx   image OG serveur (aperçus de liens)

scripts/
  validate-content.ts  validateur (casse le build)
  smoke-test.ts        test unitaire du moteur
  playthrough.ts       300 carrières + intégrité des callbacks
  card-test.ts         200 cartes + plausibilité des stats
  render-card.tsx      rend une carte en SVG hors navigateur
```

## Commandes

```bash
npm install
npm run dev           # jouable sur localhost:3000
npm run typecheck     # avant chaque push
npm run validate      # 0 erreur attendu
npm run test          # smoke test moteur
npm run play          # 300 carrières, vérifie les callbacks
npm run card          # 200 cartes, vérifie les stats
npm run render-card <seed> "<nom>"   # écrit /tmp/card-<seed>.svg
```

## Résultats mesurés

| | |
|---|---|
| Durée d'une carrière | 48,5 écrans → **~6,5 min** (cible : 6 min 45) |
| Saisons professionnelles | min 0 · médiane 13 · max 18 |
| Callbacks tenus | 99,7 % sur 300 carrières |
| Déterminisme | carrière **et** carte reproductibles à la seed |
| Stats de carte aberrantes | 0 sur 200 |

## La carte (section 11)

Format 9:16, SVG → PNG côté client, partage natif mobile via `navigator.share`.
Les deux éléments non négociables sont en place : le **RANG DE LÉGENDE** et la **citation** tirée de l'événement le plus marquant.

Les statistiques de carrière (matchs, buts, passes, clean sheets, sélections) ne sont pas suivies par le moteur — ce serait du vocabulaire sportif dans `/engine`, interdit par la section 8. Elles sont **dérivées de façon déterministe** dans `lib/legacyCard.ts` à partir des saisons jouées, de la note, du poste et des threads (rotation, blessures, exil). Même seed → même carte.

## Bugs réels trouvés et corrigés

1. **`threadsResolve` ne libérait pas les threads cumulatifs** → un callback adossé à un compteur restait ouvert indéfiniment.
2. **`corps_sacrifie` non résolu dans 15 % des carrières** : le résolveur exigeait un niveau ≥ 3, les joueurs à 1-2 n'y arrivaient jamais. Ajout de `a3_corps_leger`.
3. **Paliers de légende trop généreux** : aucune carrière sous « Reconnu ». Recalibrés sur la distribution mesurée.
4. **Aucune retraite** : toutes les carrières duraient 21 saisons jusqu'à 40 ans. Ajout de `engine/retirement.ts`.
5. **Gardiens à 3 passes décisives sur 206 matchs.** Remplacé par des clean sheets à taux réaliste (18-42 %).
6. **Carte blanche à l'export.** Le `style="width:100%"` du composant n'a aucun conteneur contre lequel se résoudre hors du document : le rendu sortait vide. `cardToPngBlob` retire désormais le style et impose les dimensions réelles. **C'était un bug silencieux qui aurait cassé le partage en production.**
7. **Nom débordant sur le numéro de maillot**, et noms longs coupés net. Le prénom est maintenant abrégé en initiales.
8. **Étoiles du palmarès invisibles** à la rastérisation (glyphe absent de certaines polices). Remplacées par un losange vectoriel.

Les bugs 1 à 5 n'étaient détectables que par simulation en masse, le 6 que par rendu réel. C'est pourquoi `npm run play`, `npm run card` et `npm run render-card` doivent tourner après chaque modification.

## Notes techniques

- **TypeScript épinglé à 5.4.5.** Sans version, npm résout vers TS 7.x qui supprime `baseUrl` et casse le build.
- **`@types/react` en 18** pour matcher `react@18`.
- **Imports internes sans extension `.js`** : webpack ne résout pas les `.js` pointant vers des `.ts`.
- **`tsconfig.render.json`** existe uniquement pour `render-card` (JSX hors Next, `jsx: react-jsx`).
- Le jeu tourne **entièrement côté client** — aucune dépendance serveur pour jouer.

## Reste à faire

- Persistance Supabase — projet `ascension` créé, ref `gaozhffmbvfmzvlgpoug`, encore vide.
- Défi du jour : le PRNG déterministe est prêt, il ne manque que la seed partagée et la table.
- Mesure du taux de partage (`shareCard` renvoie déjà le canal utilisé) — c'est la métrique de survie, seuil 5 %.
- Substitution de `{RIVAL}` par un prénom au rendu (le placeholder est dans `a1_rival`).
- `finale_perdue` : mention dans les événements médias pendant 4 saisons.
- Palmarès saturé : 84 % des cartes affichent 3 lignes sur 3. À resserrer si les cartes se ressemblent trop.
