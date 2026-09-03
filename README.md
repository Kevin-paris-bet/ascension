# Ascension

Simulateur de carrière sportive narratif. Moteur agnostique + pack de contenu `fr-football`.

**État : jouable de bout en bout, carte de partage incluse. 52 événements, 230 branches, 8 callbacks, 0 erreur, build production OK.**

## IMPORTANT

Ce zip doit remplacer l'intégralité du contenu de ton repo GitHub. **Ne supprime ni n'ajoute aucun fichier ou dossier manuellement après coup** — les imports du projet dépendent exactement de cette arborescence :

```
engine/               moteur agnostique
content/fr-football/  config, création, nommage, callbacks, 52 événements
lib/                   pont moteur ↔ UI
app/                    Next.js : page, layout, composants, API
scripts/                validateur, tests, simulations
```

## Commandes

```bash
npm install
npm run dev
npm run typecheck
npm run validate
npm run test
npm run play
```
