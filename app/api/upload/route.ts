/**
 * POST /api/upload — stores a composed card, returns a shareable URL.
 * Called only on the fallback share path (desktop / no Web Share file support).
 * See BACKEND_PRD §5.1, API Contract §3.1.
 */
import type { UploadErrorBody, UploadErrorCode } from '@/lib/types'
// Phase 2 will also import: newId from '@/lib/id', putCard/cardUrl from '@/lib/blob',
// BASE_URL from '@/lib/env'.

export const runtime = 'edge'

function err(status: number, code: UploadErrorCode, message: string): Response {
  const body: UploadErrorBody = { error: { code, message } }
  return Response.json(body, { status })
}

export async function POST(req: Request): Promise<Response> {
  // TODO(Phase 2):
  // 1. const form = await req.formData(); const file = form.get('file')
  //    if (!(file instanceof File)) return err(400, 'NO_FILE', ...)
  //    if (file.type !== 'image/png') return err(415, 'BAD_TYPE', ...)
  //    if (file.size > 4 * 1024 * 1024) return err(413, 'TOO_LARGE', ...)
  // 2. Rate limit: >10 uploads/min/IP -> err(429, 'RATE_LIMITED', ...)
  // 3. const og = form.get('og'); const id = newId()
  //    try { await putCard(`${id}.png`, file); if (og instanceof File) await putCard(`${id}-og.png`, og) }
  //    catch { return err(500, 'STORAGE_FAILED', ...) }
  // 4. return Response.json({ id, shareUrl: `${BASE_URL}/s/${id}`, imageUrl: cardUrl(id) })

  return err(500, 'STORAGE_FAILED', 'not implemented — Phase 2')
}
