/**
 * GET /api/video — lets the frontend fetch the welcome-video URLs to embed
 * on the page, without hardcoding paths in more than one place. Same video
 * the id-card QR code (see /watch) points to.
 */
import { BASE_URL } from '@/lib/env'

export const runtime = 'edge'

export async function GET(): Promise<Response> {
  return Response.json({
    videoUrl: `${BASE_URL}/videos/welcome.mp4`,
    watchUrl: `${BASE_URL}/watch`,
  })
}
