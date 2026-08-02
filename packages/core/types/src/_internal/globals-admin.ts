import type { BrowserStrapi } from './admin';

/**
 * Opt in from an admin tsconfig via `compilerOptions.types`. Server programs must
 * not: the package root already declares a `strapi` global as `Core.Strapi`.
 */
declare global {
  interface Window {
    strapi: BrowserStrapi;
  }
}
