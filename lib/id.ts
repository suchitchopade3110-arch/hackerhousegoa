import { customAlphabet } from 'nanoid'

// URL-safe, unguessable, no collision handling needed at this volume.
// See BACKEND_PRD §8.
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const nanoid = customAlphabet(alphabet, 10)

export function newId(): string {
  return nanoid()
}
