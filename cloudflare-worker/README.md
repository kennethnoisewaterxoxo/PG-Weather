# Sounding proxy (Cloudflare Worker)

The University of Wyoming site doesn't send CORS headers, so a browser page
can't read its data directly. This Worker fetches soundings on the app's
behalf and adds the missing headers. It only forwards to UWyo's sounding
endpoint, so it can't be used as an open proxy.

Cloudflare's free plan allows 100,000 requests/day, which is far more than this app needs.

## Deploy with the Cloudflare dashboard (no install needed)

1. Sign up or log in at https://dash.cloudflare.com (free).
2. Go to **Compute (Workers)** → **Workers & Pages** → **Create** → **Create Worker**
   (use the "Hello World" starter).
3. Name it, e.g. `pg-weather-proxy`, and click **Deploy**.
4. Click **Edit code**, delete the starter code, paste the contents of
   [`worker.js`](worker.js), then click **Deploy**.
5. Copy the Worker URL, e.g. `https://pg-weather-proxy.<your-subdomain>.workers.dev`.

## Deploy with Wrangler (command line)

```sh
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
```

## Connect the app

Set the URL at the top of `app.js`:

```js
const SOUNDING_PROXY_URL = 'https://pg-weather-proxy.<your-subdomain>.workers.dev';
```

Commit and push to `main`; GitHub Pages redeploys automatically.

## Test it

Open this in a browser (swap in your Worker URL). You should see the sounding
text, not an error:

```
https://pg-weather-proxy.<your-subdomain>.workers.dev/?datetime=2026-01-01%2012:00:00&id=73033&src=BUFR&type=TEXT:LIST
```
