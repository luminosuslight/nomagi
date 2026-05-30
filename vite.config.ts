import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { gitCorsProxy } from './vite.git-cors-proxy'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.DEV_PORT) || 5173
  const allowedHosts = env.DEV_ALLOWED_HOST ? [env.DEV_ALLOWED_HOST] : []

  return {
    plugins: [
      vue(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Nomagi',
          short_name: 'Nomagi',
          theme_color: '#000000',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,woff2,svg}'],
          // Main bundle (~2.2 MB) includes Milkdown, Vue, etc.; default limit is 2 MB.
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port,
      allowedHosts,
      proxy: {
        '/git-cors': gitCorsProxy(),
      },
    },
    preview: {
      host: '0.0.0.0',
      port,
      allowedHosts,
      proxy: {
        '/git-cors': gitCorsProxy(),
      },
    },
  }
})
