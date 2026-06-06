# 🎯 Rétention joueurs — Propositions Tangoléo

> Analyse des mécaniques de rétention adaptées à Tangoléo.
> À relire pour prioriser et implémenter au fil des sessions.

---

## Ce qui existe déjà

- Défis quotidiens + classement top 10 + voisins
- Système de badges (condition `streak_days` calculée mais non affichée)
- Stats de progression par difficulté (profil)
- Mode extrême (10% sur difficile + toggle)
- Trois niveaux de difficulté + paramètres admin

---

## Propositions classées par priorité

### 🔥 1. Série (streak) visible + alerte
**Effort : faible** · **Impact : très élevé**

La mécanique #1 des jeux quotidiens (Duolingo, Wordle, Codecombat).
Les données existent déjà (`streak_days` est calculé dans `auth.js`
pour les badges) — il manque uniquement l'UI.

**Ce à implémenter :**
- Afficher "🔥 N jours d'affilée" en évidence sur `daily.html`
- Alerte si la série est en danger ce jour ("Joue aujourd'hui pour ne pas perdre ta série !")
- Toast de célébration aux paliers (7, 30, 100 jours…)
- Affichage sur le profil

**Stockage :** calculable à la volée depuis `completed_levels` (déjà fait
dans `checkAndAwardBadges`), ou colonne `current_streak` dans `profiles`
pour éviter de recalculer à chaque fois.

---

### 📤 2. Carte de résultat partageable
**Effort : moyen** · **Impact : élevé + viral**

Après le défi quotidien, générer une carte à partager (type Wordle) :

```
☀ Tangoléo #42 — 1:23
⚡ Sans indice · Moyen
🏆 Top 3 aujourd'hui
tangoleo.fr
```

Génération côté client (Canvas API ou SVG → PNG via `<canvas>`).
Bouton "Partager" dans le panel de résultat après victoire sur le daily.

**Intérêt double :** rétention des joueurs existants + acquisition de
nouveaux joueurs via les réseaux sociaux.

---

### 🔔 3. Notifications navigateur (Push API)
**Effort : faible** · **Impact : élevé sur le rappel**

Notification quotidienne "☀ Le défi du jour est disponible !"
à l'heure de publication du niveau (configurable).

**Techniquement :**
- Demande de permission au premier passage sur `daily.html`
- Service Worker minimal + `Notification API`
- Heure configurable via admin (ou fixe à 6h Paris)
- Opt-in uniquement, jamais forcé

---

### ⭐ 4. XP + niveaux
**Effort : élevé** · **Impact : moyen-élevé**

Chaque puzzle donne des XP selon la difficulté, le temps et l'utilisation
d'indices. Un niveau visible sur le profil et dans le leaderboard donne
un sentiment de progression continu même sans battre de record.

**Barème suggéré (à ajuster) :**

| Difficulté | XP base | Bonus sans indice | Bonus top 3 daily |
|-----------|---------|------------------|------------------|
| Facile    | 10      | +5               | +10              |
| Moyen     | 25      | +10              | +20              |
| Difficile | 50      | +20              | +40              |
| Extrême   | 100     | +50              | +80              |

**Stockage :** colonne `xp` dans `profiles` + table `xp_logs`.

---

### 🎯 5. Missions hebdomadaires
**Effort : élevé** · **Impact : moyen**

Missions remises à zéro chaque lundi, récompensées par des badges
temporaires ou des XP bonus.

**Exemples :**
- "Termine 3 puzzles difficiles cette semaine"
- "Complète 5 défis quotidiens ce mois"
- "Résous un puzzle en moins de 60s"
- "Joue 7 jours d'affilée"

**Stockage :** table `missions` (définitions admin) + `player_missions`
(progression joueur). Peut réutiliser le moteur de badges existant.

---

### 📊 6. Heatmap d'activité
**Effort : faible** · **Impact : moyen (fierté/identité)**

Calendrier annuel type "GitHub contributions" sur le profil, montrant
tous les jours joués. Très visuel, donne envie de "remplir" le calendrier.

**Données :** déjà disponibles dans `completed_levels` (date par partie).
**Implémentation :** grille SVG ou div CSS, calculée côté client.

---

## Tableau récapitulatif

| # | Mécanique | Effort | Impact | Données dispo ? |
|---|-----------|--------|--------|-----------------|
| 1 | 🔥 Streak visible + alerte | Faible | ⭐⭐⭐⭐⭐ | Oui (à afficher) |
| 2 | 📤 Carte partageable | Moyen | ⭐⭐⭐⭐ + viral | Oui |
| 3 | 🔔 Notifications push | Faible | ⭐⭐⭐⭐ | N/A |
| 4 | ⭐ XP + niveaux | Élevé | ⭐⭐⭐ | Non (à créer) |
| 5 | 🎯 Missions hebdo | Élevé | ⭐⭐⭐ | Partiel |
| 6 | 📊 Heatmap activité | Faible | ⭐⭐ | Oui |

---

## Recommandation d'ordre d'implémentation

1. **Streak** — données déjà là, UI rapide, impact immédiat
2. **Heatmap** — données déjà là, effort minimal, enrichit le profil
3. **Notifications** — effort faible, fort impact sur le rappel quotidien
4. **Carte partageable** — effort moyen mais fort potentiel viral
5. **XP/niveaux** — refonte plus lourde, à planifier séparément
6. **Missions** — le plus complexe, à faire en dernier

---

*Document créé le 07/06/2026 — à compléter au fil des implémentations.*
