export const DEFAULT_CORS_PROXY = '/git-cors'

/** Read persisted cors proxy; empty string means direct git access (no proxy). */
export function loadCorsProxySetting(stored: string | null): string {
  if (stored === null) return DEFAULT_CORS_PROXY
  if (stored === 'https://cors.isomorphic-git.org') return DEFAULT_CORS_PROXY
  return stored
}

/** Parse `/git-cors/<scheme>/<host>/…` or legacy `/git-cors/<host>/…` (defaults to HTTPS). */
export function parseGitCorsPath(path: string): { target: string; rewritePath: string } | null {
  const withScheme = path.match(/^\/git-cors\/(https?)\/([^/]+)(\/.*)?$/)
  if (withScheme) {
    return {
      target: `${withScheme[1]}://${withScheme[2]}`,
      rewritePath: withScheme[3] ?? '/',
    }
  }

  const legacy = path.match(/^\/git-cors\/([^/]+)(\/.*)?$/)
  if (legacy) {
    return {
      target: `https://${legacy[1]}`,
      rewritePath: legacy[2] ?? '/',
    }
  }

  return null
}

/** isomorphic-git strips the repo URL scheme; re-insert it into the cors proxy base. */
export function corsProxyForRepo(corsProxyBase: string, repoUrl: string): string | undefined {
  const base = corsProxyBase.trim()
  if (!base) return undefined

  const normalized = base.replace(/\/$/, '')
  if (normalized.endsWith('/http') || normalized.endsWith('/https')) {
    return normalized
  }

  const scheme = repoUrl.trim().toLowerCase().startsWith('http://') ? 'http' : 'https'
  return `${normalized}/${scheme}`
}
