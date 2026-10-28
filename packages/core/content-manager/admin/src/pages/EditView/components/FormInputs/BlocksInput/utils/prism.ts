import * as PrismModule from 'prismjs';

/**
 * prismjs is UMD and may not expose a namespace when bundled by Vite; the content-manager
 * index preloads it so `window.Prism` is set. Use that when the module import is empty.
 */
function resolvePrism(): typeof PrismModule | undefined {
  if (typeof PrismModule !== 'undefined' && PrismModule?.languages) {
    return PrismModule;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  const globalPrism = (window as Window & { Prism?: typeof PrismModule }).Prism;
  return globalPrism;
}

/**
 * `prismjs/components/*` are plain scripts that assign to the global `Prism`. Rolldown runs them
 * as ESM dependencies but defers the CJS `prismjs` init to the importing module's body, so the
 * core must be initialized in a module imported *before* any language component.
 */
export const Prism = resolvePrism();
