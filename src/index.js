// Knight School: serves the static site, plus a tiny health route that tells the page
// which environment it is running in (so dev can show its striped banner).
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/health") {
      return Response.json({ ok: true, environment: env.APP_ENV || "production" }, { headers: { "cache-control": "no-store" } });
    }
    return env.ASSETS.fetch(request);
  },
};
