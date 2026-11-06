import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// set port as 9001
// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server:
  {
    port: 9002,
  }
})
