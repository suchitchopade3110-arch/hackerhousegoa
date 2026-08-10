import type { CropRect } from '@/lib/types'

/**
 * Pure function, no canvas dependency, trivially unit-testable. Returns the
 * largest centred source rectangle matching the destination aspect ratio —
 * this is what removes the manual cropping step the brief prohibits.
 * See API Contract §2.3.
 */
export function coverCrop(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): CropRect {
  // TODO(Phase 3): implement. Sketch:
  // const srcRatio = srcW / srcH
  // const dstRatio = dstW / dstH
  // if (srcRatio > dstRatio) { // source wider than dest -> crop left/right
  //   const sh = srcH
  //   const sw = sh * dstRatio
  //   return { sx: (srcW - sw) / 2, sy: 0, sw, sh }
  // } else { // source taller than dest -> crop top/bottom
  //   const sw = srcW
  //   const sh = sw / dstRatio
  //   return { sx: 0, sy: (srcH - sh) / 2, sw, sh }
  // }
  throw new Error('not implemented — Phase 3')
}
