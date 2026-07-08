/**
 * Load a package or resolvable module specifier via dynamic `import()`.
 *
 * Prefer this over `require()` in ESM-oriented source so Rollup's `.mjs` output
 * stays free of CommonJS `require` calls. For filesystem paths and user CJS
 * plugins, use `importDefault` until a dedicated path loader exists.
 */

type RuntimeImport = (specifier: string) => Promise<unknown>;

// Rollup's dynamic-import-vars only accepts relative path templates; package
// specifiers must bypass static analysis so the call is preserved at runtime.
// eslint-disable-next-line @typescript-eslint/no-implied-eval -- intentional runtime import indirection for Rollup
const runtimeImport: RuntimeImport = new Function(
  'specifier',
  'return import(specifier)'
) as RuntimeImport;

export function normalizeModuleExport<T>(mod: unknown): T {
  if (mod === null || mod === undefined || typeof mod !== 'object') {
    return mod as T;
  }

  const record = mod as Record<string, unknown>;

  if (record.__esModule === true && 'default' in record) {
    return record.default as T;
  }

  const keys = Object.keys(record);

  if ('default' in record && keys.length === 1) {
    return record.default as T;
  }

  return mod as T;
}

export async function importModule<T = unknown>(specifier: string): Promise<T> {
  const mod = await runtimeImport(specifier);
  return normalizeModuleExport<T>(mod);
}
