# Backend PRD — HH Goa 2026 Frame / ID Card Generator

> Context document for a coding model. Everything needed to implement the backend
> without asking questions. Read §2 before writing any code — the scope is much
> smaller than it looks.

---

## 1. Situation

### 1.1 What this is for

Hacker House Goa 2026 (HHGoa) is a 247-builder residency run by 2:47PM Studio,
28–31 October 2026, Goa, India. Selection runs as rolling skill trials. This
backend supports **Task #1** of the Open Trials.

**Hard deadline: 11:59 pm, 13 August 2026.** Roughly three days of build time
remain. Scope decisions in this document are aggressive because of that.

### 1.2 The task being solved

Build a web tool where a user uploads a photo and instantly receives a branded
HH Goa 2026 graphic, downloadable and shareable to X.

Two output formats (either or both):
- **Format A — PFP frame:** branded frame wrapping the photo, usable as an X avatar.
- **Format B — Builder ID card:** photo + name + stack/role + generated builder
  title, laid out like an event badge.

The organiser's site adds a requirement absent from the PDF brief: the generator
must also be able to **combine 2–3 teammates into one frame**, and the X post
should include a short how-to.

### 1.3 Grading

Validity gate: the X post **must** contain `#FrameInGoa`. Missing hashtag = the
submission is thrown out regardless of code quality.

Scored by engagement on that post:

```
points = likes×1 + replies×2 + bookmarks×3 + retweets×4 + quotes×4 + views×0.02
score  = clamp(round(points / 500 × 100), 0, 100)
```

Current leaderboard top score is 59 (2.8K views). Most entries are under 10.

**Implication for the backend:** the only thing on the server that moves the score
is the OG link preview, because a link whose preview renders the actual card gets
dramatically more engagement than a bare URL. Nothing else server-side matters.

---

## 2. Scope

### 2.1 Why a backend exists at all

The image is composed **entirely in the browser** via Canvas. The client already
holds a finished PNG before the server is ever contacted.

The server exists for exactly one reason: **X's crawler does not execute
JavaScript.** When a link is posted, X fetches raw HTML and reads `og:image`. A
client-rendered canvas is invisible to it, producing a blank preview — which the
brief explicitly calls out as a failure condition.

### 2.2 In scope

- Accept a composed PNG from the client, store it, return a short public URL.
- Serve a share page at `/s/:id` carrying correct OG / Twitter Card meta tags.
- Serve the stored PNG publicly with correct content type and cache headers.

### 2.3 Explicitly out of scope

Do not build these. Each was considered and rejected.

| Rejected | Reason |
|---|---|
| Server-side image generation (`@vercel/og`, sharp, canvas) | Client already produced the PNG. Regenerating server-side duplicates the layout code in a second runtime and doubles the surface for bugs. |
| Database | The blob key *is* the record. No metadata is worth persisting for a 3-day trial. |
| Auth / login / signup | Brief prohibits any gate before the result. |
| User accounts, saved cards, history | No requirement, no score impact. |
| Image processing, cropping, resizing on server | Client responsibility. |
| Analytics, view counters | Score comes from X's metrics, not ours. |
| Rate limiting beyond a trivial IP cap | Traffic will be low; over-engineering costs build time. |
| Webhooks, queues, background jobs | Nothing is async. |

### 2.4 The bypass path

On mobile, `navigator.share({ files: [pngFile] })` attaches the image directly to
the tweet composer. **No server involvement.** Most traffic is mobile, so most
sessions never touch the backend.

The backend serves the desktop fallback and any browser without Web Share file
support. Build it, but understand it is the secondary path.

---

## 3. Stack

| Choice | Value | Note |
|---|---|---|
| Framework | Next.js 15, App Router | Colocates the frontend; `generateMetadata` makes OG tags trivial |
| Language | TypeScript, strict | |
| Runtime | Edge for upload route | Fast cold start; no Node APIs needed |
| Storage | Vercel Blob (preferred) or Cloudflare R2 | Adapter-isolated, swappable |
| Hosting | Vercel | |
| ID generation | `nanoid`, 10 chars | |

