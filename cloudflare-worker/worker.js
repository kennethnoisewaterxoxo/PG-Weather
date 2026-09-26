/**
 * Cloudflare Worker: CORS proxy for University of Wyoming soundings.
 *
 * The browser can't read weather.uwyo.edu directly (no CORS headers), so this
 * Worker fetches the sounding on the app's behalf and adds CORS headers.
 * It only forwards to the UWyo sounding endpoint, so it can't be abused as a
 * general-purpose open proxy.
 *
 * Usage: https://<your-worker>.workers.dev/?datetime=2026-01-01%2012:00:00&id=73033&src=BUFR&type=TEXT:LIST
 * (the query string is passed straight through to /wsgi/sounding)
 */

const UPSTREAM = 'https://weather.uwyo.edu/wsgi/sounding';
const ALLOWED_PARAMS = ['datetime', 'id', 'src', 'type'];

// Soundings don't change once published; cache briefly so recent,
// still-arriving soundings aren't stuck on an empty/partial response.
const CACHE_SECONDS = 600;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
};

export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }
        if (request.method !== 'GET') {
            return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        const incoming = new URL(request.url);
        const params = new URLSearchParams();
        for (const name of ALLOWED_PARAMS) {
            const value = incoming.searchParams.get(name);
            if (value !== null) params.set(name, value);
        }
        if (!params.get('datetime') || !params.get('id')) {
            return new Response('Missing required "datetime" and "id" parameters', {
                status: 400,
                headers: corsHeaders
            });
        }

        const upstreamUrl = `${UPSTREAM}?${params.toString()}`;

        let upstream;
        try {
            upstream = await fetch(upstreamUrl, {
                headers: { 'User-Agent': 'PG-Weather Skew-T viewer (Cloudflare Worker)' },
                cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true }
            });
        } catch (error) {
            return new Response(`Upstream fetch failed: ${error.message}`, {
                status: 502,
                headers: corsHeaders
            });
        }

        const headers = new Headers(corsHeaders);
        headers.set('Content-Type', upstream.headers.get('Content-Type') || 'text/plain; charset=utf-8');
        headers.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`);

        return new Response(upstream.body, { status: upstream.status, headers });
    }
};
