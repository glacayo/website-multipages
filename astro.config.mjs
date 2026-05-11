import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  site: 'https://wgmasonry757.com',
  output: 'static',
  build: {
    format: 'directory'
  }
});