If deploying somewhere other than Vercel, use R2 with a public bucket and set the
custom domain — signed URLs will not work, see §6.3.

---

## 4. File layout

```
app/
  api/
    upload/
      route.ts            POST — store PNG, return share URL
  s/
    [id]/
      page.tsx            share page + generateMetadata (OG tags)
      not-found.tsx       unknown id fallback
lib/
  blob.ts                 storage adapter — putCard, cardUrl
  id.ts                   nanoid wrapper
  env.ts                  validated env access
```

Four implementation files. Anything beyond this is scope creep.

---

## 5. Endpoints

### 5.1 `POST /api/upload`

Stores a composed card, returns a shareable URL.

**Request** — `multipart/form-data`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `file` | File | yes | `image/png`, ≤ 4 MB. The square card, 1080×1080. |
| `og` | File | no | `image/png`, ≤ 4 MB. The 1200×630 preview variant. |

If `og` is absent, fall back to using `file` for the OG tag — the preview will be
cropped by X but still renders something.

**Response 200**

```json
{
  "id": "a7Kd92xLmQ",
  "shareUrl": "https://hhgoa-frame.vercel.app/s/a7Kd92xLmQ",
  "imageUrl": "https://<blob-host>/cards/a7Kd92xLmQ.png"
}
```

**Errors** — all return `{ "error": { "code": string, "message": string } }`

| Status | `code` | Condition |
|---|---|---|
| 400 | `NO_FILE` | `file` field missing from form data |
| 413 | `TOO_LARGE` | Payload above 4 MB |
| 415 | `BAD_TYPE` | MIME type is not `image/png` |
| 429 | `RATE_LIMITED` | More than 10 uploads/minute from one IP |
| 500 | `STORAGE_FAILED` | Blob write rejected |

**Implementation sketch**

```ts
export const runtime = 'edge'

export async function POST(req: Request) {
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return err(400, 'NO_FILE', 'file field missing')
  if (file.type !== 'image/png') return err(415, 'BAD_TYPE', 'png required')
  if (file.size > 4 * 1024 * 1024) return err(413, 'TOO_LARGE', 'max 4mb')

  const og = form.get('og')
  const id = newId()

  await putCard(`${id}.png`, file)
  if (og instanceof File) await putCard(`${id}-og.png`, og)

  return Response.json({
    id,
    shareUrl: `${BASE_URL}/s/${id}`,
    imageUrl: cardUrl(id),
  })
}
```

**Critical:** the client must treat every failure here as non-fatal. The user
already downloaded their image; a dead upload degrades the share to a text-only
tweet intent, it never blocks the flow.

---

### 5.2 `GET /s/:id`

The share page. Its visible content is secondary — its job is carrying meta tags.

**Required meta output**

```html
<meta property="og:image"        content="https://<host>/cards/<id>-og.png">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">
<meta property="og:title"        content="my hh goa 2026 builder card">
<meta property="og:description"  content="make yours. #FrameInGoa">
<meta property="og:type"         content="website">
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:image"       content="https://<host>/cards/<id>-og.png">
```

