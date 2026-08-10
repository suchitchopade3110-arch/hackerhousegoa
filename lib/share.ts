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

export async function shareCard(blob: Blob, caption: string): Promise<ShareResult> {
  assertHashtag(caption)

  // TODO(Phase 3):
  // 1. If navigator.share + navigator.canShare({ files }) supports the file,
  //    await navigator.share({ files: [file], text: caption }) -> { via: 'webshare' }
  // 2. Else POST /api/upload (multipart: file + og). On success, open
  //    https://twitter.com/intent/tweet?text=<caption>&url=<shareUrl>
  //    -> { via: 'intent', shareUrl }
  // 3. Any failure along the way -> { via: 'failed', reason } — never throw,
  //    per invariant: "Upload failure degrades the share flow; it never
  //    blocks the result the user already has."
  void blob
  throw new Error('not implemented — Phase 3')
}
