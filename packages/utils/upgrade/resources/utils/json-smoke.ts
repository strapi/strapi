/**
 * Smoke helper for the JSON-codemod util-import CLI test.
 * Uses an `enum` so Node strip-types cannot load it without esbuild-register.
 */
export enum JsonSmokeKind {
  Ok = 'json-codemod-utils-ok',
}

export const JSON_SMOKE_MARKER = JsonSmokeKind.Ok;
