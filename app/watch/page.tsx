/**
 * GET /watch — the fixed destination the id-card QR code is printed with.
 * The URL never changes; only what it serves can (swap the <video> src or,
 * later, turn this into a redirect to another host) — the QR on already
 * printed cards keeps working either way.
 */
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HH Goa 2026 — Welcome',
  description: 'Scan the QR on a builder ID card to watch this.',
}

export default function WatchPage() {
  return (
    <main style={{ padding: '2rem', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ marginBottom: 4 }}>Welcome to HH Goa 2026</h1>
      <video
        controls
        autoPlay
        muted
        playsInline
        src="/videos/welcome.mp4"
        style={{ width: '100%', maxWidth: 480, borderRadius: 12, marginTop: '1rem', background: '#000' }}
      />
      <p style={{ marginTop: '1.5rem' }}>
        <a href="/" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
          Make your own builder card →
        </a>
      </p>
    </main>
  )
}
