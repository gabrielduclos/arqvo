interface Env {
  API_ORIGIN: string;
  // Private R2 binding. The Worker currently does not expose object routes.
  DOCS_BUCKET: unknown;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incoming = new URL(request.url);
    const supported = incoming.pathname.startsWith('/api/auth/') || incoming.pathname === '/api/me';

    if (incoming.pathname.startsWith('/api/')) {
      if (!supported) return Response.json({ error: 'not_found' }, { status: 404 });
      const base = new URL(env.API_ORIGIN);
      if (base.protocol !== 'https:' || base.pathname !== '/' || base.username || base.password) {
        return Response.json({ error: 'api_unavailable' }, { status: 503 });
      }
      const upstream = new URL(incoming.pathname + incoming.search, base);
      const forwarded = new Request(upstream.toString(), request);
      return fetch(forwarded, { redirect: 'manual' });
    }

    return env.ASSETS.fetch(request);
  }
};
