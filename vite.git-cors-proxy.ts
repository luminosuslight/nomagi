import type { ProxyOptions } from 'vite'

/** Same-origin proxy as nginx `/git-cors/<host>/…` → `https://<host>/…` */
export function gitCorsProxy(): ProxyOptions {
  return {
    target: 'https://github.com',
    changeOrigin: true,
    configure(_proxy, options) {
      options.rewrite = (path) => {
        const match = path.match(/^\/git-cors\/([^/]+)(\/.*)?$/)
        if (!match) return path
        options.target = `https://${match[1]}`
        return match[2] ?? '/'
      }
    },
  }
}
