import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import finlabPwaPlugin from './vite-pwa-plugin.js'

// set port as 9002
// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), finlabPwaPlugin()],
  server: {
    port: 9002,
  },
})
