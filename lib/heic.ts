/**
 * HEIC -> JPEG/PNG conversion so iPhone photos decode in Canvas.
 * See API Contract §2.2.
 */

export class HeicDecodeError extends Error {
  constructor(cause?: unknown) {
    super('Could not decode this HEIC file')
    this.name = 'HeicDecodeError'
    this.cause = cause
  }
}

/**
 * Returns the file untouched when it is not HEIC. Throws HeicDecodeError on
 * failure so the UI can show a "try a JPG instead" message rather than a
 * blank card.
 */
export async function convertIfHeic(file: File): Promise<File> {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name)

  if (!isHeic) return file

  // TODO(Phase 3): decode via a HEIC->JPEG library (e.g. heic2any) and wrap
  // any failure in HeicDecodeError.
  throw new HeicDecodeError('not implemented — Phase 3')
}
