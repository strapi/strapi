import type { Transform, ObjectExpression, ObjectProperty } from 'jscodeshift';

/**
 * Vite 8 removed the object form of `output.manualChunks`. Rolldown expects
 * `output.codeSplitting.groups` instead.
 *
 * This codemod only migrates the static object form (e.g.
 * `manualChunks: { vendor: ['react'] }`). Function forms are left untouched
 * for manual review.
 */
const VITE_ADMIN_CONFIG = /[\\/]src[\\/]admin[\\/]vite\.config\.(?:c|m)?[jt]sx?$/;

const isObjectProperty = (node: unknown): node is ObjectProperty => {
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

  if (key?.type === 'StringLiteral') {
    return key.value;
  }

  return undefined;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const moduleNamesToTestPattern = (moduleNames: string[]) => {
  const segments = moduleNames.map((moduleName) => {
    if (moduleName.startsWith('@')) {
      const [scope, ...rest] = moduleName.split('/');
      const name = rest.join('/');

      return `${escapeRegExp(scope)}[\\\\/]${escapeRegExp(name)}`;
    }

    return escapeRegExp(moduleName);
  });

  return `node_modules[\\\\/](?:${segments.join('|')})([\\\\/]|$)`;
};

const transform: Transform = (file, api) => {
  if (!VITE_ADMIN_CONFIG.test(file.path)) {
    return file.source;
  }

  const { j } = api;
  const root = j.withParser('tsx')(file.source);

  let changed = false;

  root.find(j.ObjectProperty).forEach((path) => {
    if (getStaticKeyName(path.node) !== 'manualChunks') {
      return;
    }

    const manualChunks = path.node.value;

    if (manualChunks.type !== 'ObjectExpression') {
      return;
    }

    const groups = manualChunks.properties
      .map((property) => {
        if (!isObjectProperty(property)) {
          return null;
        }

        const chunkName = getStaticKeyName(property);

        if (!chunkName || property.value.type !== 'ArrayExpression') {
          return null;
        }

        const moduleNames = property.value.elements
          .map((element) => (element?.type === 'StringLiteral' ? element.value : null))
          .filter((name): name is string => name !== null);

        if (moduleNames.length === 0) {
          return null;
        }

        return j.objectExpression([
          j.objectProperty(j.identifier('name'), j.stringLiteral(chunkName)),
          j.objectProperty(
            j.identifier('test'),
            j.literal(new RegExp(moduleNamesToTestPattern(moduleNames)))
          ),
        ]);
      })
      .filter((group): group is ObjectExpression => group !== null);

    if (groups.length === 0) {
      return;
    }

    path.node.key = j.identifier('codeSplitting');
    path.node.value = j.objectExpression([
      j.objectProperty(j.identifier('groups'), j.arrayExpression(groups)),
    ]);
    changed = true;
  });

  return changed ? root.toSource() : file.source;
};

export default transform;
