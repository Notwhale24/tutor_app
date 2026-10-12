const PREFIX = '/supabase';
const API_PATH = /^\/(auth|rest|storage)\/v1(?:\/|$)/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== PREFIX && !url.pathname.startsWith(PREFIX + '/')) {
      return env.ASSETS.fetch(request);
    }

    const origin = request.headers.get('Origin');
    const allowedOrigins = new Set((env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));
    allowedOrigins.add(url.origin);
    if (origin && !allowedOrigins.has(origin)) {
      return new Response('Origin not allowed', { status: 403 });
    }
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin || url.origin,
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Expose-Headers': 'content-range, range, x-total-count',
      'Vary': 'Origin',
      'Cache-Control': 'no-store',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // The upstream is fixed by the Worker configuration, never by user input.
    const upstream = new URL(env.SUPABASE_URL);
    const apiPath = url.pathname.slice(PREFIX.length);
    if (!API_PATH.test(apiPath)) return new Response('Not found', { status: 404, headers: corsHeaders });
    upstream.pathname = apiPath;
    upstream.search = url.search;
    const headers = new Headers(request.headers);
    for (const name of ['host', 'cookie', 'origin', 'referer', 'connection']) headers.delete(name);
    // User authorization and the publishable key pass through unchanged.
    // Supabase still enforces authentication and row-level security.
    try {
      const response = await fetch(upstream, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'manual',
        signal: AbortSignal.timeout(120000),
      });
      const responseHeaders = new Headers(response.headers);
      responseHeaders.delete('set-cookie');
      for (const [name, value] of Object.entries(corsHeaders)) responseHeaders.set(name, value);
      return new Response(response.body, { status: response.status, headers: responseHeaders });
    } catch {
      return Response.json({ message: 'Supabase временно недоступен. Повторите подключение.' }, { status: 502, headers: corsHeaders });
    }
  },
};
