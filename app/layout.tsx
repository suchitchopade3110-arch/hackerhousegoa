import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HH Goa 2026 — Frame / ID Card Generator',
  description: 'Upload a photo, get a branded HH Goa 2026 frame or builder ID card. #FrameInGoa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
