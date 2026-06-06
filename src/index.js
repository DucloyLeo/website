// Empty worker - let Cloudflare Pages handle everything
export default {
  async fetch(request) {
    // Pass through to Cloudflare Pages
    return fetch(request);
  },
};
