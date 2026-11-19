# Deploy and keep updating Springville.Info

## A. Recommended launch: GitHub → Cloudflare Pages (automatic updates)

1. Make sure Cloudflare has activated the nameserver change for `springville.info` (separate from transferring the domain registrar).
2. Create a **new, separate** GitHub repository named `springville-info` under the connected `christcommunitypca` GitHub account. Do not use or alter any church website repository. Upload the CONTENTS of this site folder (not the ZIP as one file) or use ChatGPT's connected GitHub tool once the new repository exists.
3. In Cloudflare: **Workers & Pages → Create application → Pages → Connect to Git**. Select the `springville-info` repository. Production branch: `main`; framework preset: `None`; build command: blank; build output directory: `.` (repository root).
4. Deploy. In that Pages project's **Custom domains**, add `springville.info`, then optionally `www.springville.info`. Follow Cloudflare's DNS prompts. Do **not** just create a standalone CNAME without first associating the domain with the Pages project.
5. Verify `https://springville.info`, `/news.html`, `/events.html`, `/directory.html`, and `/share.html` over HTTPS. Confirm the existing email DNS records are preserved if the domain receives mail.
6. Only **after** the new Pages site is live, update the existing Springville.Info Daily Editor automation using `DAILY-EDITOR-PROMPT.md`. Commits of `data/content.json` to `main` will redeploy the site automatically.

## B. Manual alternative: Cloudflare Pages Direct Upload

Cloudflare also supports uploading `Springville-Info-Cloudflare-Pages.zip` straight to a **Direct Upload** Pages project. This can launch the website quickly, but **it cannot later be switched to Git integration**; you'd have to create a replacement project for built-in automatic deploys. Because daily automated news is important for this project, choose the Git-connected approach above rather than Direct Upload unless you intentionally want a manual launch.

## C. Ongoing editorial workflow

For each scheduled run:
- Read and preserve `data/content.json` and compare against all stored items before changing anything.
- Research only genuinely relevant Springville, Alabama news and events. Primary municipal, school, library and organizer sources preferred.
- Ensure date, location, source URL and facts are verified. Skip uncertain/cancelled events and unverified claims; don't copy full articles.
- Add a concise original news summary to `news`, or an event with ISO `startDate` and `endDate` to `events`. Remove expired events only if you want archive cleanup; the frontend automatically hides events after their end date.
- Keep `id` unique and `slug` URL-safe. Use `date` as the original article date, not the current run date.
- Change `site.updatedAt` only if content actually changed.
- Validate JSON syntax and all required fields; run `python3 scripts/validate_content.py` when a shell is available.
- Commit the JSON to GitHub once (no other site changes) and report exactly what was added/edited, or report no verified change.
- Never edit or deploy `christcommunitypca.com` or its repository.

## Security and cost

Static Pages hosting is free within Cloudflare's limits. There are no API keys in frontend assets and no paid dependencies. A custom domain does not require a Wix subscription. The domain's registrar renewal is separate and remains payable.

Cloudflare docs: https://developers.cloudflare.com/pages/get-started/direct-upload/ and https://developers.cloudflare.com/pages/configuration/custom-domains/
