/**
 * Storage adapter. Vercel Blob today; keep every provider detail behind
 * these three functions so swapping to R2 later is a one-file change.
 * See BACKEND_PRD §8, API Contract §4.
 *
 * NOTE (resolve in Phase 2): cardUrl/ogUrl must return the *actual* public
 * URL a crawler can fetch with no auth (invariant §6.3). A Vercel Blob
 * public store's host is `https://<store-id>.public.blob.vercel-storage.com`,
 * where <store-id> is embedded in BLOB_READ_WRITE_TOKEN
 * (`vercel_blob_rw_<storeId>_<secret>`). Deriving it from the token keeps
 * these two functions pure/sync, which the share page's generateMetadata
 * wants. If a custom domain is later mapped to the store, swap the derivation
 * below for the fixed domain — callers don't change.
 */
import { put } from '@vercel/blob'
import { getBlobToken } from './env'

function blobHost(): string {
  const token = getBlobToken()
  const storeId = token.split('_')[3]
  if (!storeId) {
    throw new Error('[blob] could not derive store id from BLOB_READ_WRITE_TOKEN')
  }
  return `https://${storeId}.public.blob.vercel-storage.com`
}

/**
 * Stores a PNG under `cards/{key}` and returns its public URL.
 * `key` already includes the filename, e.g. "abc123.png" or "abc123-og.png".
 */
export async function putCard(key: string, data: Blob): Promise<string> {
  const { url } = await put(`cards/${key}`, data, {
    access: 'public',
    contentType: 'image/png',
    addRandomSuffix: false,
    cacheControlMaxAge: 31536000, // 1 year, immutable — content never changes for a given id
    token: getBlobToken(),
  })
  return url
}

/** Public URL of the square (1080x1080) card for a given id. */
export function cardUrl(id: string): string {
  return `${blobHost()}/cards/${id}.png`
}

/** Public URL of the OG (1200x630) preview variant for a given id. */
export function ogUrl(id: string): string {
  return `${blobHost()}/cards/${id}-og.png`
}
