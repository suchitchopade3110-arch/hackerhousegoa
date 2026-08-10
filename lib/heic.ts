/**
 * HEIC -> JPEG conversion so iPhone photos decode in Canvas (Canvas/Image
 * cannot decode HEIC natively in most browsers). See API Contract §2.2.
 */

export class HeicDecodeError extends Error {
  constructor(cause?: unknown) {
    super('Could not decode this HEIC file')
    this.name = 'HeicDecodeError'
    this.cause = cause
  }
}

function looksLikeHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.hei[cf]$/i.test(file.name)
  )
}

/**
 * Returns the file untouched when it is not HEIC. Throws HeicDecodeError on
 * failure so the UI can show a "try a JPG instead" message rather than a
 * blank card.
 */
export async function convertIfHeic(file: File): Promise<File> {
  if (!looksLikeHeic(file)) return file

  try {
    // Dynamic import: heic2any touches browser-only globals at module init,
    // so it must never load during SSR/build.
    const heic2any = (await import('heic2any')).default
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
    const blob = Array.isArray(result) ? result[0] : result
    if (!blob) throw new Error('heic2any returned no output')
    return new File([blob], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' })
  } catch (cause) {
    throw new HeicDecodeError(cause)
  }
}
