// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://umbrellasystems.net',
  integrations: [sitemap({
    filter: (page) => {
      const path = new URL(page).pathname;
      return !['/gis/', '/sja/', '/ohm/'].includes(path);
    },
  })],
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        usePolling: true,
        interval: 300,
      },
    },
  }
});
