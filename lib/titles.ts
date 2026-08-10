/**
 * Deterministic on (seed, nonce). Same name always yields the same first
 * title, so a reload does not silently change someone's card. The reroll
 * button increments nonce. See API Contract §2.6.
 */

const ADJECTIVES = [
  'Protocol',
  'Latency',
  'Kernel',
  'Async',
  'Recursive',
  'Quantum',
  'Edge',
  'Serverless',
  'Distributed',
  'Chaotic',
  'Idempotent',
  'Stateless',
  'Concurrent',
  'Immutable',
  'Ephemeral',
]

const NOUNS = [
  'Whisperer',
  'Slayer',
  'Wrangler',
  'Architect',
  'Alchemist',
  'Summoner',
  'Tinkerer',
  'Oracle',
  'Conjurer',
  'Gremlin',
  'Sherpa',
  'Ranger',
  'Smith',
  'Whittler',
  'Herder',
]

/** FNV-1a — small, fast, deterministic, no dependency. */
function hash(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function generateTitle(seed: string, nonce = 0): string {
  const h = hash(`${seed}::${nonce}`)
  const adj = ADJECTIVES[h % ADJECTIVES.length]
  const noun = NOUNS[Math.floor(h / ADJECTIVES.length) % NOUNS.length]
  return `${adj} ${noun}`
}
