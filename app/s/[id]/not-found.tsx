/**
 * Rendered when /s/:id doesn't resolve to a stored card. Must never be a
 * blank body — always give a "make your own" CTA. See BACKEND_PRD §5.2.
 */
export default function ShareNotFound() {
  return (
    <main style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <h1>Card not found</h1>
      <p>This card link is invalid or has expired.</p>
      <a href="/">Make your own →</a>
    </main>
  )
}
