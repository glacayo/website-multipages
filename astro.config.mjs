import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://wgmasonryhardscape757.com',
  output: 'static',
  integrations: [
    sitemap(),
  ],
});