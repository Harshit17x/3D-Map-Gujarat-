import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [cesium()],
  server: {
    port: 5173,
    open: false,
    host: true
  }
});
