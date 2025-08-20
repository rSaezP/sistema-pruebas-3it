import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  
  define: {
    global: 'globalThis',
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  
  // Optimización de dependencias - evita rebuilds innecesarios
  optimizeDeps: {
    force: false, // Cambiado: evita reoptimización constante
    include: [
      'vue',
      'vue-router',
      'pinia'
    ],
    exclude: []
  },
  
  cacheDir: '.vite',
  
  // Configuración del servidor de desarrollo
  server: {
    port: 5173,
    host: true, // Permite acceso desde otras IPs
    open: false, // No abrir navegador automáticamente
    
    // HMR (Hot Module Replacement)
    hmr: {
      overlay: true, // Cambiado: muestra errores en overlay
      port: 5174
    },
    
    // File watching - configuración más estable
    watch: {
      usePolling: false, // Cambiado: usar file system events nativos
      interval: 1000,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/.vite/**',
        '**/coverage/**'
      ]
    },
    
    // File system
    fs: {
      strict: false,
      allow: ['..']
    },
    
    // Proxy para API
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  
  // Build configuration
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          utils: ['uuid']
        }
      }
    }
  },
  
  // Preview server (para npm run preview)
  preview: {
    port: 4173,
    host: true
  }
})