import { generateIsoDateFilename } from '@/lib/noteFilenames'

export const PASTED_IMAGES_DIR = 'pasted_images'

/** Pasted images are committed to git for good, so large ones are downscaled and re-encoded. */
const MAX_DIMENSION_PX = 2000
const WEBP_QUALITY = 0.85

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
}

/** GIFs may be animated and SVGs are vector; re-encoding would lose either. */
const KEEP_AS_IS = new Set(['image/gif', 'image/svg+xml'])

export function pastedImageExtension(mimeType: string): string | null {
  return EXTENSIONS[mimeType] ?? null
}

/** `pasted_images/2026-11-14T12-10-33.png` */
export function pastedImagePath(mimeType: string, now = new Date()): string {
  const extension = pastedImageExtension(mimeType)
  if (!extension) throw new Error(`Unsupported image type: ${mimeType || 'unknown'}`)
  return `${PASTED_IMAGES_DIR}/${generateIsoDateFilename(now).replace(/\.md$/, `.${extension}`)}`
}

/** `dir/name.png` → `dir/name-2.png` */
export function withNumericSuffix(filepath: string, suffix: number): string {
  const dot = filepath.lastIndexOf('.')
  const slash = filepath.lastIndexOf('/')
  if (dot <= slash + 1) return `${filepath}-${suffix}`
  return `${filepath.slice(0, dot)}-${suffix}${filepath.slice(dot)}`
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Downscales to MAX_DIMENSION_PX and re-encodes as WebP when that is smaller (or the source
 * format is not one we store). Browsers without WebP encoding return PNG instead.
 */
export async function shrinkImage(image: Blob): Promise<Blob> {
  if (KEEP_AS_IS.has(image.type)) return image

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(image)
  } catch {
    return image
  }
  const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const encoded = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY)
  if (!encoded) return image
  const storable = pastedImageExtension(image.type) !== null
  return scale < 1 || encoded.size < image.size || !storable ? encoded : image
}

/**
 * Shrinks and commits a pasted image under PASTED_IMAGES_DIR.
 * Returns a repo-root image src so links survive moving the note.
 */
export async function savePastedImage(
  image: Blob,
  createBinaryFile: (filepath: string, bytes: Uint8Array) => Promise<string>,
): Promise<string> {
  const shrunk = await shrinkImage(image)
  const bytes = new Uint8Array(await shrunk.arrayBuffer())
  const savedPath = await createBinaryFile(pastedImagePath(shrunk.type), bytes)
  return `/${savedPath}`
}
