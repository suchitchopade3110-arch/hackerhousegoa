# Architecture

## One-line summary

The card is composed entirely in the browser with Canvas. The server exists
solely so X's crawler (which doesn't run JS) can find a real `og:image` URL
when someone posts the share link. Nothing else touches the server.

## System diagram

```
                         ┌─────────────────────────────┐
                         │           Browser            │
                         │                               │
  photo ──▶ [heic.ts] ──▶ [crop.ts] ──▶ [draw.ts] ──▶ [export.ts]
                         │        (composes on <canvas>) │
                         │              │                │
                         │              ▼                │
                         │        finished PNG blob       │
                         └──────┬────────────┬───────────┘
                                │            │
                     mobile Web Share   desktop fallback
                     (no server call)        │
                                │       POST /api/upload
                                │             │
                                │             ▼
                                │   ┌───────────────────┐
                                │   │  Vercel Edge Fn     │
                                │   │  app/api/upload     │
                                │   │  -> lib/blob.ts      │
                                │   │  -> Vercel Blob      │
                                │   └─────────┬───────────┘
                                │             │ { id, shareUrl, imageUrl }
                                │             ▼
                                │      window.open(tweet intent, shareUrl)
                                │             │
                                ▼             ▼
                          tweet posted with #FrameInGoa
                                              │
                                    X's crawler fetches
                                              ▼
                                     GET /s/:id  (app/s/[id]/page.tsx)
                                     generateMetadata -> absolute og:image
                                              │
                                              ▼
                                   GET /cards/:id-og.png
                                   (served directly by Vercel Blob,
                                    public, immutable, no app code)
```

## Why the split is where it is

- **Everything image-related is client-only.** The PRD explicitly rejects
  server-side generation (`@vercel/og`, sharp) — regenerating the layout in
  a second runtime duplicates logic and doubles the bug surface. `lib/canvas/*`
  and `lib/heic.ts` never run on the server.
- **The server has exactly two jobs:** persist a PNG the client already
  finished, and serve HTML whose only interesting content is meta tags.
  Both are stateless — no DB, no auth, no queues (PRD §2.3).
- **Most traffic never reaches the server at all.** `navigator.share({ files })`
  on mobile attaches the image straight to the tweet composer. `POST
  /api/upload` only exists for the desktop / no-Web-Share-file-support path.
- **The blob key is the record.** `cards/{id}.png` / `cards/{id}-og.png` are
  derivable from the id alone — no lookup table, no metadata worth
  persisting for a 3-day trial.

## Two sizes, one reason

`exportCard` (1080×1080) is what the user downloads/shares directly.
`exportOgCard` (1200×630, ~1.91:1) exists only because X's `summary_large_image`
card center-crops anything off that ratio — reusing the square would clip
the top/bottom of the card in every link preview.

## Failure philosophy

Per invariant #4 (both docs): a failed upload degrades the share flow to a
text-only tweet intent — it never blocks the user, because the download
already succeeded before the server was ever contacted. The only thing that
can truly "fail the task" is a blank OG preview, which is why §6 of the PRD
(failure modes) and the acceptance checklist are built entirely around
verifying `og:image` resolves — absolute URL, real deployed origin, public
read, correct 1200×630 asset.

## Folder layout

```
app/
  layout.tsx                root layout
  page.tsx                  the tool itself (upload -> compose -> preview -> share)
  globals.css
  api/
    upload/
      route.ts              POST — store PNG, return share URL (edge runtime)
  s/
    [id]/
      page.tsx               share page + generateMetadata (OG tags)
      not-found.tsx           unknown id fallback

lib/
  types.ts                  CardData, Format, Variant, CropRect, HTTP DTOs
  env.ts                    validated env access (BASE_URL, blob token)
  id.ts                     nanoid wrapper (10 chars)
  blob.ts                   storage adapter — putCard, cardUrl, ogUrl
  heic.ts                   convertIfHeic
  titles.ts                 generateTitle
  share.ts                  shareCard (webshare -> upload+intent fallback)
  canvas/
    crop.ts                 coverCrop (pure, unit-testable)
    draw.ts                 drawCard (sync, never awaits)
    export.ts               exportCard, exportOgCard

components/                 presentational only; logic stays in lib/
public/frames/               static frame/badge art per variant
docs/                        PRD, API contract, this file, phase plan
```

## Stack

Next.js 15 (App Router) · TypeScript strict · Edge runtime for
`/api/upload` · Vercel Blob for storage · `nanoid` for ids · deploy target
Vercel.
