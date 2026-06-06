# ☀ Changelog — Tango · Soleils & Lunes 🌙

> Journal de développement du jeu Tango, construit conversation après conversation avec Claude.
> Chaque entrée correspond à une idée, une friction résolue, une feature ajoutée.

---

## [v0.4] — SEO, PWA, skins & nouveaux badges

### 🔍 Référencement (SEO)

- Meta tags complets sur chaque page : `description`, `keywords`, `canonical`, `author`
- **Open Graph** + **Twitter Cards** pour des aperçus riches au partage (réseaux sociaux, messageries)
- **JSON-LD** structuré : `WebApplication` + `Organization` (compréhension par Google)
- `sitemap.xml` (8 URLs priorisées) + `robots.txt` (autorise tout sauf `/admin/` et pages légales)
- `H1` caché pour lecteurs d'écran, `noindex` sur `login` / `profile`
- **Google Search Console** connecté, sitemap soumis (8 pages indexées)
- `og-image.png` (1200×630) généré pour l'aperçu social (les SVG ne sont pas rendus par les réseaux)

### 📱 PWA & mobile

- `site.webmanifest` + icônes (192 / 512 / apple-touch) → jeu installable sur écran d'accueil
- `theme-color` et `apple-touch-icon` sur toutes les pages
- `favicon.svg` ajouté sur **toutes** les pages (était seulement sur l'accueil)

### 🎨 Skins de symboles

- Choix du rendu des soleils/lunes dans **Mon Profil → Apparence** : **Emoji**, **Ronds colorés**, **Cases N&B**
- Architecture propre : le moteur marque la donnée (`sym-sun`/`sym-moon`/`sym-empty`), le CSS gère l'apparence (`js/skins.js`)
- Skins « ronds » et « N&B » en **CSS pur → rendu identique sur tous les supports** (contrairement aux emojis)
- Choix mémorisé en `localStorage`, appliqué au jeu et aux défis quotidiens

### 🏅 Conditions de badges étendues

9 nouveaux types de conditions pour laisser les admins créer librement : `total_time`, `games_in_day`, `streak_days`, `distinct_days`, `fast_solve`, `night_owl`, `early_bird`, `account_age`, `all_difficulties`. Formulaire admin adaptatif (indices contextuels, champs masqués selon le type) + migration SQL de la contrainte CHECK.

### 🌐 Infrastructure

- **Migration Cloudflare Workers → Cloudflare Pages** (résolution d'une Error 522 qui rendait le site inaccessible)
- Domaine `tangoleo.fr` reconnecté en domaine personnalisé Pages (SSL auto)
- **Cloudflare Web Analytics** activé (gratuit, sans cookie, RGPD) — Core Web Vitals au vert (LCP ~556 ms)

### 🔧 Corrections

- Alignement du formulaire admin badges (label sur 2 lignes décalait les champs)
- Attribut `lang="fr"` manquant sur `tango.html`
- **Cache** : `_headers` CSS/JS passés de `immutable` à `no-cache` ; cache-busting `?v=N` sur les assets (la zone Cloudflare imposait un TTL qui masquait les mises à jour)

---

## [v0.3] — Défis quotidiens & refonte calendrier

### 📅 Système des défis journaliers

- Page `/daily.html` avec deux modes :
  - **Play** : résoudre le niveau du jour avec timer persistant (localStorage, résistant aux changements de fuseau horaire)
  - **Catalogue** : archives de tous les niveaux passés + calendrier interactif
- Admin `/admin/daily.html` pour créer/générer/modifier les niveaux journaliers
- Table Supabase `daily_levels` (date, seed, difficulty, name) + `daily_completions` (user_id, level_id, time_seconds)
- **Génération automatique** : bouton "Générer les jours manquants" crée les niveaux avec seeds aléatoires

### 📆 Calendrier interactif

- **Slider 3-slides** : affiche simultanément les 3 mois (prev, curr, next) avec transition lisse
- **Drag-to-change-month** avec snapping magnétique (swipe droit/gauche)
- Drag verrouillé avant mai 2026 (limite inférieure)
- **Boutons de navigation** : flèches `‹ ›` avec animation de slide (drag + arrows synchronisés)
- **Bouton de retour** (`←`) : revient au mois du niveau sélectionné, grayed out si déjà au bon mois
- **Padding uniforme** : tous les mois complétés à 42 cellules (6 semaines) → hauteur stable
- **Compteur de complétion** : `done / total_jours_du_mois` (total = 31, 28, etc., non limité aux jours passés)
- **Sélection persistante** : changer de mois garde la sélection active (elle devient juste invisible)
- Affichage du panneau de détail même sur jours futurs/sans niveau (placeholder 🔒 ou —)

### 🎯 Refonte catalogue & détail

- Mini-grille du puzzle en vue catalogue
- **Leaderboard** : top 10 + voisins de l'utilisateur (classement par temps)
- Bouton "Commencer" **uniquement sur la mini-grille** (centré, clickable)
- **Relancé les niveaux complétés** : bouton "↺ Rejouer" en bas à droite du temps
- Popup de victoire **centrée sur la grille** (position absolue) avec fond semi-transparent (`.4 opacity`)
- Retour au calendrier après jeu revient à la **même date sélectionnée** (pas de saut au jour actuel)

### 🎨 Améliorations UX

- **Mode clair/sombre** : toggle slider dans la navbar, persisté en localStorage
- **Icone VIP** (✦) + bouton "Lien du jour" (📅) ajoutés à la navbar et hamburger menu
- **Notifications en toast** : affichage en haut-center avec fade-in/out, stacking horizontal
- **Notifications Realtime** : badges débloqués, messages admin, changements de rôle reçus en temps réel via Supabase Realtime
- Tooltips sur boutons du jeu (1s delay) avec raccourcis clavier

### 🔧 Corrections & Optimisations

- **Scintillement calendrier supprimé** : chargement données en parallèle de l'animation, rendu DOM après le snap
- **Layout mois futurs fixé** : slider width calculée en JS (flexbox ambiguïté → grid explicite en pixels)
- **ResizeObserver** : recalcule les tailles dès que le conteneur devient visible
- **Scores sauvegardés** : cache mis à jour après chaque complétion, visuel et sélection refreshes
- **Niveaux passés jouables** : `currentIsReplay` vérifiée correctement (true seulement si déjà complété)
- **Seeds verrouillés** : jours passés complétés → champ seed disabled, opacifié, avec tooltip
- Admin past days : génération après date autorisée, modification seed verrouillée post-complétion

### 🗄 Changements base de données

- 2 nouvelles tables : `daily_levels`, `daily_completions`
- RLS policies pour accès user (lecture) et admin (full)
- Trigger optionnel : auto-complétion du jour via batch job (non implémenté, manuel pour l'instant)

---

## [v0.2] — Plateforme complète & mise en ligne

### 🔐 Comptes utilisateurs

- Inscription avec pseudo, email, mot de passe (validation côté client + serveur)
- Connexion / déconnexion
- Toggle visibilité mot de passe (œil) dans les deux formulaires — icône native Chrome masquée via CSS
- Redirection automatique si déjà connecté
- Nom du profil + bouton déconnexion affichés dans la navbar sur toutes les pages

### 👤 Profil utilisateur (`/profile.html`)

- Statistiques globales : parties jouées, badges obtenus, meilleur temps, temps total
- Statistiques par difficulté (Facile / Moyen / Difficile) : parties, meilleur temps, moyenne
- Galerie de badges obtenus et verrouillés
- **Réinitialiser les statistiques** : efface parties, stats et badges sans supprimer le compte
- Export RGPD des données personnelles au format JSON
- Suppression de compte avec double confirmation

### 🏅 Système de badges

9 badges automatiques débloqués en jeu :

| Badge | Condition |
|-------|-----------|
| 🌱 Première Partie | Terminer 1 partie |
| 🔥 Habitué | Terminer 10 parties |
| ⭐ Vétéran | Terminer 50 parties |
| 💎 Centurion | Terminer 100 parties |
| 💀 Intrépide | Terminer 1 partie difficile |
| 🏆 Maître du Puzzle | Terminer 10 parties difficiles |
| ⚡ Éclair | Facile en moins de 60 s |
| 🌩 Foudre | Moyen en moins de 90 s |
| 🚀 Supersonique | Difficile en moins de 3 min |

### ⏱ Améliorations du chronomètre

- Le timer démarre maintenant au **premier indice** (touche H) en plus du premier clic
- **Mode assisté** (CTRL+H) : la partie est marquée assistée → comptée en parties jouées et temps total, mais **exclue du meilleur temps** et des badges de rapidité

### 🌱 Seed & partage

- Bouton **🔗 Seed** dans la sous-barre du jeu : copie l'URL du puzzle en cours
- Format 7 caractères (puzzle généré, difficulté encodée) ou 16 caractères (puzzle personnalisé)
- Paramètre `?seed=XXXXXXX` dans l'URL pour charger directement un puzzle partagé

### ⚙️ Panel d'administration (`/admin/`)

- **Dashboard** : KPIs (joueurs, parties, connexions 7j/30j), graphes activité, dernières inscriptions
- **Utilisateurs** : liste avec recherche, détail (stats + badges), promotion/rétrogradation admin, suppression
- **Niveaux** : ajout/activation/désactivation de seeds personnalisées
- **Badges** : création et suppression de badges custom
- Accès réservé aux comptes `role = 'admin'`

### 💡 Page Conseils (`/tips.html`)

- Les 3 règles illustrées avec exemples visuels
- 9 techniques de résolution classées Facile / Moyen / Difficile
- Conseils généraux
- Accessible depuis le menu hamburger sur toutes les pages

### 🗂 Navigation & UX

- Menu hamburger disponible sur **toutes les pages** (jeu, connexion, profil, légal, admin)
- Lien **💡 Conseils** ajouté dans tous les hamburgers
- Le titre "☀ Tangoléo 🌙" sur la page de jeu est un lien cliquable vers l'accueil
- `tango.html` redirige automatiquement vers `/` (compatibilité ancienne URL)

### 📄 Pages légales (conformité RGPD)

- CGU (Conditions Générales d'Utilisation)
- Politique de confidentialité avec tableau des données collectées
- Mentions légales
- Informations renseignées : Ducloy Léo · ducloy.leo@gmail.com · Yvetot · tangoleo.fr

### 🗄 Base de données Supabase

- 8 tables : `profiles`, `player_stats`, `completed_levels`, `badges`, `player_badges`, `login_logs`, `admin_logs`, `custom_levels`
- Row Level Security (RLS) sur toutes les tables
- Trigger `on_auth_user_created` → création automatique du profil à l'inscription
- Fonction `is_admin()` (security definer) utilisée dans les policies admin
- Logs de connexion avec user-agent hashé (SHA-256 tronqué, conformité RGPD)

### 🌐 Déploiement & Infrastructure

- **Renommage** : "Tango" → **"Tangoléo"** (nom, titres, meta, légal)
- Hébergement initial sur Netlify → migré sur **Cloudflare Workers** (crédit Netlify épuisé)
- Domaine personnalisé **tangoleo.fr** acheté chez OVH, DNS géré par Cloudflare
- SSL automatique Cloudflare, proxy activé (orange cloud)

### 🐛 Corrections de bugs

- `db.from(...).catch is not a function` : Supabase JS v2 `PostgrestBuilder` n'a pas `.catch()` — remplacé par destructuring `{ error }` partout
- Stats non sauvegardées : policy RLS `FOR ALL USING` ne couvre pas INSERT → ajout de policies `FOR INSERT WITH CHECK` explicites
- Popup de victoire bloquée : `saveGameResult` en erreur bloquait le `setTimeout` → encapsulé dans try/catch
- Boucle de redirection admin : `requireAdmin('index.html')` (relatif) → `requireAdmin('/index.html')` (absolu)
- Lien "← Site public" dans la sidebar admin pointait vers `/admin/index.html` → corrigé vers `/index.html`
- Bouton œil du mot de passe invisible dans l'onglet Connexion : icône native Chrome masquée + `z-index: 2`

---

## [v0.1] — Première version jouable

**Tout ce qui constitue le jeu aujourd'hui.**

### 🎮 Grille & Interaction

- Grille 6×6 cliquable avec des cases vides
- Cycle au clic gauche : `vide → ☀ → 🌙 → vide`
- Clic droit pour le sens inverse
- Affichage des symboles fixes (cases pré-remplies, non modifiables)
- Contraintes `=` et `×` entre cases adjacentes affichées sur la grille

### 📐 Règles du jeu

- ⚖ **Équilibre** : 3 ☀ et 3 🌙 par ligne et colonne
- 🚫 **Triplet** : jamais 3 symboles identiques côte à côte
- **= / ×** : égalité ou différence forcée entre voisins

### 🧠 Solveur logique

Le cœur du jeu — utilisé pour valider les puzzles ET donner des indices :

- `tBalance` — ligne/colonne saturée → force les cases vides restantes
- `tTriple` — deux symboles côte à côte → bloque le troisième adjacent
- `tConstraints` — propage les contraintes `=` / `×` depuis une case connue
- `tEnds` — trois techniques sur les extrémités de ligne/colonne :
  - **dist4** : `[0]` et `[4]` identiques → `[5]` est forcé à l'opposé
  - **dist5** : `[0]` et `[5]` identiques → `[1]` et `[4]` sont tous les deux forcés
  - **pair-end** : paire en `[0-1]` → `[5]` à l'opposé (et vice versa)
- `tChain` — chaînes de contraintes consécutives :
  - **chain-eq** : `A = B = C` → si l'un est connu, les deux autres sont identiques
  - **chain-x** : `A ≠ B ≠ C` → A et C sont nécessairement identiques
- `tElim` — élimination par contradiction : l'autre symbole mènerait à une impossibilité

### ⚙️ Générateur de puzzles

- Génération aléatoire d'une solution valide par backtracking
- Placement aléatoire des contraintes `=` / `×`
- Suppression progressive des cases pour créer le puzzle
- Vérification : le puzzle doit rester **solvable uniquement par logique humaine**
- Unicité garantie : une seule solution possible

### 🎯 Niveaux de difficulté

| Niveau       | Contraintes | Déductions avancées |
|--------------|-------------|---------------------|
| 🌱 Facile    | ~52%        | 0–1                 |
| 🔥 Moyen     | ~30%        | 2–6                 |
| 💀 Difficile | ~14%        | 6+                  |

- Modale de sélection au démarrage et entre les puzzles
- Badge de difficulté dans la navbar, cliquable pour changer
- Overlay de génération animé pendant le calcul

### ⏱ Chronomètre

- Démarre au **premier clic** sur la grille
- Indicateur visuel : inactif → 🟡 en cours → 🟢 terminé
- Affichage `m:ss` en temps réel
- Reset automatique à chaque nouveau puzzle

### ❌ Détection d'erreurs

- Détection en temps réel des triplets et contraintes violées
- Mise en évidence rouge **après 2 secondes** (le temps de se corriger soi-même)
- Effacement automatique dès que l'erreur disparaît
- Les erreurs bloquent la détection de victoire

### ↩ Annuler

- Bouton Annuler : revient case par case en arrière
- Pile d'historique enregistrant chaque action
- Désactivé quand l'historique est vide

### 💡 Système d'indices

- Trouve la prochaine case déductible logiquement
- Prévisualisation sur la grille : symbole semi-transparent + bordure en pointillés
- Bulle explicative avec le raisonnement derrière l'indice
- Clic sur la case prévisualisée → confirme l'indice
- Clic droit → efface sans valider

### 📊 Statistiques

- Parties jouées, meilleur temps, temps moyen, temps total
- Filtrables par niveau de difficulté
- Persistées en `localStorage`
- Réinitialisation avec confirmation

### ⚙️ Préférences

- Toggle **Mémoriser la difficulté** : relance automatiquement au même niveau
- Sauvegardées entre les sessions

### 📖 Page de techniques

- `tips.html` : guide complet des stratégies de résolution
- Lien depuis la section règles de la page de jeu

### 🎨 Design & Responsive

- Palette sombre : `#0e0e0f` fond · `#f5c842` soleil · `#8fa8d4` lune
- Typographies : *Crimson Pro* (titres) + *DM Mono* (interface)
- Cases adaptatives : `112×112 px` desktop · `52×52 px` mobile (≤700px)
- Grille avec coins arrondis, transitions et animations sur les modales

---

*Développé avec [Claude](https://claude.ai) · Code source sur [GitHub](https://github.com/DucloyLeo/website)*