# Ascension

Simulateur de carrière sportive narratif. Moteur agnostique + pack de contenu `fr-football`.

**État : jouable de bout en bout, carte de partage incluse. 52 événements, 230 branches, 8 callbacks, 0 erreur, build production OK.**

## Structure

```
engine/              moteur agnostique — aucun vocabulaire sportif (section 8)
content/fr-football/ config, création, nommage, callbacks, 52 événements
lib/                 pont moteur ↔ UI, dérivation carte, export/partage
app/                 Next.js App Router : boucle de jeu, carte, image OG
scripts/             validateur, smoke test, simulations en masse
```

## Commandes

```bash
npm install
npm run dev           # jouable sur localhost:3000
npm run typecheck     # avant chaque push
npm run validate      # 0 erreur attendu
npm run test           # smoke test moteur
npm run play           # 300 carrières, vérifie les callbacks
npm run card            # 200 cartes, vérifie les stats
```

## IMPORTANT — structure des dossiers

Ce zip doit remplacer **l'intégralité** du contenu de ton repo GitHub. La structure en dossiers (`engine/`, `content/`, `lib/`, `app/`, `scripts/`) n'est pas optionnelle : les imports (`@/engine/schema`, `@/content/fr-football/...`) et Next.js lui-même (App Router = dossier `app/` obligatoire) en dépendent. Un import cassé faute de dossier fait planter tout le build.

Vide entièrement ton dossier local `ascension` (sauf `.git/`) avant de dézipper le contenu dedans, plutôt que d'ajouter fichier par fichier.
