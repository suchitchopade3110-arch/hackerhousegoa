import type { UploadErrorBody, UploadResponse } from '@/lib/types'

/**
 * Tries navigator.share with the file first. Falls back to upload plus tweet
 * intent. Caption must contain #FrameInGoa — asserted here since a missing
 * hashtag invalidates the whole submission. See API Contract §2.7, invariant §6.
 */

export type ShareResult =
  | { via: 'webshare' }
  | { via: 'intent'; shareUrl: string }
  | { via: 'failed'; reason: string }

const HASHTAG = '#FrameInGoa'

function assertHashtag(caption: string): void {
  if (!caption.includes(HASHTAG)) {
    throw new Error(`share caption must contain ${HASHTAG}`)
  }
}

function canWebShareFile(file: File): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  )
}

/**
 * Uploads the square card and opens a tweet intent pointing at the share
 * page. Per invariant: "Upload failure degrades the share flow; it never
 * blocks the result the user already has" — every failure here resolves to
 * `{ via: 'failed' }` rather than throwing, since the caller's download
 * already succeeded before this ever runs.
 */
async function shareViaIntent(file: File, caption: string, ogFile?: File): Promise<ShareResult> {
  try {
    const form = new FormData()
    form.append('file', file)
    if (ogFile) form.append('og', ogFile)

    const res = await fetch('/api/upload', { method: 'POST', body: form })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as UploadErrorBody | null
      return { via: 'failed', reason: body?.error?.message ?? `upload failed (${res.status})` }
    }

    const data = (await res.json()) as UploadResponse
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(data.shareUrl)}`
    if (typeof window !== 'undefined') {
      window.open(tweetUrl, '_blank', 'noopener,noreferrer')
    }
    return { via: 'intent', shareUrl: data.shareUrl }
  } catch (cause) {
    return { via: 'failed', reason: cause instanceof Error ? cause.message : 'unknown upload error' }
  }
}

/**
 * `ogBlob` is an addition on top of the API Contract §2.7 signature
 * (`shareCard(blob, caption)`), added backward-compatibly as an optional
 * trailing param. Without it, a missing `og` upload would silently trip
 * invariant §6 ("OG image is 1200x630, the square card is never reused for
 * previews") on every desktop share — the fallback in BACKEND_PRD §5.1 is
 * meant for og-upload *failure*, not for never sending it. Mobile Web Share
 * doesn't need it: no server is touched on that path at all.
 */
export async function shareCard(blob: Blob, caption: string, ogBlob?: Blob): Promise<ShareResult> {
  assertHashtag(caption)

  const file = new File([blob], 'hhgoa-2026-card.png', { type: 'image/png' })

  if (canWebShareFile(file)) {
    try {
      await navigator.share({ files: [file], text: caption })
      return { via: 'webshare' }
    } catch (cause) {
      // User-cancelled share sheet is not a failure worth falling back for —
      // they saw the sheet and chose not to post.
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        return { via: 'failed', reason: 'cancelled' }
      }
      // Any other Web Share failure (e.g. no compatible app) falls through
      // to the upload+intent path below.
    }
  }

  const ogFile = ogBlob ? new File([ogBlob], 'hhgoa-2026-og.png', { type: 'image/png' }) : undefined
  return shareViaIntent(file, caption, ogFile)
}
