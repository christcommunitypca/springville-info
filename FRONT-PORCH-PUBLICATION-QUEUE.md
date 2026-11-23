# From My Front Porch — Weekly Publication Queue
Last editorial instruction: November 23, 2026. Time zone: America/Chicago.
This file is a schedule and release workflow, NOT blanket authorization for unreviewed columns.

## Approved and queued
- Date: 2026-12-01 (local calendar date; next scheduled editor run, approximately 8 AM).
- Title: When More Becomes the Measure.
- Status: OWNER APPROVED for publication on or after December 1, 2026. Specifically approved strong Christian version about sports becoming an idol, youth AND high school athletics, college-athlete ambitions, and our goal that children know and glorify Christ. Do not substitute older draft versions.
- Approved source: draft PR #2, branch `editorial/approved-sports-dec-2026`, exact file `front-porch/when-more-becomes-the-measure.html`. PR contains only this article; never merge before publication date.
- Homepage teaser: headline `When More Becomes the Measure`, short description `More practices, more games, more seasons. What are we teaching our children to love most?`, with link `/front-porch/when-more-becomes-the-measure.html`. Keep compact two-line summary and subtle `Pull up a chair` link.
- Reader email subject should include the title and go to `frontporch@springville.info`.

## Pending user review — NOT AUTHORIZED TO PUBLISH
- Proposed 2026-12-08: The Railroad Was Already Here (industrial/commerce park, rail, SR-23/I-59 roundabout proposal). Draft under review. NEVER publish without explicit later owner approval. Recheck status of any road funding or construction claim immediately before publication.
- Proposed 2026-12-15: Whatever Happened to Sunday Evening? (morning/evening sacrifices of praise and Lord's Day worship). Draft under review. NEVER publish without explicit later owner approval.

## Safe release steps (only for explicitly approved item when due)
1. Never run these steps early, and never publish a pending item. Never reduce or interfere with the existing daily Springville news/events/sports work. On the due date, read this queue from MAIN and verify the release state.
2. Inspect PR #2 metadata AND patch and confirm precisely one added article file at `front-porch/when-more-becomes-the-measure.html`, with the approved title and content themes. If unexpected changes/merge conflict, hold and alert owner rather than overwriting other content.
3. This specific PR #2 is an explicit, narrow exception to the general no-automatic-draft-merges rule, solely because the owner approved this article and its future publication. On or after 2026-12-01, mark it ready, merge it with expected head SHA; or safely copy its single approved article file to MAIN if PR merging is unavailable. Do not auto-merge any other draft.
4. Fetch LATEST MAIN versions of `index.html` and `front-porch/index.html`; update only the homepage From My Front Porch feature to point to the new article, and prepend the new article to the archive while retaining all old links. Preserve all live news, calendar, about, sports, analytics, CSS, and JS. Do not replace the homepage from a stale feature branch.
5. Add the new article's canonical URL to `sitemap.xml`. In `data/porch-community.json`, add the new article slug with `{"updatedAt":null,"paragraphs":[]}` while preserving all other articles and summaries.
6. Verify new page, homepage link, archive link, and routing `mailto:frontporch@springville.info` from MAIN, plus successful Cloudflare deployment. Report publication success only after deployment confirms. If any step fails, report exactly what succeeded and what remains.
7. Once published, update the status here to PUBLISHED (idempotent: never republish or duplicate). Wait for separate, explicit owner approval for each later week's piece. A date is NOT approval.
