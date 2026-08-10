import type { CardData } from '@/lib/types'
import { drawCard, BASE_SIZE } from './draw'
import { VARIANTS } from './variants'

/**
 * Two sizes deliberately. X crops anything that is not roughly 1.91:1 in a
 * link preview, so the OG variant renders the card centred on a green field
 * rather than reusing the square. See API Contract §2.5, invariant §6.
 */

function newCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas context unavailable')
  return { canvas, ctx }
}

function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('canvas.toBlob produced no data'))
    }, 'image/png')
  })
}

/** Square card, 1080x1080 — the downloadable / shareable PFP or ID card. */
export async function exportCard(data: CardData): Promise<Blob> {
  const { canvas, ctx } = newCanvas(BASE_SIZE * 2, BASE_SIZE * 2)
  drawCard(ctx, data, 2)
  return toPngBlob(canvas)
}

/**
 * OG frame, 1200x630. Reuses the same square composition (no duplicated
 * layout code) scaled down and centred on a brand-coloured field, since
 * 1200x630 isn't a crop of 1080x1080 — it's a different canvas.
 */
export async function exportOgCard(data: CardData): Promise<Blob> {
  const OG_W = 1200
  const OG_H = 630

  const square = newCanvas(BASE_SIZE * 2, BASE_SIZE * 2)
  drawCard(square.ctx, data, 2)

  const { canvas, ctx } = newCanvas(OG_W, OG_H)
  const palette = VARIANTS[data.variant]
  const g = ctx.createLinearGradient(0, 0, OG_W, OG_H)
  g.addColorStop(0, palette.bgFrom)
  g.addColorStop(1, palette.bgTo)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, OG_W, OG_H)

  const margin = 40
  const size = OG_H - margin * 2
  const x = (OG_W - size) / 2
  const y = margin
  ctx.drawImage(square.canvas, 0, 0, square.canvas.width, square.canvas.height, x, y, size, size)

  return toPngBlob(canvas)
}
