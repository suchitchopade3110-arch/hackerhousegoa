/**
 * Main tool: upload -> compose -> preview -> download/share.
 * See API Contract §1 (request flow) and §2 (module contracts).
 */
'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CardData, Format, Variant } from '@/lib/types'
import { convertIfHeic, HeicDecodeError } from '@/lib/heic'
import { drawCard, BASE_SIZE } from '@/lib/canvas/draw'
import { exportCard, exportOgCard } from '@/lib/canvas/export'
import { generateTitle } from '@/lib/titles'
import { shareCard } from '@/lib/share'
import { loadQrImage } from '@/lib/qr'
import { BASE_URL } from '@/lib/env'

const VARIANT_OPTIONS: Variant[] = ['sunrise', 'midnight', 'sand', 'palm']
const VARIANT_SWATCH: Record<Variant, string> = {
  sunrise: 'linear-gradient(135deg, #2b0f1e, #ff6b4a)',
  midnight: 'linear-gradient(135deg, #05061a, #3a1c71)',
  sand: 'linear-gradient(135deg, #f4e7c9, #bc8a5f)',
  palm: 'linear-gradient(135deg, #04241a, #0b6e4f)',
}

const CAPTION = 'my hh goa 2026 builder card. make yours. #FrameInGoa'

function decodeImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('could not decode image'))
    img.src = URL.createObjectURL(file)
  })
}

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [photos, setPhotos] = useState<(HTMLImageElement | null)[]>([null])
  const [format, setFormat] = useState<Format>('pfp')
  const [variant, setVariant] = useState<Variant>('sunrise')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [nonce, setNonce] = useState(0)
  const [number] = useState(() => Math.floor(Math.random() * 247) + 1)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'download' | 'share' | null>(null)
  const [lastShareUrl, setLastShareUrl] = useState<string | null>(null)
  const [qrImage, setQrImage] = useState<HTMLImageElement | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const title = useMemo(() => generateTitle(name.trim() || 'builder', nonce), [name, nonce])

  const cardData: CardData = useMemo(
    () => ({
      photos: photos.filter((p): p is HTMLImageElement => p !== null),
      name,
      role,
      title,
      number,
      format,
      variant,
    }),
    [photos, name, role, title, number, format, variant],
  )

  // QR code for the id card, generated once — it always points at the same
  // fixed /watch URL (see lib/qr.ts), so there's nothing to regenerate per
  // edit. Non-fatal on failure: the card still renders fine without it.
  useEffect(() => {
    let cancelled = false
    loadQrImage(`${BASE_URL}/watch`)
      .then((img) => {
        if (!cancelled) setQrImage(img)
      })
      .catch((cause) => {
        console.error('[qr] could not generate watch QR', cause)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Welcome-video URL for the on-page preview below — served from
  // GET /api/video so the path lives in one place. Purely additive to the
  // page; the id card's QR embeds the /watch URL directly (see lib/qr.ts).
  useEffect(() => {
    let cancelled = false
    fetch('/api/video')
      .then((res) => res.json())
      .then((data: { videoUrl?: string }) => {
        if (!cancelled && data.videoUrl) setVideoUrl(data.videoUrl)
      })
      .catch((cause) => {
        console.error('[video] could not load video url', cause)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Live preview: drawCard is sync and never awaits, so this can run
  // directly in the effect body without tearing (API Contract §2.4).
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawCard(ctx, cardData, 1, qrImage)
  }, [cardData, qrImage])

  const handleFile = useCallback(async (index: number, file: File) => {
    setError(null)
    try {
      const converted = await convertIfHeic(file)
      const img = await decodeImage(converted)
      setPhotos((prev) => {
        const next = [...prev]
        next[index] = img
        return next
      })
    } catch (cause) {
      setError(
        cause instanceof HeicDecodeError
          ? 'Could not read that HEIC photo — try exporting as JPG first.'
          : 'Could not load that photo — try a different file.',
      )
    }
  }, [])

  const addSlot = useCallback(() => {
    setPhotos((prev) => (prev.length >= 3 ? prev : [...prev, null]))
  }, [])

  const removeSlot = useCallback(() => {
    setPhotos((prev) => (prev.length <= 1 ? prev : prev.slice(0, -1)))
  }, [])

  const hasPrimaryPhoto = photos[0] !== null

  const handleDownload = useCallback(async () => {
    setError(null)
    setBusy('download')
    try {
      const blob = await exportCard(cardData, qrImage)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hhgoa-2026-${cardData.format}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Download never touches the network — a failure here is a real
      // canvas/export bug, not something to silently swallow (invariant §6.2).
      setError('Could not export the card. Try again.')
    } finally {
      setBusy(null)
    }
  }, [cardData, qrImage])

  const handleShare = useCallback(async () => {
    setError(null)
    setLastShareUrl(null)
    setBusy('share')
    try {
      const [square, og] = await Promise.all([
        exportCard(cardData, qrImage),
        exportOgCard(cardData, qrImage),
      ])
      const result = await shareCard(square, CAPTION, og)
      if (result.via === 'intent') {
        setLastShareUrl(result.shareUrl)
      } else if (result.via === 'failed' && result.reason !== 'cancelled') {
        // Non-fatal by design: the card is already composed client-side, so
        // a share failure never blocks the user from having their card.
        setError(`Share didn't go through (${result.reason}) — your card is still ready to download.`)
      }
    } catch {
      setError('Could not prepare the card for sharing.')
    } finally {
      setBusy(null)
    }
  }, [cardData, qrImage])

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ marginBottom: 4 }}>HH Goa 2026 — Frame / ID Card Generator</h1>
      <p style={{ color: '#a9a9b3', marginTop: 0 }}>
        Upload a photo, get a branded card. Nothing leaves your browser until you share.
      </p>

      {videoUrl && (
        <section style={{ marginTop: '1.5rem' }}>
          <h2 style={sectionHeading}>Welcome video</h2>
          <video
            controls
            src={videoUrl}
            style={{ width: '100%', maxWidth: 420, borderRadius: 12, background: '#000' }}
          />
          <p style={{ color: '#a9a9b3', fontSize: 13, marginTop: 6 }}>
            This is also on your Builder ID card — scan the QR on it to watch anytime.
          </p>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
        <section>
          <h2 style={sectionHeading}>1. Photo{photos.length > 1 ? 's' : ''}</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {photos.map((photo, i) => (
              <label key={i} style={photoSlotStyle}>
                {photo ? `✓ photo ${i + 1}` : `+ photo ${i + 1}`}
                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleFile(i, file)
                  }}
                />
              </label>
            ))}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            {photos.length < 3 && (
              <button type="button" onClick={addSlot} style={ghostButton}>
                + add teammate
              </button>
            )}
            {photos.length > 1 && (
              <button type="button" onClick={removeSlot} style={ghostButton}>
                − remove
              </button>
            )}
          </div>

          <h2 style={sectionHeading}>2. Format</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['pfp', 'idcard'] satisfies Format[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                style={format === f ? activeButton : ghostButton}
              >
                {f === 'pfp' ? 'PFP frame' : 'Builder ID card'}
              </button>
            ))}
          </div>

          <h2 style={sectionHeading}>3. Variant</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            {VARIANT_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                aria-label={v}
                aria-pressed={variant === v}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: VARIANT_SWATCH[v],
                  border: variant === v ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <h2 style={sectionHeading}>4. You</h2>
          <input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={textInput}
          />
          <input
            type="text"
            placeholder="Stack / role (optional)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ ...textInput, marginTop: 8 }}
          />
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontStyle: 'italic', color: '#ffd166' }}>{title}</span>
            <button type="button" onClick={() => setNonce((n) => n + 1)} style={ghostButton}>
              reroll
            </button>
          </div>
        </section>

        <section>
          <h2 style={sectionHeading}>Preview</h2>
          <canvas
            ref={canvasRef}
            width={BASE_SIZE}
            height={BASE_SIZE}
            style={{ width: '100%', maxWidth: 360, borderRadius: 12, background: '#000' }}
          />

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={!hasPrimaryPhoto || busy !== null}
              style={activeButton}
            >
              {busy === 'download' ? 'Preparing…' : 'Download'}
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={!hasPrimaryPhoto || busy !== null}
              style={ghostButton}
            >
              {busy === 'share' ? 'Sharing…' : 'Share to X'}
            </button>
          </div>

          {error && (
            <p role="alert" style={{ color: '#ff6b6b', marginTop: 12 }}>
              {error}
            </p>
          )}
          {lastShareUrl && (
            <p style={{ color: '#8adba0', marginTop: 12 }}>
              Card link:{' '}
              <a href={lastShareUrl} style={{ color: '#8adba0' }}>
                {lastShareUrl}
              </a>
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

const sectionHeading: CSSProperties = {
  fontSize: 15,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: '#a9a9b3',
  marginTop: 24,
  marginBottom: 8,
}

const textInput: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  fontSize: 14,
}

const ghostButton: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'transparent',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
}

const activeButton: CSSProperties = {
  ...ghostButton,
  background: '#ffd166',
  color: '#2b0f1e',
  border: '1px solid #ffd166',
  fontWeight: 700,
}

const photoSlotStyle: CSSProperties = {
  ...ghostButton,
  display: 'inline-flex',
  alignItems: 'center',
}
