import type { CardData } from '@/lib/types'

/**
 * Synchronous and idempotent. Assumes fonts are already loaded and images
 * already decoded — it must never await, or the live preview will tear.
 * See API Contract §2.4 and invariant §6 ("drawCard never awaits").
 */
export function drawCard(ctx: CanvasRenderingContext2D, data: CardData, scale: number): void {
  // TODO(Phase 3):
  // - clear canvas, apply `scale` (1 for preview, 2 for export)
  // - switch on data.format: 'pfp' draws the frame variant around photos;
  //   'idcard' draws photo + name + role + title + number in badge layout
  // - switch on data.variant for palette/frame art (sunrise/midnight/sand/palm)
  // - handle 1-3 photos (solo vs team mode) without branching the whole function
  void ctx
  void data
  void scale
  throw new Error('not implemented — Phase 3')
}
