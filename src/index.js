/**
 * Cloudflare Workers script pour servir les fichiers SEO
 */

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://tangoleo.fr/</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://tangoleo.fr/daily.html</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://tangoleo.fr/tips.html</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://tangoleo.fr/login.html</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://tangoleo.fr/profile.html</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://tangoleo.fr/legal/mentions-legales.html</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://tangoleo.fr/legal/politique-confidentialite.html</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://tangoleo.fr/legal/cgu.html</loc>
    <lastmod>2026-06-06</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

const ROBOTS = `# Tangoléo — Directives pour les crawlers
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://tangoleo.fr/sitemap.xml`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Servir sitemap.xml
    if (pathname === '/sitemap.xml') {
      return new Response(SITEMAP, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=UTF-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Servir robots.txt
    if (pathname === '/robots.txt') {
      return new Response(ROBOTS, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=UTF-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Pour les autres requêtes, passer à Cloudflare Pages
    return new Response('Not found', { status: 404 });
  },
};
