/**
 * GET /s/:id — the share page. Its job is carrying OG/Twitter meta tags;
 * visible content is secondary but must include the card + a CTA back to `/`
 * (the distribution loop). See BACKEND_PRD §5.2, API Contract §3.2.
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cardUrl, ogUrl } from '@/lib/blob'

interface SharePageProps {
  params: Promise<{ id: string }>
}

// nanoid, 10 chars, from the alphabet in lib/id.ts — reject anything else
// before it ever reaches blob storage.
const ID_PATTERN = /^[0-9A-Za-z]{10}$/

async function urlExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

/**
 * If the `og` variant was never uploaded (it's optional — BACKEND_PRD §5.1),
 * fall back to the square card. X will centre-crop it, but a cropped
 * preview beats a blank one.
 */
async function resolveOgImage(id: string): Promise<string> {
  const og = ogUrl(id)
  if (await urlExists(og)) return og
  return cardUrl(id)
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params
  const img = ID_PATTERN.test(id) ? await resolveOgImage(id) : ogUrl(id)

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

  if (!ID_PATTERN.test(id) || !(await urlExists(cardUrl(id)))) {
    notFound()
  }

  return (
    <main style={{ padding: '2rem', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
      <img
        src={cardUrl(id)}
        alt="HH Goa 2026 builder card"
        style={{ maxWidth: '100%', borderRadius: 12 }}
      />
      <p style={{ marginTop: '1.5rem' }}>
        <a href="/" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
          Make your own →
        </a>
      </p>
    </main>
  )
}
