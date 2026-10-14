import fs from 'node:fs';
import path from 'node:path';

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

type ImportDeclaration = { source: { value: string } };

type RuleContext = {
  filename: string;
  report(descriptor: { node: unknown; message: string }): void;
};

const manifests = new Map<string, PackageJson>();

const readNearestManifest = (file: string): PackageJson | undefined => {
  let directory = path.dirname(file);
  while (directory !== path.dirname(directory)) {
    const manifestPath = path.join(directory, 'package.json');
    if (fs.existsSync(manifestPath) === true) {
      if (manifests.has(manifestPath) === false) {
        manifests.set(manifestPath, JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
      }
      return manifests.get(manifestPath);
    }
    directory = path.dirname(directory);
  }
  return undefined;
};

const toPackageName = (specifier: string) => {
  const segments = specifier.split('/');
  return specifier.startsWith('@') === true ? segments.slice(0, 2).join('/') : segments[0];
};

/**
 * A package's `registries.ts` must only load contracts of its declared dependencies.
 * An undeclared provider still resolves through workspace hoisting, but Nx does not build it
 * first, so the package would type-check against whatever state that provider's `dist/` is in.
 */
const declaredDependencies = {
  meta: { type: 'problem' },
  create(context: RuleContext) {
    return {
      ImportDeclaration(node: ImportDeclaration) {
        const manifest = readNearestManifest(context.filename);
        const dependency = toPackageName(node.source.value);
        const isDeclared =
          manifest?.dependencies?.[dependency] !== undefined ||
          manifest?.peerDependencies?.[dependency] !== undefined;

        if (isDeclared === false) {
          context.report({
            node,
            message: `'${dependency}' must be a dependency or peer dependency of '${manifest?.name}' to load its contracts.`,
          });
        }
      },
    };
  },
};

export default {
  meta: { name: 'strapi-registries' },
  rules: { 'declared-dependencies': declaredDependencies },
};
