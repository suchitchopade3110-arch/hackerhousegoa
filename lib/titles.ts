/**
 * Deterministic on (seed, nonce). Same name always yields the same first
 * title, so a reload does not silently change someone's card. The reroll
 * button increments nonce. See API Contract §2.6.
 */
export function generateTitle(seed: string, nonce = 0): string {
  // TODO(Phase 3): hash (seed + nonce) -> deterministic index into a title
  // word list (e.g. "Protocol Whisperer", "Latency Slayer"). No Math.random().
  void seed
  void nonce
  throw new Error('not implemented — Phase 3')
}
