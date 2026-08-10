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

const baseUrl = required('NEXT_PUBLIC_BASE_URL').replace(/\/+$/, '')

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
