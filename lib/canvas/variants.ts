import type { Variant } from '@/lib/types'

export interface Palette {
  bgFrom: string
  bgTo: string
  accent: string
  text: string
  headerText: string
}

/**
 * Color-only palettes — no external frame art required, matches the "image
 * composed entirely in the browser via Canvas" scope (BACKEND_PRD §2.1).
 * If real frame/badge art lands in public/frames/ later, draw.ts is the
 * only file that needs to change.
 */
export const VARIANTS: Record<Variant, Palette> = {
  sunrise: {
    bgFrom: '#2b0f1e',
    bgTo: '#ff6b4a',
    accent: '#ffd166',
    text: '#fff8f0',
    headerText: '#2b0f1e',
  },
  midnight: {
    bgFrom: '#05061a',
    bgTo: '#3a1c71',
    accent: '#8a63ff',
    text: '#f4f1ff',
    headerText: '#f4f1ff',
  },
  sand: {
    bgFrom: '#f4e7c9',
    bgTo: '#bc8a5f',
    accent: '#7a4b26',
    text: '#3a2a17',
    headerText: '#fff8ec',
  },
  palm: {
    bgFrom: '#04241a',
    bgTo: '#0b6e4f',
    accent: '#08d9d6',
    text: '#eafff9',
    headerText: '#04241a',
  },
}
