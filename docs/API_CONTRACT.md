# HACKER HOUSE GOA 2026 — TASK #1 — API Contract

Frame / ID Card Generator — frontend and backend interface definitions.

> Converted from `HHGoa_Task1_API_Contract.docx` for version control. Source
> of truth is the `.docx` if the two ever diverge.

This document defines every boundary in the app: what the client computes on
its own, what it sends to the server, and what comes back. Written so
frontend and backend can be built in parallel without either side guessing.

## 1. Architecture at a glance

The image is composed entirely in the browser. The server exists for one
reason: X's crawler does not run JavaScript, so a link preview needs a real
image URL sitting in a meta tag. Everything else is client-side.

| Layer  | Responsibility                              | Not responsible for       |
| ------ | -------------------------------------------- | -------------------------- |
| Client | Decode, crop, compose, export PNG, download, share | Persistence, meta tags |
| Server | Store PNG, serve OG share page              | Image generation, cropping, text |

**Request flow**

```
user picks photo
  -> [client] heic? convert -> decode -> cover-crop -> compose -> toBlob(png)
  -> [client] download  (terminal, no server)
  -> [client] share:
       mobile  : navigator.share({ files: [png] })   (no server)
       fallback: POST /api/upload -> { shareUrl }
                 -> window.open(intent/tweet?url=shareUrl)
                 -> X crawls GET /s/:id -> reads og:image
```

The server is only touched on the fallback share path. If Web Share
succeeds, no network call is made at all.

## 2. Client-side module contracts

Internal function signatures, not HTTP — each module can be built and
tested in isolation against them.

### 2.1 Shared types

```ts
type Format  = "pfp" | "idcard"
type Variant = "sunrise" | "midnight" | "sand" | "palm"

interface CardData {
  photos:  HTMLImageElement[]   // 1 for solo, 2-3 for team mode
  name:    string                // "" allowed; layout must not break
  role:    string                // stack or role, "" allowed
  title:   string                // generated builder title
  number:  number                // 1..247
  format:  Format
  variant: Variant
}

interface CropRect {
  sx: number; sy: number; sw: number; sh: number
}
```

### 2.2 `lib/heic.ts`

```ts
convertIfHeic(file: File): Promise<File>
```

Returns the file untouched when it is not HEIC. Throws `HeicDecodeError` on
failure so the UI can show a "try a JPG instead" message rather than a blank
card.

### 2.3 `lib/canvas/crop.ts`

```ts
coverCrop(srcW: number, srcH: number, dstW: number, dstH: number): CropRect
```

Pure function, no canvas dependency, trivially unit-testable. Returns the
largest centred source rectangle matching the destination aspect ratio. This
is what removes the manual cropping step the brief prohibits.

### 2.4 `lib/canvas/draw.ts`

```ts
drawCard(ctx: CanvasRenderingContext2D, data: CardData, scale: number): void
```

Synchronous and idempotent. Assumes fonts are already loaded and images
already decoded — it must never `await`, or the live preview will tear.

### 2.5 `lib/canvas/export.ts`

```ts
exportCard(data: CardData): Promise<Blob>     // square,   1080x1080
exportOgCard(data: CardData): Promise<Blob>   // og frame, 1200x630
```

Two sizes deliberately. X crops anything that is not roughly 1.91:1 in a
link preview, so the OG variant renders the card centred on a green field
rather than reusing the square.

### 2.6 `lib/titles.ts`

```ts
generateTitle(seed: string, nonce?: number): string
```

Deterministic on `(seed, nonce)`. Same name always yields the same first
title, so a reload does not silently change someone's card. The reroll
button increments `nonce`.

### 2.7 `lib/share.ts`

```ts
shareCard(blob: Blob, caption: string): Promise<ShareResult>

type ShareResult =
  | { via: "webshare" }
  | { via: "intent"; shareUrl: string }
  | { via: "failed"; reason: string }
```

Tries `navigator.share` with the file first. Falls back to upload plus tweet
intent. Caption must contain `#FrameInGoa` — assert it in the function,
since a missing hashtag invalidates the whole submission.

## 3. HTTP endpoints

### 3.1 `POST /api/upload`