**Implementation sketch**

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { id } = await params
  const img = ogUrl(id)
  return {
    title: 'my hh goa 2026 builder card',
    description: 'make yours. #FrameInGoa',
    openGraph: {
      images: [{ url: img, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', images: [img] },
  }
}
```

**Page body must include:** the card image rendered visibly, and a prominent CTA
linking back to `/`. That link is the distribution loop — every person who opens
a shared card is a potential new post.

**Unknown id:** return 404 with a "make your own" page, never a blank body.

---

### 5.3 `GET /cards/:id.png`

Served by the blob provider directly, not by app code.

- `Content-Type: image/png`
- `Cache-Control: public, max-age=31536000, immutable`
- Public read, no auth, no signed-URL expiry

---

## 6. Failure modes to design against

These are the specific ways this backend breaks. Each one produces a blank
preview, which is the graded failure.

### 6.1 Relative URLs in meta tags
Crawlers silently drop them. Every OG URL must be absolute, including scheme.

### 6.2 `localhost` baked into the OG tag
The single most common cause of a blank preview. `NEXT_PUBLIC_BASE_URL` must be
the real deployed origin. Validate at startup that it does not contain
`localhost` when `NODE_ENV === 'production'`.

### 6.3 Signed or expiring image URLs
X's crawler cannot authenticate. If the storage provider hands back a signed URL,
the preview works for minutes then dies. Bucket must be publicly readable.

### 6.4 Wrong aspect ratio
`summary_large_image` expects ~1.91:1. A 1080×1080 square gets centre-cropped,
cutting off the top and bottom of the card. This is why the `og` variant exists.

### 6.5 X's preview cache
X caches previews per URL. A URL fetched before its image existed stays blank.
Since every card gets a fresh unguessable id, this is avoided by construction —
but never test with a reused id.

### 6.6 Edge runtime limits
Vercel Edge has a 4 MB request body cap. This is why the upload limit is 4 MB and
why the client should export at a reasonable quality rather than maximum.

---

## 7. Environment

```
NEXT_PUBLIC_BASE_URL    https://hhgoa-frame.vercel.app   # absolute, no trailing slash
BLOB_READ_WRITE_TOKEN   vercel_blob_rw_...               # server only, never NEXT_PUBLIC_
```

Validate both at module load. Fail loudly on missing values rather than producing
a silently broken OG tag.

---

## 8. Storage adapter

Two functions. Keep the provider behind them so swapping is one file.

```ts
// lib/blob.ts
export async function putCard(key: string, data: Blob): Promise<string>
export function cardUrl(id: string): string      // -> .../cards/{id}.png
export function ogUrl(id: string): string        // -> .../cards/{id}-og.png
```

| Concern | Decision | Reason |
|---|---|---|
| Key format | `cards/{id}.png`, `cards/{id}-og.png` | Flat, derivable from id, no lookup |
| ID | nanoid, 10 chars | Unguessable, URL-safe, no collision handling needed at this volume |
| Access | Public read | Crawler cannot authenticate |
| Cache | `immutable`, 1 year | Content never changes for a given id |
| Retention | None, or 30-day expiry | Nothing to clean up during a 3-day trial |

---

## 9. Invariants

Rules that hold across the whole system. Violating any of these fails the task
rather than merely degrading it.

1. No endpoint requires authentication. No login, no signup, no gate, anywhere.
2. The download path never touches the network — it must work with the server
   entirely offline.
3. Every share caption contains `#FrameInGoa`. Assert this in code.
4. Upload failure degrades the share flow; it never blocks a result the user
   already has.
5. OG image is 1200×630. The square card is never reused for previews.
6. All OG URLs are absolute and publicly fetchable without credentials.

---

## 10. Build order

1. `lib/env.ts`, `lib/id.ts`, `lib/blob.ts` — foundation, ~30 min
2. `POST /api/upload` — test with `curl -F file=@card.png`
3. `GET /s/[id]` with `generateMetadata`
4. Deploy to a real URL
5. **Validate with X's Card Validator using the live URL** — this is the only
   test that matters; local testing cannot verify OG behaviour
6. Wire the client fallback path

Step 5 is the acceptance criterion for the entire backend. If the card renders in
the validator preview, the backend is done. If it does not, nothing else built
here has value.

---

## 11. Acceptance checklist

- [ ] `POST /api/upload` with a valid PNG returns 200 and a working `shareUrl`
- [ ] Oversized, non-PNG, and missing-file requests return the correct error codes
- [ ] `GET /s/:id` HTML contains absolute `og:image` and `twitter:card`
- [ ] Pasting a `shareUrl` into X's Card Validator renders the actual card
- [ ] Pasting a `shareUrl` into a real tweet composer renders the actual card
- [ ] Unknown id returns a 404 page with a CTA, not a blank body
- [ ] Stored PNG is publicly fetchable in an incognito window
- [ ] Share page loads under 2s on mobile data
