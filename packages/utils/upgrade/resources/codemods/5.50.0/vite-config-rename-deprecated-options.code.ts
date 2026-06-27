import type { Transform, ObjectExpression } from 'jscodeshift';

/**
 * Vite 8 renamed several config options (the old names still work through a
 * deprecation-compat layer but emit warnings):
 *
 *  - `build.rollupOptions`          -> `build.rolldownOptions`
 *  - `optimizeDeps.esbuildOptions`  -> `optimizeDeps.rolldownOptions`
 *  - top-level `esbuild`            -> `oxc`
 *
 * This codemod renames those keys in a project's `src/admin/vite.config.*`. It
 * only renames the top-level `esbuild` key when the surrounding object also
 * carries a recognizable Vite config key, to avoid touching unrelated objects.
 */
const VITE_ADMIN_CONFIG = /[\\/]src[\\/]admin[\\/]vite\.config\.(?:c|m)?[jt]sx?$/;

// Keys that strongly indicate an object is a Vite config object
const VITE_CONFIG_MARKER_KEYS = new Set([
  'build',
  'plugins',
  'optimizeDeps',
  'resolve',
  'server',
  'define',
  'css',
  'base',
  'root',
  'mode',
]);

// The babel/tsx parser produces `ObjectProperty` nodes (estree uses `Property`),
// so match both kinds rather than relying on a single ast type.
const isObjectProperty = (node: unknown): node is { key: unknown; value: unknown } => {
  const type = (node as { type?: string } | null)?.type;
  return type === 'Property' || type === 'ObjectProperty';
};

const getStaticKeyName = (node: unknown): string | undefined => {
  if (!isObjectProperty(node)) {
    return undefined;
  }

  const key = node.key as { type?: string; name?: string } | null;

  return key?.type === 'Identifier' ? key.name : undefined;
};

const asObjectExpression = (node: unknown): ObjectExpression | undefined => {
  return (node as { type?: string } | null)?.type === 'ObjectExpression'
    ? (node as ObjectExpression)
    : undefined;
};

const renameObjectKey = (object: ObjectExpression, from: string, to: string): boolean => {
  // Don't create a duplicate key if the target already exists
  const hasTarget = object.properties.some((prop) => getStaticKeyName(prop) === to);

  if (hasTarget) {
    return false;
  }

  let changed = false;

  object.properties.forEach((prop) => {
    if (getStaticKeyName(prop) === from) {
      ((prop as { key: { name: string } }).key as { name: string }).name = to;
      changed = true;
    }
  });

  return changed;
};

const transform: Transform = (file, api) => {
  if (!VITE_ADMIN_CONFIG.test(file.path)) {
    return file.source;
  }

  const { j } = api;
  const root = j.withParser('tsx')(file.source);

  let changed = false;

  root.find(j.ObjectExpression).forEach((path) => {
    const object = path.node;

    const keyNames = object.properties
      .map((prop) => getStaticKeyName(prop))
      .filter((name): name is string => name !== undefined);

    object.properties.forEach((prop) => {
      const keyName = getStaticKeyName(prop);

      if (keyName === undefined) {
        return;
      }

      const value = asObjectExpression((prop as { value: unknown }).value);

      if (!value) {
        return;
      }

      // build.rollupOptions -> build.rolldownOptions
      if (keyName === 'build') {
        changed = renameObjectKey(value, 'rollupOptions', 'rolldownOptions') || changed;
      }

      // optimizeDeps.esbuildOptions -> optimizeDeps.rolldownOptions
      if (keyName === 'optimizeDeps') {
        changed = renameObjectKey(value, 'esbuildOptions', 'rolldownOptions') || changed;
      }
    });

    // top-level esbuild -> oxc, only on objects that look like a Vite config
    const looksLikeViteConfig = keyNames.some((name) => VITE_CONFIG_MARKER_KEYS.has(name));

    if (looksLikeViteConfig) {
      changed = renameObjectKey(object, 'esbuild', 'oxc') || changed;
    }
  });

  return changed ? root.toSource() : file.source;
};

export default transform;
