# Around Springville: private analytics setup and verification

The GitHub code for the private mobile-friendly readership dashboard is in:
- `functions/analytics.js`: /analytics page and the owner-authenticated JSON report.
- `functions/api/track.js`: first-party POST /api/track event collector.
- `assets/analytics.mjs`: tracks homepage views, unique article/event opens, and Share-button taps across the site's hash routes.
- `assets/owner-dashboard.mjs`: charts and rankings; fetches only the authenticated report.
- `index.html`: loads the tracker and explains anonymous site measurement.

**The dashboard is intentionally inaccessible until Cloudflare authentication and storage are configured.** A GitHub commit by itself does not provision the database or the login.

## Configure in the existing Cloudflare account (no paid analytics product needed)
1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/), select the account that hosts `springville.info`, and open **Storage & Databases → D1**. Create one database called `springville-info-analytics`.
2. Open **Workers & Pages → your Springville.Info Pages project → Settings → Bindings**, add a **D1 database binding** with variable name **`ANALYTICS_DB`**, selecting the database above. Apply to **production** and redeploy the site. The analytics Functions create the tables and indexes automatically on first use; no manual SQL is required.
3. Open **Zero Trust → Access controls → Applications → Add an application → Self-hosted**. Protect the hostname **`springville.info`** with path **`/analytics`**. Create an **Allow** policy including **only** the email **`hutchinsonfamily@gmail.com`**. Use Cloudflare One-time PIN login or the user's authenticated Google account. Do not choose Everyone or a whole-domain allow rule.
4. Copy this Access application's **Application Audience (AUD) tag** from the app's settings, and find your Cloudflare Access **team domain**, of the form `https://your-team.cloudflareaccess.com`.
5. On the Pages project **Settings → Variables and Secrets**, set:
   - `ACCESS_AUD` = the exact application AUD tag
   - `ACCESS_TEAM_DOMAIN` = the exact `https://your-team.cloudflareaccess.com` origin
   The owner email is checked in server code as `hutchinsonfamily@gmail.com`. Redeploy after setting the variables.
6. Confirm the site is reachable normally for the public. Visit **`https://springville.info/analytics`** as the owner, complete Cloudflare Access authentication, and check the first data after browsing a few article links. In a logged-out browser, the analytics page and report must be inaccessible. Verify that **`/analytics?report=1`** returns 403 for a visitor without a signed, verified Access JWT.

## What is measured
- Unique browsers, total page views, homepage hits, article reads, event reads.
- Top individual articles, Share-button taps per article, top approximate cities/regions/countries, referring channels and trends.
- Approximate repeat browsers: browsers observed on more than one calendar day, using a random ID in localStorage. It is not a count of real humans and can be affected by cleared storage, private browsing and multiple devices.
- No age estimation. Ordinary website requests don't reliably reveal ages; show **Not collected**.
- City is Cloudflare's coarse IP-derived city on the **server**. No IP address, precise coordinates, full referring URL, email or personal name is persisted in the analytics events table. Google Analytics is **not** required.
- Page view measurements begin **after** the D1 binding and collector are working. Historic per-article visits cannot be reconstructed from this system.
- Share taps count interactions with a Share button, **not proof a social network completed a share**.
- The collector skips Do Not Track browsers and obvious bots, so metrics are approximate.

## Security
- Both `/analytics` HTML and `/analytics?report=1` JSON verify the actual **Cloudflare Access JWT signature** against the configured team domain's JWKS, the exact AUD, expiration, and owner email. They fail closed when Cloudflare Access is absent or misconfigured. A spoofed email header or unauthenticated request is never enough.
- Do not publish the AUD/team settings as an attempt to bypass Cloudflare Access. They're app configuration, not user credentials; still manage them in Cloudflare's dashboard.
- Only the owner should have access to the private stats. The JS dashboard asset itself is ordinary public code and contains **no readership data**.
- The public `/api/track` accepts only short, validated, same-origin events. Never expose a public data-report endpoint or put reports in `data/content.json`.
- If a Cloudflare Pages build does not automatically deploy Functions, inspect its build configuration and deploy logs; a Git-connected project is required for Pages Functions. Do not claim tracking is collecting until it has been verified on the public site.

## Ongoing costs
Cloudflare D1 and Access offer free tiers with usage limits, but check actual account limits before expanding traffic. This setup avoids a paid Google Analytics product and keeps the admin interface simpler than GA4.
