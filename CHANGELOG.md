# ☀ Changelog — Tango · Soleils & Lunes 🌙

> Journal de développement du jeu Tango, construit conversation après conversation avec Claude.
> Chaque version correspond à une session de travail, une idée, une friction résolue.

---

## [v0.1] — Naissance de la grille

**Le point de départ : faire tourner le jeu.**

- Grille 6×6 cliquable avec des cases vides
- Cycle au clic gauche : `vide → ☀ → 🌙 → vide`
- Clic droit pour le sens inverse
- Affichage des symboles fixes (cases pré-remplies)
- Contraintes `=` et `×` entre cases adjacentes
- Les trois règles du jeu posées :
  - ⚖ **Équilibre** : 3 ☀ et 3 🌙 par ligne et colonne
  - 🚫 **Triplet** : jamais 3 symboles identiques côte à côte
  - **= / ×** : égalité ou différence forcée entre voisins

---

## [v0.2] — Le moteur derrière les indices

**Faire en sorte que le jeu puisse "réfléchir".**

Introduction du solveur logique humain — la colonne vertébrale de tout le reste :

- `tBalance` — détecte quand une ligne/colonne est saturée → force les cases vides
- `tTriple` — repère deux symboles côte à côte → bloque le troisième
- `tConstraints` — propage les contraintes `=` / `×` depuis une case connue

> Ce solveur est utilisé à la fois pour **valider les puzzles** et pour **donner des indices** au joueur.

---

## [v0.3] — Générateur de puzzles

**Sortir des puzzles codés en dur.**

- Génération aléatoire d'une solution valide par backtracking (`genSolution`)
- Placement aléatoire des contraintes `=` / `×`
- Suppression progressive des cases pour créer le puzzle de départ
- Vérification que le puzzle reste **solvable uniquement par logique**
- Unicité de la solution garantie (`countBT` limite à 1 solution backtrack)

---

## [v0.4] — Niveaux de difficulté

**Facile, Moyen, Difficile — pas juste un label.**

- Modale de sélection au démarrage
- Difficulté pilotée par densité de contraintes et complexité logique requise

| Niveau       | Contraintes | Déductions avancées |
|--------------|-------------|---------------------|
| 🌱 Facile    | ~52%        | 0–1                 |
| 🔥 Moyen     | ~30%        | 2–6                 |
| 💀 Difficile | ~14%        | 6+                  |

- Badge de difficulté dans la navbar, cliquable pour changer
- Overlay de génération animé pendant le calcul

---

## [v0.5] — Chronomètre

**Mesurer le temps, ressentir la progression.**

- Timer qui démarre au **premier clic** sur la grille
- Indicateur visuel (point) : inactif → 🟡 en cours → 🟢 terminé
- Affichage `m:ss` en temps réel
- Reset automatique à chaque nouveau puzzle

---

## [v0.6] — Détection d'erreurs

**Voir ses erreurs sans se faire gronder immédiatement.**

- Détection des contradictions en temps réel (triplets, contraintes violées)
- Mise en évidence rouge des cases concernées **après 2 secondes**
- Effacement automatique dès que l'erreur est résolue
- Les erreurs bloquent la détection de victoire

---

## [v0.7] — Annuler / Historique

**Le droit à l'erreur.**

- Bouton ↩ **Annuler** : revient case par case en arrière
- Pile d'historique (`hist`) enregistrant chaque action joueur
- Désactivé automatiquement quand l'historique est vide

---

## [v0.8] — Système d'indices

**Ne pas laisser le joueur seul face au vide.**

- Bouton 💡 **Indice** : trouve la prochaine case déductible
- Prévisualisation sur la grille : symbole semi-transparent avec bordure en pointillés
- Bulle explicative entre la grille et les boutons
- Clic sur la case prévisualisée : confirme l'indice dans la grille
- Clic droit : efface la prévisualisation sans valider

---

## [v0.9] — Techniques avancées du solveur

**Pour les puzzles difficiles, il fallait aller plus loin.**

Quatre nouvelles techniques logiques :

- **`dist4`** — si `[0]` et `[4]` sont identiques, `[5]` est forcé à l'opposé
- **`dist5`** — si `[0]` et `[5]` sont identiques, `[1]` et `[4]` sont tous les deux forcés
- **`pair-end`** — une paire en `[0-1]` force `[5]` à l'opposé (et vice versa)
- **`chain-eq/x`** — propagation de chaînes de contraintes consécutives
- **`tElim`** — élimination par contradiction : l'autre symbole mène à une impossibilité

Chaque technique a un texte explicatif affiché dans la bulle d'indice.

---

## [v1.0] — Statistiques & Préférences

**Garder une trace, personnaliser l'expérience.**

- 📊 Modal **Statistiques** :
  - Parties jouées, meilleur temps, temps moyen, temps total
  - Filtrables par niveau de difficulté
  - Stockées en `localStorage`
  - Réinitialisation avec confirmation
- Toggle **Mémoriser la difficulté** : relance automatiquement au même niveau
- Sauvegarde des préférences entre les sessions

---

## [v1.1] — Page de techniques de résolution

**Apprendre à jouer sans chercher ailleurs.**

- Création de `tips.html` : guide complet des stratégies de résolution
- Lien depuis la section règles de la page de jeu
- Navigation cohérente avec la page d'accueil

---

## [v1.2] — Design & Responsive

**Un jeu qui ressemble à quelque chose, sur tous les écrans.**

- Palette sombre : `#0e0e0f` fond · `#f5c842` soleil · `#8fa8d4` lune
- Typographies : *Crimson Pro* (titres) + *DM Mono* (interface)
- Cases adaptatives : `112×112 px` desktop · `52×52 px` mobile (≤700px)
- Grille avec coins arrondis, transitions et animations sur les modales

---

*Développé avec [Claude](https://claude.ai) · Code source sur [GitHub](https://github.com/DucloyLeo/website)*