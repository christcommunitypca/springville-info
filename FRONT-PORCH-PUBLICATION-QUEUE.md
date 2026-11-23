# From My Front Porch — Weekly Publication Queue
Last editorial instruction: November 23, 2026 (Dec 8 commerce park column additionally approved). Time zone: America/Chicago.
This file is a schedule and release workflow, NOT blanket authorization for unreviewed columns.

## Approved and queued
- Date: 2026-12-01 (local calendar date; next scheduled editor run, approximately 8 AM).
- Title: When More Becomes the Measure.
- Status: OWNER APPROVED for publication on or after December 1, 2026. Specifically approved strong Christian version about sports becoming an idol, youth AND high school athletics, college-athlete ambitions, and our goal that children know and glorify Christ. Do not substitute older draft versions.
- Approved source: draft PR #2, branch `editorial/approved-sports-dec-2026`, exact file `front-porch/when-more-becomes-the-measure.html`. PR contains only this article; never merge before publication date.
- Homepage teaser: headline `When More Becomes the Measure`, short description `More practices, more games, more seasons. What are we teaching our children to love most?`, with link `/front-porch/when-more-becomes-the-measure.html`. Keep compact two-line summary and subtle `Pull up a chair` link.
- Reader email subject should include the title and go to `frontporch@springville.info`.

- Date: 2026-12-08 (local calendar date; next scheduled editor run, approximately 8 AM).
- Title: More Than a Railroad Crossing.
- Status: OWNER APPROVED for publication on or after December 8, 2026. Author-approved final version: personal opening ('I've been part of those conversations'), active Springville Commerce Park preparation, rail/I-59 development and future employer hopes, personal safety experiences (one child hit, another run off road by 18-wheeler without contact), and thoughtful consideration of the roundabout and bridge-project planning. Preserve exact approved prose. Do not substitute the older 'The Railroad Was Already Here' draft.
- Approved source: draft PR #3, branch `editorial/approved-commerce-park-dec-2026`, exact file `front-porch/more-than-a-railroad-crossing.html`. PR contains only this article; never merge before publication date.
- Article's display date: December 8, 2026. Keep the Anniston Star link on the words 'proposed roundabout', URL https://www.annistonstar.com/the_st_clair_times/county-officials-seek-funding-for-roundabouts/article_9162faa7-3d6b-4231-9597-2e8a5d8f1fb0.html.
- Homepage teaser: headline `More Than a Railroad Crossing`, short description `The railroad has always been here. Now it's helping shape Springville's future.`, with link `/front-porch/more-than-a-railroad-crossing.html`. Keep compact two-line summary and subtle `Pull up a chair` link.
- Reader email subject should include the title and go to `frontporch@springville.info`.

## Pending user review — NOT AUTHORIZED TO PUBLISH
- Proposed 2026-12-15: Whatever Happened to Sunday Evening? (morning/evening sacrifices of praise and Lord's Day worship). Draft under review. NEVER publish without explicit later owner approval.

## Safe release steps (only for explicitly approved item when due)
1. Never run these steps early, and never publish a pending item. Never reduce or interfere with the existing daily Springville news/events/sports work. On the due date, read this queue from MAIN and verify the release state.
2. Match today's due OWNER-APPROVED release to its EXACT PR, branch and article path: Dec 1 PR #2 `front-porch/when-more-becomes-the-measure.html`; Dec 8 PR #3 `front-porch/more-than-a-railroad-crossing.html`. Inspect the PR metadata AND file patch, confirm precisely one added article and the approved title/content/date, and verify current MAIN does not already contain it. If unexpected changes, failed fact check, or merge conflict, hold and alert the owner rather than overwriting other content.
3. PR #2 on/after Dec 1 and PR #3 on/after Dec 8 are the ONLY explicit, narrow exceptions to the no-automatic-draft-merges rule, solely because the owner approved these exact articles and their future publication. On the respective due date, mark only that due PR ready, merge with expected head SHA; or safely copy its single approved article file to MAIN if PR merging is unavailable. Never merge early or auto-merge any other draft.
4. Fetch LATEST MAIN versions of `index.html` and `front-porch/index.html`; update ONLY the existing homepage From My Front Porch feature to point to the new article, and prepend the new article to the archive while retaining all old links. CRITICAL: The homepage also has an independent top `#didyouknow-feature` card in `.home-features` that MUST remain above Front Porch. Do not replace, remove, duplicate or suppress Did You Know, and do not alter its data-driven `assets/around.mjs` rendering. Preserve all live news, calendar, about, sports, analytics, CSS, and JS. Do not replace the homepage from a stale feature branch.
5. Add the new article's canonical URL to `sitemap.xml`. In `data/porch-community.json`, add the new article slug with `{"updatedAt":null,"paragraphs":[]}` while preserving all other articles and summaries.
6. Verify new page, homepage link, archive link, and routing `mailto:frontporch@springville.info` from MAIN, plus successful Cloudflare deployment. Report publication success only after deployment confirms. If any step fails, report exactly what succeeded and what remains.
7. Once published, update only its queue status here to PUBLISHED (idempotent: never republish or duplicate). Wait for separate, explicit owner approval for the Dec 15 and any later pieces. A date is NOT approval.
