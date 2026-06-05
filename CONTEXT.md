# Tangoléo — Contexte projet (session Claude)

## Présentation
Jeu de puzzle de logique (clone de Tango/LinkedIn) publié publiquement avec comptes utilisateurs.
- **URL** : https://tangoleo.fr (et www.tangoleo.fr)
- **Stack** : HTML/CSS/JS vanilla, Supabase (BDD + auth), Cloudflare Workers (hébergement)
- **Repo GitHub** : DucloyLeo/website
- **Branche de dev** : `claude/game-publishing-requirements-5PfBh` (mais tout est fusionné sur `main`)

---

## Architecture

### Hébergement
- **Frontend** : Cloudflare Workers — `website.ducloy-leo.workers.dev` (domaine original) → `tangoleo.fr`
- **Base de données / Auth** : Supabase — `https://erukrlfuuivrdtlidodj.supabase.co`
- **DNS** : OVH (domaine) + Cloudflare (nameservers : `kayden.ns.cloudflare.com` / `leia.ns.cloudflare.com`)
- `netlify.toml` supprimé (anciennement Netlify, migré Cloudflare par manque de crédits)

### Supabase
- `SUPABASE_URL` = `https://erukrlfuuivrdtlidodj.supabase.co` (sans `/rest/v1/`)
- `SUPABASE_ANON_KEY` = `sb_publishable_b4b4DqfMAx1V2Df6nYAMOw_ZYFr_xwz`
- Fichier client : `platform/js/supabase-client.js`

---

## Structure des fichiers

```
platform/
├── index.html              ← Page de jeu Tangoléo (homepage)
├── daily.html              ← Défis quotidiens (Play + Catalogue)
├── tango.html              ← Redirect vers / (legacy)
├── login.html              ← Connexion / Inscription
├── profile.html            ← Profil utilisateur
├── tips.html               ← Conseils & stratégies
├── css/
│   └── common.css          ← Styles partagés + dark/light mode
├── js/
│   ├── supabase-client.js  ← Init Supabase
│   └── auth.js             ← Helpers auth + stats + badges + theme + notifications
├── admin/
│   ├── index.html          ← Dashboard admin
│   ├── daily.html          ← Gestion niveaux journaliers
│   ├── users.html          ← Gestion utilisateurs
│   ├── levels.html         ← Niveaux personnalisés
│   └── badges.html         ← Gestion badges
├── legal/
│   ├── cgu.html
│   ├── mentions-legales.html
│   └── politique-confidentialite.html
└── supabase/
    └── schema.sql          ← Schéma BDD complet
```

---

## Base de données (Supabase)

### Tables
| Table | Description |
|-------|-------------|
| `profiles` | id, username, role ('user'/'admin'), created_at |
| `player_stats` | user_id, difficulty, games_played, best_time, total_time |
| `completed_levels` | user_id, seed, difficulty, time_seconds, completed_at |
| `badges` | id (text), name, description, icon, condition_type, condition_value, condition_diff |
| `player_badges` | user_id, badge_id, earned_at |
| `login_logs` | user_id, logged_at, ua_hash (SHA-256 tronqué) |
| `admin_logs` | admin_id, action, target_user_id, details |
| `custom_levels` | seed, name, difficulty, is_active |
| `daily_levels` | id, date (YYYY-MM-DD unique), seed (7 ou 16 chars), difficulty, name (opt), created_at |
| `daily_completions` | id, user_id, daily_level_id, time_seconds, completed_at |
| `notifications` | id, user_id, type (badge/admin_message/role_change), data (JSON), is_read, created_at |

### RLS important
- `player_stats` : besoin de policies **INSERT** et **UPDATE** explicites (le `FOR ALL USING` ne couvre pas INSERT dans Supabase)
- `profiles` : policy WITH CHECK pour empêcher l'auto-promotion de rôle

### SQL à avoir exécuté dans Supabase
```sql
-- Mettre un compte en admin
UPDATE profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'ducloy.leo@gmail.com');

-- Fix sécurité rôle
DROP POLICY IF EXISTS "Utilisateur modifie son profil" ON profiles;
CREATE POLICY "Utilisateur modifie son profil" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Fix stats INSERT/UPDATE
DROP POLICY IF EXISTS "Utilisateur gère ses stats" ON player_stats;
CREATE POLICY "Stats insert" ON player_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Stats update" ON player_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Stats delete" ON player_stats FOR DELETE USING (auth.uid() = user_id);
```

---

## Fonctionnalités implémentées

