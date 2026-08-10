# Build plan — 4 phases

Deadline: **11:59pm, 13 August 2026.** This maps PRD §10's 6-step build
order onto 4 phases sized for parallel/sequential work over ~3 days.

Status legend: skeleton = stub file exists with correct signature + TODOs.
Every file below already exists in that state; each phase replaces its
TODOs with real logic.

---

## Phase 1 — Foundation ✅ skeleton + implementation done

**Files:** `lib/env.ts`, `lib/id.ts`, `lib/blob.ts`, `lib/types.ts`,
`next.config.ts`, `tsconfig.json`, `package.json`, `app/layout.tsx`,
`app/globals.css`, placeholder `app/page.tsx`.

These are config/plumbing, not business logic, so they're fully implemented
already (matches PRD's own "~30 min" estimate for this step).

**Exit criteria:** `npm install && npm run typecheck` passes.

---

## Phase 2 — Backend endpoints ✅ done

**Files:** `app/api/upload/route.ts`, `app/s/[id]/page.tsx`,
`app/s/[id]/not-found.tsx`.

**What's implemented:**
1. `POST /api/upload` — multipart parse, validation (`NO_FILE` / `BAD_TYPE`
   / `TOO_LARGE` for both `file` and optional `og`), in-memory per-IP rate
   limit (`RATE_LIMITED` after 10/min — deliberately not cross-region-correct,
   per PRD §2.3's "don't over-engineer this"), `putCard` both variants inside
   a try/catch (`STORAGE_FAILED`), returns `{ id, shareUrl, imageUrl }`.
2. `app/s/[id]/page.tsx` — `generateMetadata` resolves the OG image via
   `ogUrl(id)`, falling back to the square `cardUrl(id)` if the `og` variant
   was never uploaded (matches BACKEND_PRD §5.1's fallback note). Page body
   verifies the card actually exists (`HEAD` request) before rendering, and
   calls `notFound()` for malformed or missing ids — never a blank body.

**Verified locally** (`npm run build` + `npm run dev`, real dev server, no
mocks): all 5 error codes return correct status + body; rate limit trips
after the 10th request/min; malformed and nonexistent share ids both 404
through `not-found.tsx` instead of crashing, including when
`BLOB_READ_WRITE_TOKEN`/host is unreachable — `urlExists()` swallows fetch
failures rather than 500ing on a visitor.

**Not yet verified:** real Vercel Blob storage (needs a live token) and the
actual X Card Validator check — both are Phase 4.

**Exit criteria:** upload returns 200 with a working `shareUrl`; error
codes match the table in `docs/API_CONTRACT.md` §3.1; `/s/:id` HTML
contains absolute `og:image`/`twitter:card` tags (view-source, not
DevTools — meta tags must be in the initial HTML). ✅ all confirmed against
a local dev server; production-URL confirmation is Phase 4.

---

## Phase 3 — Client canvas engine + UI (skeleton only, logic pending)

**Files:** `lib/heic.ts`, `lib/canvas/crop.ts`, `lib/canvas/draw.ts`,
`lib/canvas/export.ts`, `lib/titles.ts`, `lib/share.ts`, real
`app/page.tsx`, `components/*`.

**Work:**
1. `coverCrop` — pure math, do this first, unit test it (contract calls it
   "trivially unit-testable").
2. `drawCard` — layout for both formats (`pfp`, `idcard`) × 4 variants ×
   1-3 photos (team mode). Never `await` inside it.
3. `exportCard` / `exportOgCard` — offscreen canvas at 1080² and 1200×630.
4. `convertIfHeic`, `generateTitle` (deterministic on seed+nonce, no
   `Math.random`), `shareCard` (Web Share first, upload+intent fallback,
   hashtag assertion).
5. Build the UI in `app/page.tsx` + `components/`: upload → variant/format
   pick → live preview (`drawCard` on every change) → download/share bar.

**Exit criteria:** solo and team (2-3 photo) cards render correctly for
both formats and all 4 variants; download works with the server killed
(invariant: offline-safe); share caption always contains `#FrameInGoa`.

---

## Phase 4 — Integration, deploy, validate

**Work:**
1. Wire the desktop fallback share path end-to-end against the real
   `/api/upload`.
2. Deploy to Vercel; set real `NEXT_PUBLIC_BASE_URL` (no localhost) and
   `BLOB_READ_WRITE_TOKEN`.
3. **Validate the live `shareUrl` with X's Card Validator** — this is the
   acceptance gate for the whole backend per PRD §10 step 5. If the card
   renders there, the backend is done.
4. Paste a `shareUrl` into a real tweet composer and confirm the preview
   renders.
5. Run the full acceptance checklist (PRD §11) end to end.

**Exit criteria:** every box in PRD §11 checked, on the deployed URL, not
localhost.

---

## Explicitly not a phase

Nothing here is async, so there's no "phase 5" for queues/webhooks/DB — the
scope document rules those out entirely (PRD §2.3). Resist adding them even
if there's spare time before the deadline; that time is better spent
polishing the canvas layout, which is what's actually visible in the
graded X post.
