// vite.config.ts
import { defineConfig } from "file:///mnt/c/Users/RominaSaez/OneDrive%20-%203it%20Ingenieria%20y%20Desarrollo%20Ltda/Escritorio/project/node_modules/vite/dist/node/index.js";
import vue from "file:///mnt/c/Users/RominaSaez/OneDrive%20-%203it%20Ingenieria%20y%20Desarrollo%20Ltda/Escritorio/project/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "/mnt/c/Users/RominaSaez/OneDrive - 3it Ingenieria y Desarrollo Ltda/Escritorio/project";
var vite_config_default = defineConfig({
  plugins: [vue()],
  define: {
    global: "globalThis"
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "src")
    }
  },
  optimizeDeps: {
    force: true,
    exclude: []
  },
  cacheDir: ".vite",
  server: {
    port: 5173,
    hmr: {
      overlay: false,
      port: 5174
    },
    watch: {
      usePolling: true,
      interval: 1e3,
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/.vite/**"
      ]
    },
    fs: {
      strict: false,
      allow: [".."]
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvbW50L2MvVXNlcnMvUm9taW5hU2Flei9PbmVEcml2ZSAtIDNpdCBJbmdlbmllcmlhIHkgRGVzYXJyb2xsbyBMdGRhL0VzY3JpdG9yaW8vcHJvamVjdFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL21udC9jL1VzZXJzL1JvbWluYVNhZXovT25lRHJpdmUgLSAzaXQgSW5nZW5pZXJpYSB5IERlc2Fycm9sbG8gTHRkYS9Fc2NyaXRvcmlvL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL21udC9jL1VzZXJzL1JvbWluYVNhZXovT25lRHJpdmUlMjAtJTIwM2l0JTIwSW5nZW5pZXJpYSUyMHklMjBEZXNhcnJvbGxvJTIwTHRkYS9Fc2NyaXRvcmlvL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3Z1ZSgpXSxcbiAgZGVmaW5lOiB7XG4gICAgZ2xvYmFsOiAnZ2xvYmFsVGhpcycsXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjJylcbiAgICB9XG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGZvcmNlOiB0cnVlLFxuICAgIGV4Y2x1ZGU6IFtdXG4gIH0sXG4gIGNhY2hlRGlyOiAnLnZpdGUnLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczLFxuICAgIGhtcjoge1xuICAgICAgb3ZlcmxheTogZmFsc2UsXG4gICAgICBwb3J0OiA1MTc0XG4gICAgfSxcbiAgICB3YXRjaDoge1xuICAgICAgdXNlUG9sbGluZzogdHJ1ZSxcbiAgICAgIGludGVydmFsOiAxMDAwLFxuICAgICAgaWdub3JlZDogW1xuICAgICAgICAnKiovbm9kZV9tb2R1bGVzLyoqJyxcbiAgICAgICAgJyoqLy5naXQvKionLFxuICAgICAgICAnKiovZGlzdC8qKicsXG4gICAgICAgICcqKi8udml0ZS8qKidcbiAgICAgIF1cbiAgICB9LFxuICAgIGZzOiB7XG4gICAgICBzdHJpY3Q6IGZhbHNlLFxuICAgICAgYWxsb3c6IFsnLi4nXVxuICAgIH0sXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjMwMDEnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWVcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnYyxTQUFTLG9CQUFvQjtBQUM3ZCxPQUFPLFNBQVM7QUFDaEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxJQUFJLENBQUM7QUFBQSxFQUNmLFFBQVE7QUFBQSxJQUNOLFFBQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxLQUFLO0FBQUEsSUFDcEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixPQUFPO0FBQUEsSUFDUCxTQUFTLENBQUM7QUFBQSxFQUNaO0FBQUEsRUFDQSxVQUFVO0FBQUEsRUFDVixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixLQUFLO0FBQUEsTUFDSCxTQUFTO0FBQUEsTUFDVCxNQUFNO0FBQUEsSUFDUjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsWUFBWTtBQUFBLE1BQ1osVUFBVTtBQUFBLE1BQ1YsU0FBUztBQUFBLFFBQ1A7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsSUFBSTtBQUFBLE1BQ0YsUUFBUTtBQUFBLE1BQ1IsT0FBTyxDQUFDLElBQUk7QUFBQSxJQUNkO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
