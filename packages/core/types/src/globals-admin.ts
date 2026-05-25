import type { BrowserStrapi } from './admin';

declare global {
  interface Window {
    strapi?: BrowserStrapi;
  }
}

// Keep this file a module
export {};
