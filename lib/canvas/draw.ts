import type { CardData } from '@/lib/types'
import { coverCrop } from './crop'
import { VARIANTS, type Palette } from './variants'

/**
 * Logical (unscaled) size everything below is drawn in. The caller creates a
 * canvas of `BASE_SIZE * scale` pixels and calls `ctx.scale(scale, scale)`
 * first — preview uses scale=1 (crisp at small size), exportCard uses
 * scale=2 (-> 1080x1080). Same layout code either way.
 */
export const BASE_SIZE = 540

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Synchronous and idempotent. Assumes fonts are already loaded and images
 * already decoded — it must never await, or the live preview will tear.
 * See API Contract §2.4 and invariant §6 ("drawCard never awaits").
 */
export function drawCard(ctx: CanvasRenderingContext2D, data: CardData, scale: number): void {
  ctx.save()
  ctx.scale(scale, scale)
  ctx.clearRect(0, 0, BASE_SIZE, BASE_SIZE)

  const palette = VARIANTS[data.variant]
  drawBackground(ctx, palette)

  if (data.format === 'pfp') {
    drawPfp(ctx, data, palette)
  } else {
    drawIdCard(ctx, data, palette)
  }

  ctx.restore()
}

function drawBackground(ctx: CanvasRenderingContext2D, palette: Palette): void {
  const g = ctx.createLinearGradient(0, 0, BASE_SIZE, BASE_SIZE)
  g.addColorStop(0, palette.bgFrom)
  g.addColorStop(1, palette.bgTo)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, BASE_SIZE, BASE_SIZE)
}

/** Splits a rect into `count` equal vertical stripes (1-3). Used for both
 * the pfp circle crop and the id-card photo box — team mode shows 2-3
 * teammates as side-by-side slices rather than needing a bespoke layout
 * per photo count. */
function equalStripes(count: number, area: Rect): Rect[] {
  const n = Math.max(1, Math.min(3, count))
  const stripeW = area.w / n
  return Array.from({ length: n }, (_, i) => ({
    x: area.x + i * stripeW,
    y: area.y,
    w: stripeW,
    h: area.h,
  }))
}

function drawPhoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, rect: Rect): void {
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  const crop = coverCrop(srcW, srcH, rect.w, rect.h)
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, rect.x, rect.y, rect.w, rect.h)
}

function drawPfp(ctx: CanvasRenderingContext2D, data: CardData, palette: Palette): void {
  const pad = 30
  const diameter = BASE_SIZE - pad * 2
  const cx = BASE_SIZE / 2
  const cy = BASE_SIZE / 2
  const r = diameter / 2

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()

  const photos = data.photos.slice(0, 3)
  const slots = equalStripes(photos.length, { x: cx - r, y: cy - r, w: diameter, h: diameter })
  photos.forEach((img, i) => {
    const slot = slots[i]
    if (slot) drawPhoto(ctx, img, slot)
  })
  ctx.restore()

  ctx.lineWidth = 16
  ctx.strokeStyle = palette.accent
  ctx.beginPath()
  ctx.arc(cx, cy, r - 8, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = palette.text
  ctx.textAlign = 'center'
  ctx.font = '700 22px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText('HH GOA 2026', cx, BASE_SIZE - 16)
}

function drawIdCard(ctx: CanvasRenderingContext2D, data: CardData, palette: Palette): void {
  const M = 24 // outer margin

  // header bar
  ctx.fillStyle = palette.accent
  ctx.fillRect(0, 0, BASE_SIZE, 64)
  ctx.fillStyle = palette.headerText
  ctx.font = '700 18px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('HACKER HOUSE GOA 2026', M, 38)
  ctx.textAlign = 'right'
  ctx.fillText(`#${String(Math.min(Math.max(data.number, 1), 247)).padStart(3, '0')}`, BASE_SIZE - M, 38)

  // photo box (rounded rect), team mode = vertical stripes inside it
  const photoArea: Rect = { x: M, y: 88, w: BASE_SIZE - M * 2, h: 250 }
  const radius = 16
  ctx.save()
  roundedRectPath(ctx, photoArea, radius)
  ctx.clip()
  const photos = data.photos.slice(0, 3)
  const slots = equalStripes(photos.length, photoArea)
  if (photos.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(photoArea.x, photoArea.y, photoArea.w, photoArea.h)
  } else {
    photos.forEach((img, i) => {
      const slot = slots[i]
      if (slot) drawPhoto(ctx, img, slot)
    })
  }
  ctx.restore()

  ctx.lineWidth = 3
  ctx.strokeStyle = palette.accent
  roundedRectPath(ctx, photoArea, radius)
  ctx.stroke()

  // name / role / title
  let y = photoArea.y + photoArea.h + 46
  ctx.textAlign = 'left'
  ctx.fillStyle = palette.text
  ctx.font = '700 30px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText(data.name.trim() || 'Builder', M, y)

  y += 32
  ctx.font = '400 18px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText(data.role.trim() || '—', M, y)

  y += 38
  ctx.fillStyle = palette.accent
  ctx.font = 'italic 700 20px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText(data.title, M, y)
}

function roundedRectPath(ctx: CanvasRenderingContext2D, rect: Rect, radius: number): void {
  const { x, y, w, h } = rect
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
