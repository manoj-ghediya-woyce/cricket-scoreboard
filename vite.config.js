import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // If publishing to https://<user>.github.io/cricket-scoreboard/
  base: '/cricket-scoreboard/',
})
