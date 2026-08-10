/**
 * GET /s/:id — the share page. Its job is carrying OG/Twitter meta tags;
 * visible content is secondary but must include the card + a CTA back to `/`
 * (the distribution loop). See BACKEND_PRD §5.2, API Contract §3.2.
 */
import type { Metadata } from 'next'
// Phase 2 will import: ogUrl, cardUrl from '@/lib/blob'; notFound from 'next/navigation'
// to render not-found.tsx when the id doesn't resolve to a stored card.

interface SharePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params

  // TODO(Phase 2): const img = ogUrl(id)
  const img = `https://placeholder.invalid/cards/${id}-og.png`

  return {
    title: 'my hh goa 2026 builder card',
    description: 'make yours. #FrameInGoa',
    openGraph: {
      title: 'my hh goa 2026 builder card',
      description: 'make yours. #FrameInGoa',
      images: [{ url: img, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      images: [img],
    },
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params

  // TODO(Phase 2):
  // - Verify the card exists (HEAD request to cardUrl(id), or trust the id and
  //   let the <img> 404 gracefully) — call notFound() to render not-found.tsx.
  // - Render the square card image (cardUrl(id)) visibly.
  // - Render a prominent CTA link back to "/".

  return (
    <main style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <h1>Card {id}</h1>
      <p>Share page placeholder — Phase 2 wires the real card image and CTA.</p>
      <a href="/">Make your own →</a>
    </main>
  )
}
