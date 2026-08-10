/**
 * Main tool: upload -> compose -> preview -> download/share.
 * Placeholder for Phase 1 (foundation). Real UI wiring happens in Phase 3,
 * built on top of lib/heic.ts, lib/canvas/*, lib/titles.ts, lib/share.ts.
 */
export default function HomePage() {
  return (
    <main style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <h1>HH Goa 2026 — Frame / ID Card Generator</h1>
      <p>
        Upload flow, canvas composer, and share UI land in Phase 3. This page currently
        exists only so the app builds and routes resolve.
      </p>
      {/* TODO(Phase 3): <UploadZone />, <VariantPicker />, <CardPreview />, <DownloadShareBar /> */}
    </main>
  )
}
