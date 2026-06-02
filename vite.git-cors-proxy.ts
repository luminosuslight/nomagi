import type { ProxyOptions } from 'vite'
import { parseGitCorsPath } from './src/lib/gitCorsProxy'

/** Same-origin proxy as nginx `/git-cors/(http|https)/<host>/…` */
export function gitCorsProxy(): ProxyOptions {
  return {
    target: 'https://github.com',
    changeOrigin: true,
    configure(_proxy, options) {
      options.rewrite = (path) => {
        const parsed = parseGitCorsPath(path)
        if (!parsed) return path
        options.target = parsed.target
        return parsed.rewritePath
      }
    },
  }
}
