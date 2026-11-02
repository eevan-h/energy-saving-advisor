import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/energy-saving-advisor/' : '/',
  plugins: [react(), tailwindcss()],
}))
