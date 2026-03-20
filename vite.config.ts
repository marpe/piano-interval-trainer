import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  base: '/piano-interval-trainer/',
  plugins: [
    solidPlugin(),
    viteStaticCopy({
      targets: [{ src: 'sound', dest: '.' }],
    }),
  ],
  server: {
    port: 3000,
  },
});
