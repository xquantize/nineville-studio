/// <reference path="../.astro/types.d.ts" />

import type Lenis from 'lenis';

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export {};
