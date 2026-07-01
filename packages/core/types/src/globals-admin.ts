import type { BrowserStrapi } from './admin';

declare global {
  interface Window {
    strapi?: BrowserStrapi;
  }
}
