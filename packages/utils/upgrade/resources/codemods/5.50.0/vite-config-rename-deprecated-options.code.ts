import type { Transform, ObjectExpression } from 'jscodeshift';

/**
 * Vite 8 renamed several config options (the old names still work through a
 * deprecation-compat layer but emit warnings):
 *
 *  - `build.rollupOptions`          -> `build.rolldownOptions`
 *  - `worker.rollupOptions`         -> `worker.rolldownOptions`
 *  - `optimizeDeps.esbuildOptions`  -> `optimizeDeps.rolldownOptions`
 *  - top-level `esbuild`            -> `oxc`
 *
 * This codemod renames those keys in a project's `src/admin/vite.config.*`. It
 * only renames the top-level `esbuild` key when the surrounding object also
 * carries a recognizable Vite config key, to avoid touching unrelated objects.
 *
 * Rolldown removes some Rollup options outright; when detected, a review comment
 * is prepended so users know to fix the config manually.
 */
const VITE_ADMIN_CONFIG = /[\\/]src[\\/]admin[\\/]vite\.config\.[cm]?[jt]sx?$/;

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

const REMOVED_ROLLDOWN_OUTPUT_FORMATS = new Set(['system', 'amd']);

const REMOVED_ROLLDOWN_HOOKS = new Set([
  'shouldTransformCachedModule',
  'resolveFileUrl',
  'renderDynamicImport',
]);

const isObjectProperty = (node: unknown): node is { key: unknown; value: unknown } => {
  const type = (node as { type?: string } | null)?.type;
  return type === 'Property' || type === 'ObjectProperty';
};

const getStaticKeyName = (node: unknown): string | undefined => {
  if (!isObjectProperty(node)) {
    return undefined;
  }

  const key = node.key as { type?: string; name?: string; value?: string } | null;

  if (key?.type === 'Identifier') {
    return key.name;
  }

  if (key?.type === 'Literal' && typeof key.value === 'string') {
    return key.value;
  }

  return undefined;
};

const getStaticStringValue = (node: unknown): string | undefined => {
  if (!isObjectProperty(node)) {
    return undefined;
  }

  const value = (node as { value: { type?: string; value?: string } }).value;

  if (
    (value?.type === 'Literal' || value?.type === 'StringLiteral') &&
    typeof value.value === 'string'
  ) {
    return value.value;
  }

  return undefined;
};

const asObjectExpression = (node: unknown): ObjectExpression | undefined => {
  return (node as { type?: string } | null)?.type === 'ObjectExpression'
    ? (node as ObjectExpression)
    : undefined;
};

const renameObjectKey = (object: ObjectExpression, from: string, to: string): boolean => {
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

const getObjectMemberKeyName = (node: unknown): string | undefined => {
  const type = (node as { type?: string } | null)?.type;

  if (type !== 'Property' && type !== 'ObjectProperty' && type !== 'ObjectMethod') {
    return undefined;
  }

  const key = (node as { key: { type?: string; name?: string } }).key;

  return key?.type === 'Identifier' ? key.name : undefined;
};

const collectUnsupportedRolldownWarnings = (object: ObjectExpression): string[] => {
  const warnings: string[] = [];

  const walk = (node: ObjectExpression, path: string[]) => {
    for (const member of node.properties) {
      const keyName = getObjectMemberKeyName(member);

      if (keyName === undefined) {
        continue;
      }

      const nextPath = [...path, keyName];
      const value = (member as { value?: unknown; body?: unknown }).value;
      const valueObject = asObjectExpression(value);

      if (keyName === 'format' && path.at(-1) === 'output' && isObjectProperty(member)) {
        const format = getStaticStringValue(member);

        if (format && REMOVED_ROLLDOWN_OUTPUT_FORMATS.has(format)) {
          warnings.push(
            `output.format: '${format}' is not supported by Rolldown — choose a different format`
          );
        }
      }

      if (REMOVED_ROLLDOWN_HOOKS.has(keyName)) {
        warnings.push(`plugin hook '${keyName}' was removed in Rolldown`);
      }

      if (keyName === 'chokidar' && path.at(-1) === 'watch') {
        warnings.push(
          'watch.chokidar is not supported under rolldownOptions — review Rolldown watch options'
        );
      }

      if (valueObject) {
        walk(valueObject, nextPath);
      } else if (
        (value as { type?: string; elements?: unknown[] } | null)?.type === 'ArrayExpression'
      ) {
        for (const element of (value as { elements: unknown[] }).elements) {
          const elementObject = asObjectExpression(element);

          if (elementObject) {
            walk(elementObject, nextPath);
          }
        }
      }
    }
  };

  walk(object, []);

  return warnings;
};

const getNestedObject = (object: ObjectExpression, key: string): ObjectExpression | undefined => {
  const prop = object.properties.find((p) => getStaticKeyName(p) === key);

  return prop ? asObjectExpression((prop as { value: unknown }).value) : undefined;
};

const transform: Transform = (file, api) => {
  if (!VITE_ADMIN_CONFIG.test(file.path)) {
    return file.source;
  }

  const { j } = api;
  const root = j.withParser('tsx')(file.source);

  let changed = false;
  const reviewWarnings = new Set<string>();

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

      if (keyName === 'build' || keyName === 'worker') {
        changed = renameObjectKey(value, 'rollupOptions', 'rolldownOptions') || changed;

        const rolldownOptions =
          getNestedObject(value, 'rolldownOptions') ?? getNestedObject(value, 'rollupOptions');

        if (rolldownOptions) {
          for (const warning of collectUnsupportedRolldownWarnings(rolldownOptions)) {
            reviewWarnings.add(warning);
          }
        }
      }

      if (keyName === 'optimizeDeps') {
        changed = renameObjectKey(value, 'esbuildOptions', 'rolldownOptions') || changed;
      }

      if (keyName === 'rolldownOptions' || keyName === 'rollupOptions') {
        for (const warning of collectUnsupportedRolldownWarnings(value)) {
          reviewWarnings.add(warning);
        }
      }
    });

    const looksLikeViteConfig = keyNames.some((name) => VITE_CONFIG_MARKER_KEYS.has(name));

    if (looksLikeViteConfig) {
      changed = renameObjectKey(object, 'esbuild', 'oxc') || changed;
    }
  });

  if (!changed && reviewWarnings.size === 0) {
    return file.source;
  }

  let output = root.toSource();

  if (reviewWarnings.size > 0) {
    const header = [
      '/*',
      ' * Strapi upgrade (Vite 8): manual review required after rolldownOptions migration:',
      ...[...reviewWarnings].map((warning) => ` * - ${warning}`),
      ' * See packages/utils/upgrade/resources/codemods/5.50.0/BREAKING_CHANGES.md',
      ' */',
      '',
    ].join('\n');

    output = header + output;
  }

  return output;
};

export default transform;
