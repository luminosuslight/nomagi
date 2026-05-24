import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Git Notes',
        short_name: 'Notes',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg}'],
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
    port: 55111,
    proxy: {
      '/git-cors/github.com': {
        target: 'https://github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/git-cors\/github\.com/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 55111,
    proxy: {
      '/git-cors/github.com': {
        target: 'https://github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/git-cors\/github\.com/, ''),
      },
    },
  },
})
