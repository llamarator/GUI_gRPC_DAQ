import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { webcrypto } from 'crypto';

// Asigna el webcrypto nativo a globalThis.crypto
if (!globalThis.crypto || !globalThis.crypto.getRandomValues) {
  globalThis.crypto = webcrypto;
}

export default defineConfig({
  server: {
    port: 3000,        // Configura el puerto aquí
    host: '0.0.0.0'    // Asegúrate de que sea accesible desde fuera del contenedor
  },
  plugins: [react()],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
    },
  },
});
