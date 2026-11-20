import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          const path = String(id).replace(/\\/g, '/');
          if (!path.includes('/node_modules/')) return;
          if (path.includes('/node_modules/xlsx/')) return 'xlsx';
          if (path.includes('/node_modules/jspdf/')) return 'jspdf';
          if (path.includes('/node_modules/html2canvas')) return 'html2canvas';
          if (path.includes('/node_modules/recharts/') || path.includes('/node_modules/d3-')) return 'charts';
          if (path.includes('/node_modules/framer-motion/') || path.includes('/node_modules/motion-dom/') || path.includes('/node_modules/motion-utils/')) return 'animation';
          if (path.includes('/node_modules/react/') || path.includes('/node_modules/react-dom/') || path.includes('/node_modules/scheduler/') || path.includes('/node_modules/react-router') || path.includes('/node_modules/@tanstack/')) return 'react-vendor';
          if (path.includes('/node_modules/react-icons/') || path.includes('/node_modules/@heroicons/') || path.includes('/node_modules/lucide-react/')) return 'icons';
          return 'vendor';
        },
      },
    },
  },
   server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
