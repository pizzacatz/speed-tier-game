import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/speed-tier-game/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['sprites/*.webp', 'icon.svg'],
      manifest: {
        name: 'Speed Tier Game',
        short_name: 'Speed Tiers',
        description: 'Who moves first? Pokémon Champions Reg M-C speed tier trainer.',
        theme_color: '#18181b',
        background_color: '#18181b',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,webp,json}'], maximumFileSizeToCacheInBytes: 3_000_000 },
    }),
  ],
});
