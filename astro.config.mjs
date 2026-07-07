// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://nineville.studio',
  vite: {
    build: {
      // esbuild's CSS minifier collapses `backdrop-filter` +
      // `-webkit-backdrop-filter` into a single declaration, dropping the
      // standard property and breaking the frosted-glass blur in Chrome/Firefox
      // on the built site (it works in dev because dev CSS isn't minified).
      // Disabling CSS minification keeps both author prefixes. JS is unaffected,
      // and the CSS still compresses to a few KB via gzip/brotli on Vercel.
      cssMinify: false,
    },
  },
});