### Jeu (index.html)
- Grille 6×6 Tango avec générateur procédural (PRNG seedé)
- 3 difficultés : Facile / Moyen / Difficile
- Système de seed (URL partageable `/?seed=XXXXXXX`)
- Timer démarré au **premier clic OU au premier indice (H)**
- **CTRL+H = partie assistée** : comptée en parties jouées + temps total, mais PAS en meilleur temps ni badges de temps
- Undo (Ctrl+Z), Reset (R), Nouveau (W)
- Modale de victoire avec temps + badges débloqués
- Stats locales (localStorage) + stats Supabase si connecté

### Défis journaliers (daily.html)
- **Play** : résoudre le niveau du jour avec timer persistant (localStorage sur `daily_timer_YYYY-MM-DD`)
- **Catalogue** : archives complètes, calendrier interactif avec navigation smooth
- **Calendrier** : 
  - Slider 3-pages (prev/curr/next) avec drag-to-change synchronisé aux boutons `‹ ›`
  - Snapping magnétique et animation cubic-bezier
  - Drag verrouillé avant mai 2026
  - Sélection persiste en changeant de mois
  - Bouton retour (`←`) revient au mois de la sélection
  - Tous les mois padded à 42 cellules (hauteur uniforme)
- **Leaderboard** : top 10 + neighbors affichés en jeu + catalogue
- **Replay** : bouton "Rejouer" pour les niveaux complétés, "Commencer" sur mini-grille seulement
- **Admin** (`/admin/daily.html`) : créer/générer/modifier niveaux avec date + seed + difficulté

### Mode clair/sombre (dark/light mode)
- Toggle slider dans navbar avec icônes ☀/🌙
- Persistance en localStorage (`tango_theme`)
- CSS custom properties : `--bg`, `--surface`, `--text`, `--muted`, `--border`, `--border2`, `--green`, `--sun`, `--moon`
- Appliqué sur page load (script dans `<head>` avant CSS)
- Classes utilitaires : `.light-only`, `.dark-only`

