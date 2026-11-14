const IMAGE_MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
}

function extension(path: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(path)
  return match ? match[1]!.toLowerCase() : ''
}

export function imageMimeType(path: string): string | null {
  return IMAGE_MIME_TYPES[extension(path)] ?? null
}

/** True for a single http(s) URL whose path ends in a known image extension. */
export function isImageUrl(text: string): boolean {
  if (!text || /\s/.test(text)) return false
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  return imageMimeType(url.pathname) !== null
}

/**
 * Repo-relative path for a markdown image `src` written in `noteFilepath`.
 * Returns null for absolute URLs (http:, data:, blob:, …) and paths that escape the repo root.
 */
export function resolveRepoImagePath(noteFilepath: string, src: string): string | null {
  if (!src || /^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//') || src.startsWith('#')) {
    return null
  }
  const pathPart = src.split(/[?#]/, 1)[0]!
  let decoded = pathPart
  try {
    decoded = decodeURI(pathPart)
  } catch {
    // Keep the raw path when it is not valid percent-encoding.
  }
  const segments = pathPart.startsWith('/') ? [] : noteFilepath.split('/').slice(0, -1)
  for (const segment of decoded.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (segments.length === 0) return null
      segments.pop()
      continue
    }
    segments.push(segment)
  }
  return segments.length > 0 ? segments.join('/') : null
}
