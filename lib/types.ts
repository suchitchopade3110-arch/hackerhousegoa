/**
 * Shared types — the contract between every client-side module.
 * Source: HHGoa_Task1_API_Contract §2.1
 */

export type Format = 'pfp' | 'idcard'
export type Variant = 'sunrise' | 'midnight' | 'sand' | 'palm'

export interface CardData {
  photos: HTMLImageElement[] // 1 for solo, 2-3 for team mode
  name: string // "" allowed; layout must not break
  role: string // stack or role, "" allowed
  title: string // generated builder title
  number: number // 1..247
  format: Format
  variant: Variant
}

export interface CropRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

/** POST /api/upload success body. */
export interface UploadResponse {
  id: string
  shareUrl: string
  imageUrl: string
}

/** Error codes the upload route can return. Kept as a union so callers can switch on it. */
export type UploadErrorCode =
  | 'NO_FILE'
  | 'TOO_LARGE'
  | 'BAD_TYPE'
  | 'RATE_LIMITED'
  | 'STORAGE_FAILED'

export interface UploadErrorBody {
  error: { code: UploadErrorCode; message: string }
}
