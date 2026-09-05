# Audit et préparation Android — 5 septembre 2026

## Livré

- Même GameApp et moteur embarqués dans un bundle Vite local via Capacitor 8 (pas de server.url distant).
- Android API minimum 24, cible 36 ; JDK 21 requis. Application provisoire com.ascension.football.
- Partage PNG via Filesystem Cache + Share Android et FileProvider ; le destinataire est choisi par le joueur. Pas de publication automatique Instagram/TikTok.
- Sur le web : Web Share si disponible, téléchargement sinon. Une annulation ne compte pas comme un succès. « Partage ouvert » ne prétend pas confirmer une publication sociale.
- AdMob 8 en mode TEST exclusivement : SDK natif, consentement UMP, vidéo sur demande, récompense seulement après événement Rewarded puis fermeture. Fermeture anticipée = aucune récompense. Pas de bannière/interstitiel imposé.
- Verrou des actions pendant vidéo/export ; nettoyage des écouteurs ; fichiers de partage temporaires.
- Workflow Android debug : build du bundle, synchronisation Capacitor, compilation APK avec JDK 21, artefact GitHub conservé 14 jours.

## Vérifications

`npm run check` couvre lint, TypeScript, validation narrative, moteur, sauvegardes et build Next.js. `npm test` ajoute 300 parcours du moteur de l’interface (12 rejoués à l’identique), choix gratuits, notes bornées, saisons uniques, mercato, retour de prêt, sélection et retraite ; tests des refus/erreurs/concurrence du fournisseur publicitaire ; annulation partage web/natif. `npm run android:sync` compile le bundle et synchronise les plugins.

Ces tests ne sont PAS des parties jouées dans un navigateur ni un test d'appareil Android. Installation de Chrome locale bloquée par certificat ; navigateur distant refuse le serveur local. JDK local 17 : compilation Android non exécutée ici. Workflow JDK 21 préparé mais non lancé : publication GitHub refusée par le contrôle automatique d’approbation (nouveau projet Android et binaire Gradle). Aucun APK validé à ce stade.

## Limites explicites

- Les championnats calculent un rang sur 20, mais seuls 6 clubs par ligue sont définis. Pas encore de calendrier ni classement complet des 20 clubs. La précédente formulation « 20 équipes réellement simulées » était trop forte.
- Simulation narrative historique : 3 callbacks corps_sacrifie non résolus sur 300 seeds. Les compteurs et arcs réouverts en fin de carrière demandent un traitement narratif ; aucun résultat n’a été masqué.
- Des textes narratifs annoncent des âges, blessures et trophées qui ne pilotent pas encore tous le simulateur football. Une note bornée n’est pas une preuve d’équilibrage parfait.
- Android est une version de test locale : sauvegardes sur l’appareil, pas de compte/cloud. Les variables Supabase sont volontairement vides dans le bundle Android tant que le retour d’authentification mobile n'est pas implémenté. Le site conserve son authentification existante.
- Icônes et splash Android utilisent un monogramme A original vert/or ; polices mobiles de secours. Rendu à valider sur appareil avant diffusion publique.

## Essai sur appareil

1. Installer l’APK debug de GitHub Actions sur un appareil de test (il ne s'agit pas d'une version Play Store).
2. Créer des carrières avec et sans avantage, fermer la vidéo tôt, finir une vidéo test, appuyer deux fois, tester sans réseau, mettre en arrière-plan/revenir.
3. Terminer une carrière et partager la carte vers les applications installées ; tester l’annulation et vérifier que l’image est bien lisible.
4. Fermer/relancer l’app à chaque écran clé : événement, conséquence, bilan, sélection, mercato, retraite.

## Avant publication Play Store

- Valider identifiant définitif, icônes/splash/polices, authentification mobile et suppression du compte si création de comptes activée.
- Configurer compte AdMob, IDs réels et message UMP ; ajouter accès aux options de confidentialité si requis. Ne pas remplacer les IDs test avant validation sur appareil.
- Politique de confidentialité publique et fiche Data safety adaptées aux SDK/données réellement collectées, classification d’âge et public cible. Vérifier les obligations selon le compte Play et ses tests requis.
- Keystore et signature AAB via secrets CI (jamais versionnés) ; fiche store et captures réelles ; tests internes puis décision de diffusion du propriétaire.

Sources techniques : https://capacitorjs.com/docs/config ; https://capacitorjs.com/docs/apis/share ; https://github.com/capacitor-community/admob ; versions effectivement installées figées dans package-lock.json.
