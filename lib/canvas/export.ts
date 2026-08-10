import type { CardData } from '@/lib/types'
// Phase 3 will import: drawCard from './draw'

/**
 * Two sizes deliberately. X crops anything that is not roughly 1.91:1 in a
 * link preview, so the OG variant renders the card centred on a green field
 * rather than reusing the square. See API Contract §2.5, invariant §6.
 */

/** Square card, 1080x1080 — the downloadable / shareable PFP or ID card. */
export async function exportCard(data: CardData): Promise<Blob> {
  // TODO(Phase 3): offscreen canvas 1080x1080, drawCard(ctx, data, 2), toBlob('image/png')
  void data
  throw new Error('not implemented — Phase 3')
}

/** OG frame, 1200x630 — used only for the link-preview meta image. */
export async function exportOgCard(data: CardData): Promise<Blob> {
  // TODO(Phase 3): offscreen canvas 1200x630, card centred on brand field, toBlob('image/png')
  void data
  throw new Error('not implemented — Phase 3')
}
