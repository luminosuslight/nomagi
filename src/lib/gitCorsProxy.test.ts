import { describe, expect, it } from 'vitest'
import { corsProxyForRepo, loadCorsProxySetting, parseGitCorsPath } from './gitCorsProxy'

describe('parseGitCorsPath', () => {
  it('routes HTTP remotes through http upstream', () => {
    expect(parseGitCorsPath('/git-cors/http/localhost:55001/tim/notes.git/info/refs')).toEqual({
      target: 'http://localhost:55001',
      rewritePath: '/tim/notes.git/info/refs',
    })
  })

  it('routes HTTPS remotes through https upstream', () => {
    expect(parseGitCorsPath('/git-cors/https/github.com/user/notes.git/info/refs')).toEqual({
      target: 'https://github.com',
      rewritePath: '/user/notes.git/info/refs',
    })
  })

  it('defaults legacy paths to HTTPS', () => {
    expect(parseGitCorsPath('/git-cors/github.com/user/notes.git')).toEqual({
      target: 'https://github.com',
      rewritePath: '/user/notes.git',
    })
  })

  it('returns null for unrelated paths', () => {
    expect(parseGitCorsPath('/api/health')).toBeNull()
  })
})

describe('corsProxyForRepo', () => {
  it('returns undefined when proxy is disabled', () => {
    expect(corsProxyForRepo('', 'http://localhost:55001/tim/notes.git')).toBeUndefined()
  })

  it('appends http scheme for http repo URLs', () => {
    expect(corsProxyForRepo('/git-cors', 'http://localhost:55001/tim/notes.git')).toBe(
      '/git-cors/http',
    )
  })

  it('appends https scheme for https repo URLs', () => {
    expect(corsProxyForRepo('/git-cors', 'https://github.com/user/notes.git')).toBe(
      '/git-cors/https',
    )
  })

  it('leaves an already-scoped proxy base unchanged', () => {
    expect(corsProxyForRepo('/git-cors/http', 'https://github.com/user/notes.git')).toBe(
      '/git-cors/http',
    )
  })
})

describe('loadCorsProxySetting', () => {
  it('defaults when unset', () => {
    expect(loadCorsProxySetting(null)).toBe('/git-cors')
  })

  it('preserves explicit empty (no proxy)', () => {
    expect(loadCorsProxySetting('')).toBe('')
  })

  it('migrates legacy public proxy URL', () => {
    expect(loadCorsProxySetting('https://cors.isomorphic-git.org')).toBe('/git-cors')
  })

  it('preserves custom proxy URL', () => {
    expect(loadCorsProxySetting('http://127.0.0.1:9999')).toBe('http://127.0.0.1:9999')
  })
})