Stores a composed card and returns a shareable URL. Called only on the
fallback share path.

**Request**

```
POST /api/upload
Content-Type: multipart/form-data

  file    File    required   image/png, max 4 MB
  og      File    optional   1200x630 variant for the preview
```

**Response 200**

```json
{
  "id": "a7Kd92xLmQ",
  "shareUrl": "https://<host>/s/a7Kd92xLmQ",
  "imageUrl": "https://<blob-host>/cards/a7Kd92xLmQ.png"
}
```

**Errors**

| Status | code             | When                                    |
| ------ | ---------------- | ---------------------------------------- |
| 400    | `NO_FILE`        | `file` field missing from the form data |
| 413    | `TOO_LARGE`      | Payload above 4 MB                      |
| 415    | `BAD_TYPE`       | MIME type is not `image/png`            |
| 429    | `RATE_LIMITED`   | More than 10 uploads per minute per IP  |
| 500    | `STORAGE_FAILED` | Blob write rejected                     |

```json
{ "error": { "code": "TOO_LARGE", "message": "image exceeds 4mb" } }
```

The client must treat every failure here as non-fatal: the download already
worked, so degrade to a text-only tweet intent rather than blocking the
user.

### 3.2 `GET /s/:id`

The share page. Its only real job is carrying meta tags that X can read; the
visible content is secondary.

```html
<meta property="og:image"        content="https://.../cards/:id.png">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">
<meta property="og:title"        content="my hh goa 2026 builder card">
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:image"       content="https://.../cards/:id.png">
```

- URLs must be absolute — relative paths are silently dropped by the
  crawler.
- Image must be publicly readable with no auth header or signed-URL expiry.
- Unknown id returns 404 with a "make your own" page, never a blank body.
- Page body should carry a visible CTA back to the tool — that link is the
  distribution loop.

### 3.3 `GET /cards/:id.png`

Served directly by the blob provider, not by the app. Requirements: public
read, immutable cache header, correct `image/png` content type. No app code
needed if the provider is configured correctly.

## 4. Storage adapter

Kept behind a two-function interface so the provider can be swapped in one
file.

```ts
// lib/blob.ts
putCard(id: string, data: Blob): Promise<string>   // returns public url
cardUrl(id: string): string
```

| Concern    | Decision           | Reason                                 |
| ---------- | ------------------ | --------------------------------------- |
| Key format | `cards/{id}.png`    | Flat namespace, no lookup needed       |
| ID         | nanoid, 10 chars    | Unguessable, URL-safe, no DB           |
| Access     | Public read         | Crawler cannot authenticate            |
| Cache      | `immutable`, 1 year | Content never changes per id           |
| Retention  | 30 days or none     | Nothing to clean up during the trial   |

No database. The blob key is the record — there is no metadata worth
persisting, and adding a database would be a day spent on nothing the task
grades.

## 5. Environment

```
NEXT_PUBLIC_BASE_URL   https://<host>      absolute base for og tags
BLOB_READ_WRITE_TOKEN  <token>             storage credential, server only
```

`NEXT_PUBLIC_BASE_URL` must be the real deployed origin, not localhost. An
OG tag pointing at localhost is the single most common reason a link
preview renders blank.

## 6. Contract invariants

Rules that hold across both sides. Violating any of these fails the task
rather than merely degrading it.

1. No endpoint requires authentication. There is no login, no signup, no
   gate at any point in the flow.
2. The download path never touches the network — it must work with the
   server entirely offline.
3. Every share caption contains `#FrameInGoa`. Assert this in code, not in
   review.
4. `drawCard` never awaits. Fonts and images resolve before it is called.
5. Upload failure degrades the share flow; it never blocks the result the
   user already has.
6. OG image is 1200x630. The square card is not reused for previews.

> **Note:** this doc's §4 signature (`putCard(id, data)`) is a simplified
> restatement of `BACKEND_PRD.md` §8, which uses `putCard(key, data)` where
> `key` already includes the filename (`{id}.png` / `{id}-og.png`) and adds
> a separate `ogUrl(id)` accessor. The implementation in
> [`lib/blob.ts`](../lib/blob.ts) follows the PRD version since it's what
> the upload-route sketch in PRD §5.1 actually calls.
