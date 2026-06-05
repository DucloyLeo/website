# 🚀 Améliorations SEO — Tangoléo

## Phase 1 ✅ (LIVE)
- [x] Meta descriptions sur toutes les pages
- [x] Titles optimisés
- [x] Canonical URLs
- [x] sitemap.xml
- [x] robots.txt

## Phase 2 ✅ (LIVE)
- [x] Structured data (schema.org / JSON-LD)
  - WebApplication pour index.html
  - Game pour daily.html
  - Organization pour branding
- [x] Redirects (www → non-www)
- [x] Headers HTTP (caching, sécurité)
- [x] Cloudflare configuration (wrangler.toml, _headers)

## Phase 3 — Actions Manuelles (À faire sur Cloudflare)

### 1. **Google Search Console** (URGENT)
```
1. Aller sur https://search.google.com/search-console
2. Ajouter la propriété https://tangoleo.fr
3. Vérifier le domaine via DNS TXT record
4. Soumettre le sitemap.xml (Sitemaps → Ajouter un sitemap)
5. Demander un crawl de la page d'accueil
```

### 2. **Bing Webmaster Tools** (Recommandé)
```
https://www.bing.com/webmasters/
Ajouter le sitemap et soumettre les URLs
```

### 3. **Configuration Cloudflare DNS**
- **Type A** : tangoleo.fr → IP Cloudflare
- **CNAME** : www.tangoleo.fr → tangoleo.fr (ou A record)
- **MX Records** : Resend (si emails configurés)
- **TXT** : SPF, DKIM, DMARC pour emails

### 4. **Cloudflare Settings pour SEO**
- **Caching** : Page Rules pour `/index.html` = 1 heure max
- **Compression** : Activer Gzip + Brotli
- **Minification** : HTML, CSS, JS
- **Email Routing** : Pour noreply@tangoleo.fr (optionnel)

## Phase 4 — Optimisations Continues

### Image Optimization
```
- Ajouter og:image (1200×630px) aux pages
- Compresser images en WebP
- Ajouter alt text pertinent
```

### Page Speed
```
- Core Web Vitals (LCP, FID, CLS)
- Defer JS non-critique
- Lazy load images
- Minifier CSS/JS
```

### Backlinks & Branding
```
- Ajouter Tangoléo sur Product Hunt
- Soumettre à des répertoires de jeux gratuits
- Créer contenu viral (tutoriels, speedruns)
- Newsletter pour engagement
```

### Local SEO (optionnel)
```
- Google Business Profile (si applicable)
- Ajouter adresse/contact structurés
```

---

## Checklist immédiate

- [ ] Soumettre sitemap à Google Search Console
- [ ] Vérifier les redirects www→non-www fonctionnent
- [ ] Tester mobile responsiveness sur PageSpeed Insights
- [ ] Vérifier structured data avec https://validator.schema.org
- [ ] Configurer Bing Webmaster Tools

---

## Outils de suivi

- **Google Search Console** : https://search.google.com/search-console
- **PageSpeed Insights** : https://pagespeed.web.dev
- **Mobile-Friendly Test** : https://search.google.com/test/mobile-friendly
- **Schema Validator** : https://validator.schema.org
- **Lighthouse** : F12 → Lighthouse (dans Chrome)

---

## Estimé pour "tangoléo" dans Google

- **Avant Phase 1** : 0 résultats (domaine nouveau)
- **Après Phase 1** : Top 100 (dans 1-2 semaines)
- **Après Phase 2 + GSC** : Top 10-20 (dans 1 mois)
- **Après backlinks** : Top 3-5 (2-3 mois)

*Pour comparaison : "tango puzzle" = ~1M résultats. Tangoléo est un créneau spécifique.*
