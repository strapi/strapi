/**
 * Simulates a browser that never starts an idle period, so `requestIdleCallback` callbacks
 * without a `timeout` never run. Headless Chromium behaves like this after an input on a page
 * that has gone quiet (seen in the content-releases e2e suite).
 *
 * Import this before the module under test: modules can capture `requestIdleCallback` when
 * they are first evaluated.
 */
window.requestIdleCallback = (() => 0) as unknown as Window['requestIdleCallback'];
window.cancelIdleCallback = () => {};

export {};
