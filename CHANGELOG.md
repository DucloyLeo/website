# ☀ Changelog — Tango · Soleils & Lunes 🌙

> Journal de développement du jeu Tango, construit conversation après conversation avec Claude.
> Chaque entrée correspond à une idée, une friction résolue, une feature ajoutée.

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