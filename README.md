# Ascension — moteur + prototype jouable

## Structure

```
engine/       moteur agnostique (aucun vocabulaire sportif — section 8)
content/      pack fr-football : config.json (vocabulaire d'affichage), events/, pack.json
lib/          pont entre le moteur et l'UI React (engineBridge.ts)
app/          Next.js App Router — layout, page, styles
scripts/      validate-content.ts, smoke-test.ts
```

## Commandes

```bash
npm install
npm run dev         # http://localhost:3000 — jouable
npm run build        # build de production, vérifié OK
npm run typecheck    # npx tsc --noEmit — avant chaque push
npm run validate     # valide le pack de contenu
npm run test          # smoke test du moteur
```

## État réel du prototype

- ✅ Moteur complet (resolver, progression, résolution probabiliste, locks, callbacks, legacy)
- ✅ `config.json` — vocabulaire d'affichage, stats, postes, tiers de légende (section 8, 10.3)
- ✅ UI Next.js jouable : création → 3 écrans d'événements → carte de fin (note, tier, citation)
- ✅ Build de production vérifié (`next build` passe, 4 pages statiques générées)
- ⚠️ Seulement **3 événements de référence** sur les 43 carrefours prévus — le reste existe déjà (écrit dans une session précédente) mais reste à reconvertir en JSON
- ⏳ Pas de carte finale en image (canvas/SVG → PNG, section 11) — pour l'instant c'est un écran texte
- ⏳ Pas de `naming.json` (clubs fictifs)
- ⏳ Pas de persistance Supabase, pas de défi du jour

## Notes techniques importantes

- **TypeScript épinglé à 5.4.5.** `npm install typescript` sans version résout vers TS 7.x (une version expérimentale récente) qui casse `baseUrl` et n'est pas garantie compatible avec Next 14. Ne pas mettre à jour sans vérifier.
- **`@types/react` en version 18**, pour matcher `react@18`. Une désynchronisation de version types/runtime produit des erreurs de typecheck qui n'ont rien à voir avec le vrai code.
- **Imports internes sans extension `.js`.** Le webpack de Next.js ne résout pas les imports relatifs suffixés `.js` pointant vers des fichiers `.ts` (contrairement à `tsx`/Node en ESM strict). Tous les imports internes du moteur ont été adaptés en conséquence.
- Le jeu tourne **entièrement côté client** (`"use client"` dans `lib/engineBridge.ts` et `app/page.tsx`), conformément à la section 15 — pas de dépendance serveur pour jouer une carrière.
