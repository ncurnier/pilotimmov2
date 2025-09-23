import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: process.env.VITE_HMR_OVERLAY !== "false",
    },
  },
  resolve: {
    alias: { "@": "/src" },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
