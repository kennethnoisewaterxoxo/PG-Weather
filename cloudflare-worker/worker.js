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

        // Only real sounding data is cached. UWyo sometimes answers with a short
        // "The server is too busy" page, which must not be cached or passed off as data.
        const cache = caches.default;
        const cacheKey = new Request(`https://cache.pg-weather/?${params.toString()}`);
        const cached = await cache.match(cacheKey);
        if (cached) {
            return cached;
        }

        let body = '';
        let status = 502;
        for (let attempt = 0; attempt < 2; attempt++) {
            if (attempt > 0) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            try {
                const upstream = await fetch(upstreamUrl, {
                    headers: { 'User-Agent': 'PG-Weather Skew-T viewer (Cloudflare Worker)' }
                });
                status = upstream.status;
                body = await upstream.text();
            } catch (error) {
                status = 502;
                body = `Upstream fetch failed: ${error.message}`;
            }
            if (isSoundingData(status, body)) {
                break;
            }
        }

        const headers = new Headers(corsHeaders);
        headers.set('Content-Type', 'text/plain; charset=utf-8');

        if (!isSoundingData(status, body)) {
            headers.set('Cache-Control', 'no-store');
            const reason = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
            return new Response(`UWyo did not return sounding data (HTTP ${status}): ${reason}`, {
                status: status >= 400 ? status : 503,
                headers
            });
        }

        headers.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`);
        const response = new Response(body, { status: 200, headers });
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
    }
};

function isSoundingData(status, body) {
    return status === 200 && body.includes('PRES') && body.includes('HGHT') && body.includes('TEMP');
}
