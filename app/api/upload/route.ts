/**
 * POST /api/upload — stores a composed card, returns a shareable URL.
 * Called only on the fallback share path (desktop / no Web Share file support).
 * See BACKEND_PRD §5.1, API Contract §3.1.
 */
import { newId } from '@/lib/id'
import { putCard, cardUrl } from '@/lib/blob'
import { BASE_URL } from '@/lib/env'
import type { UploadErrorBody, UploadErrorCode, UploadResponse } from '@/lib/types'

export const runtime = 'edge'

const MAX_SIZE = 4 * 1024 * 1024 // 4 MB — also the Edge request body cap
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

/**
 * In-memory, per-isolate rate limit. Deliberately not correct across
 * multiple Edge regions/isolates — a real fix would use Upstash/KV, but the
 * PRD explicitly rejects over-engineering the rate limiter for a 3-day
 * trial at low traffic (§2.3). This still catches a single abusive client
 * hammering one region.
 */
const hits = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > RATE_LIMIT
}

function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

function err(status: number, code: UploadErrorCode, message: string): Response {
  const body: UploadErrorBody = { error: { code, message } }
  return Response.json(body, { status })
}

export async function POST(req: Request): Promise<Response> {
  if (isRateLimited(clientIp(req))) {
    return err(429, 'RATE_LIMITED', 'more than 10 uploads per minute from this IP')
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return err(400, 'NO_FILE', 'could not parse multipart form data')
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return err(400, 'NO_FILE', 'file field missing from form data')
  }
  if (file.type !== 'image/png') {
    return err(415, 'BAD_TYPE', 'file must be image/png')
  }
  if (file.size > MAX_SIZE) {
    return err(413, 'TOO_LARGE', 'file exceeds 4mb')
  }

  // `og` is optional — if absent, the share page falls back to `file` itself
  // for the OG tag (BACKEND_PRD §5.1). Validate it the same way when present.
  const og = form.get('og')
  if (og instanceof File) {
    if (og.type !== 'image/png') {
      return err(415, 'BAD_TYPE', 'og must be image/png')
    }
    if (og.size > MAX_SIZE) {
      return err(413, 'TOO_LARGE', 'og exceeds 4mb')
    }
  }

  const id = newId()

  try {
    await putCard(`${id}.png`, file)
    if (og instanceof File) {
      await putCard(`${id}-og.png`, og)
    }
  } catch (cause) {
    console.error('[upload] blob write failed', cause)
    return err(500, 'STORAGE_FAILED', 'could not store image')
  }

  const body: UploadResponse = {
    id,
    shareUrl: `${BASE_URL}/s/${id}`,
    imageUrl: cardUrl(id),
  }
  return Response.json(body)
}