### Auth (auth.js)
- `signUp`, `signIn`, `signOut`
- `saveGameResult(userId, diff, timeSeconds, seed, assisted)` — `assisted=true` skip best_time
- `checkAndAwardBadges(userId, diff, timeSeconds, assisted)` — skip badges best_time si assisted
- `initNavAuth()` — peuple `#nav-auth` (desktop) et `#menu-auth-item` (hamburger)
- `toggleMenu()` / `closeMenu()` — hamburger sur toutes les pages
- Toggle visibilité mot de passe sur login.html (masque l'icône native Chrome avec CSS)

### Profil (profile.html)
- Stats globales + par difficulté
- Badges obtenus/verrouillés
- Export RGPD (JSON)
- **Réinitialiser les statistiques** (supprime player_stats + completed_levels + player_badges, garde le compte)
- Suppression de compte

### Admin (/admin/)
- Dashboard : KPIs, graphes connexions 7j, parties par difficulté, derniers inscrits
- Utilisateurs : liste, recherche, détail (stats + badges), promouvoir/rétrograder, supprimer
- Toggle badge dans modale utilisateur : re-render la modale depuis DB après changement
- Niveaux : ajouter/activer/désactiver/supprimer des seeds personnalisées
- Badges : créer/supprimer des badges
- `requireAdmin('/index.html')` — redirige vers homepage si non admin (corrigé : évite boucle)

### Notifications (Supabase Realtime)
- Toast notifications en haut-center avec fade-in/out staggeré
- Types : badge débloqué, message admin broadcast, changement de rôle
- Insertion dans table `notifications` → listeners Realtime reçoivent l'événement
- Socket Supabase ouvert à `initNavAuth()`

### Navigation
- Hamburger sur **toutes** les pages (auth.js global)
- Liens hamburger : 🎮 Jouer → 📅 Défi du jour → 💡 Conseils → auth items
- Sur la page jeu : 🌟 Nouvelle partie → 🎯 Difficulté → ⌨️ Commandes → 💡 Conseils → auth items → toggle "Mémoriser la difficulté"
- Navbar : toggle ☀/🌙 (mode clair/sombre) + icône ✦ VIP si utilisateur VIP
- Logo "☀ Tangoléo 🌙" sur la page jeu = lien cliquable vers /index.html

---

## Informations légales

- **Propriétaire** : Ducloy Léo — ducloy.leo@gmail.com
- **Adresse** : Yvetot
- **Hébergeur frontend** : Cloudflare, Inc. — 101 Townsend St, San Francisco, CA 94107
- **BDD** : Supabase Inc., 970 Toa Payoh North, Singapore
- **Domaine** : OVH Cloud

---

## Emails transactionnels (Resend + Supabase)

### Configuration SMTP Supabase
- **Fournisseur** : Resend — smtp.resend.com:465, username: `resend`
- **Expéditeur** : `noreply@tangoleo.fr`
- **Limite** : 3000 emails/mois, 100/jour (plan gratuit Resend)
- **Domaine vérifié** : tangoleo.fr dans Resend → DNS Records tous en **Verified** ✅

### DNS d'authentification email (dans Cloudflare DNS)
| Type | Name | Contenu | Statut |
|------|------|---------|--------|
| TXT | `resend._domainkey` | `p=MIGf...` (clé DKIM Resend) | ✅ Verified |
| MX | `send` | `feedback-smtp.[...].amazonses.com` (priorité 10) | ✅ Verified |
| TXT | `send` | `v=spf1 include:[...].nses.com ~all` | ✅ Verified |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:ducloy.leo@gmail.com` | (optionnel, à ajouter) |

### URL Configuration Supabase (important)
- **Supabase → Authentication → URL Configuration**
- **Site URL** → `https://tangoleo.fr`
- **Redirect URLs** → `https://tangoleo.fr/**` et `https://www.tangoleo.fr/**`
- ⚠️ Si non configuré, les liens dans les emails de confirmation pointent vers l'ancienne URL Netlify

### Templates emails (français)
Les 4 templates Supabase (Confirmation, Invitation, Magic Link, Reset Password) ont été traduits en français avec branding Tangoléo. À configurer dans Supabase → Authentication → Email Templates.

### Fix comptes non confirmés (SQL à exécuter si besoin)
```sql
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;
```

---

## Bugs connus / non résolus
- **Toggle badge admin** : re-render de la modale fonctionne mais la surbrillance ne se met pas à jour visuellement en temps réel (workaround : fermer et rouvrir la modale). Décidé de laisser pour l'instant.

---

## Mises à jour v0.3

### Patterns Supabase importants
- ✅ `.catch()` sur PostgrestBuilder → **toujours** utiliser `{ error }` destructuring ou try/catch
- ✅ RLS policies : besoin d'INSERT/UPDATE explicites (le `FOR ALL USING` ne couvre pas tout)
- ✅ Admin notifications RLS : filtrer `user_id=null` côté client APRÈS la requête (pas possible en policy)

### Supabase Realtime (WebSocket)
```js
// Écouter les notifications en temps réel
const channel = db.channel('notifications').on(
  'postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
  payload => { handleNotification(payload.new); }
).subscribe();
```

### Calendrier (daily.html)
- `calMonth`, `calYear` : mois courant affiché
- `selectedCalDate` : date sélectionnée (YYYY-MM-DD, peut être invisible si autre mois)
- `_calAnimating`, `_calDragging` : flags pour éviter des actions concurrentes
- `_calSetSizes()` : réappelé après chaque `renderCalendar()` ET au resize
- `_calSnap()` : recentre le slider sur le slide courant (position relative en pixels)
- Tous les changes de mois : `loadMonthData(false)` → delay rendu → animate → `renderCalendar()` après

---

## Patterns importants à retenir

### Supabase JS v2
- `PostgrestBuilder` n'a PAS de `.catch()` — utiliser `{ error }` destructuring ou try/catch
- `FOR ALL USING` ne couvre pas INSERT — toujours créer des policies INSERT explicites

### CSS
- `.site-nav` : `display:grid; grid-template-columns:1fr auto 1fr` (logo centré)
- `.game-sub-bar` : même pattern 3 colonnes
- `.badge-chip.earned` : `border-color: rgba(245,200,66,.35); color: var(--sun)`
- Toggle mot de passe : `input[type="password"]::-webkit-credentials-auto-fill-button { visibility:hidden }` pour cacher l'icône Chrome

### Jeu
- Seed format 7 chars = puzzle généré (diff encodée dans les bits)
- Seed format 16 chars = puzzle custom (grille complète encodée)
- `isAssisted` : flag global remis à false à chaque `startGeneration()`

### Daily challenges & Calendrier
- **Dates** : format `YYYY-MM-DD` (ISO 8601, Paris timezone)
- **Helper** : `getParisTodayStr()` retourne la date du jour en Paris (resistant aux changements de fuseau horaire)
- **Timer persistance** : localStorage key `daily_timer_YYYY-MM-DD` stocke le timestamp de démarrage (pas la durée)
- **Cache mois** : `levelsCache[dateStr]` et `completionsCache[levelId]` peuplés par `loadMonthData()`
- **Animation calendrier** : 
  - Données chargées **avant** le snap (`loadMonthData(false)` sans render immédiat)
  - Rendu DOM **après** l'animation (dans `setTimeout` post-snap)
  - Élimine les scintillements et recalculs de layout pendant la transition
- **ResizeObserver** : recalcule slider width/height dès que `.cal-slider-outer` change de taille
- **Sélection stable** : `selectedCalDate` persiste même quand invisible (en changeant de mois)
