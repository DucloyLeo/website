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
├── tango.html              ← Redirect vers / (legacy)
├── login.html              ← Connexion / Inscription
├── profile.html            ← Profil utilisateur
├── tips.html               ← Conseils & stratégies
├── css/
│   └── common.css          ← Styles partagés
├── js/
│   ├── supabase-client.js  ← Init Supabase
│   └── auth.js             ← Helpers auth + stats + badges
├── admin/
│   ├── index.html          ← Dashboard admin
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

### Navigation
- Hamburger sur **toutes** les pages (auth.js global)
- Liens hamburger : 🎮 Jouer → 💡 Conseils → auth items
- Sur la page jeu : ✦ Nouvelle partie → 🎯 Difficulté → ⌨️ Commandes → 💡 Conseils → auth items → toggle "Mémoriser la difficulté"
- Logo "☀ Tangoléo 🌙" sur la page jeu = lien cliquable vers /index.html

---

## Informations légales

- **Propriétaire** : Ducloy Léo — ducloy.leo@gmail.com
- **Adresse** : Yvetot
- **Hébergeur frontend** : Cloudflare, Inc. — 101 Townsend St, San Francisco, CA 94107
- **BDD** : Supabase Inc., 970 Toa Payoh North, Singapore
- **Domaine** : OVH Cloud

---

## Bugs connus / non résolus
- **Toggle badge admin** : re-render de la modale fonctionne mais la surbrillance ne se met pas à jour visuellement en temps réel (workaround : fermer et rouvrir la modale). Décidé de laisser pour l'instant.

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
