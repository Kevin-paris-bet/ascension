# Ascension

Simulateur de carrière sportive narratif. Moteur agnostique + pack `fr-football`.
52 événements, 230 branches, 8 callbacks, carte de partage 9:16.

## Installation

```bash
npm install
npm run dev        # localhost:3000
```

## Commandes

```bash
npm run typecheck   # avant chaque push
npm run validate    # 0 erreur attendu
npm run test        # smoke test moteur
npm run play        # 300 carrières, vérifie les callbacks
npm run card        # 200 cartes, vérifie les stats
```

## Structure — ne pas réorganiser

```
engine/               moteur agnostique (aucun vocabulaire sportif)
content/fr-football/  config, création, nommage, callbacks, 52 événements
lib/                  pont moteur ↔ UI, carte, partage
app/                  Next.js App Router
types/                déclarations globales (imports CSS)
scripts/              validateur, tests, simulations
```

## Pourquoi le build cassait sur Vercel

Trois causes cumulées, toutes corrigées :

1. **`typescript` était en `devDependencies`.** Quand l'installation omet les devDependencies, Next.js ne le trouve pas et installe alors **la dernière version disponible (7.x)** de son côté. TypeScript 7 rejette l'option `baseUrl`, et le build échouait — alors qu'en local, avec TS 5.4.5 installé, tout passait. C'est pour ça que l'erreur n'apparaissait que sur Vercel.
2. **`baseUrl` est déprécié.** Supprimé du tsconfig ; les alias `@/*` fonctionnent désormais sans lui (résolution relative au tsconfig), compatible TS 5 comme TS 7.
3. **Aucune déclaration pour les imports CSS.** Next ne déclare pas `*.css`, donc `import "./globals.css"` faisait échouer le typecheck selon l'environnement. Ajout de `types/global.d.ts`.

En complément : `react-dom` est passé en dépendance de production (c'en est une), les versions sont épinglées, et **`package-lock.json` est maintenant versionné** pour que Vercel installe exactement les mêmes versions.

Le build a été vérifié dans les deux modes, dont celui qui échouait (`npm ci` avec `NODE_ENV=production`).

## Reste à faire

- Persistance Supabase (projet `ascension`, ref `gaozhffmbvfmzvlgpoug`, vide)
- Défi du jour (le PRNG déterministe est prêt)
- Mesure du taux de partage — métrique de survie, seuil 5 %
