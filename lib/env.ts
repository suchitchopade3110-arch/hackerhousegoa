/**
 * Validated env access. Fail loudly at module load rather than producing a
 * silently broken OG tag. See BACKEND_PRD §6.2 and §7.
 */

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`[env] missing required env var: ${name}`)
  }
  return value
}

// Deliberately NOT `required('NEXT_PUBLIC_BASE_URL')`: Next.js only inlines
// NEXT_PUBLIC_ vars into the client bundle when referenced as a static
// `process.env.NEXT_PUBLIC_X` property access, not through a variable name.
// A dynamic lookup works server-side (real process.env at runtime) but
// silently reads `undefined` in the browser, even with .env.local set.
const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL
if (!rawBaseUrl) {
  throw new Error('[env] missing required env var: NEXT_PUBLIC_BASE_URL')
}
const baseUrl = rawBaseUrl.replace(/\/+$/, '')

if (process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/.test(baseUrl)) {
  throw new Error(
    '[env] NEXT_PUBLIC_BASE_URL must be the real deployed origin in production, not localhost. ' +
      'This is the #1 cause of a blank OG preview — see BACKEND_PRD §6.2.',
  )
}

if (!/^https?:\/\//.test(baseUrl)) {
  throw new Error('[env] NEXT_PUBLIC_BASE_URL must include a scheme (http/https).')
}

export const BASE_URL = baseUrl

/**
 * Blob token is only required on the server (upload route). Lazily validated
 * so this module can still be imported from client components without
 * throwing on a var that isn't present in the browser.
 */
export function getBlobToken(): string {
  return required('BLOB_READ_WRITE_TOKEN')
}
