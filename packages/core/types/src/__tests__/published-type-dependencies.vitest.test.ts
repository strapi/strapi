import fs from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import path from 'node:path';

import semver from 'semver';
import * as ts from 'typescript';
import { describe, expect, test } from 'vitest';

/**
 * The published declarations keep every import of `src`. A consumer type-checking with
 * `skipLibCheck: false` (or a strict package manager such as pnpm) can only resolve those
 * imports when the package that provides their types is a runtime dependency of `@strapi/types`.
 */

type PackageManifest = {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: { node?: string };
  types?: string;
  typings?: string;
  exports?: unknown;
};

const packageRoot = path.resolve(__dirname, '../..');
const sourceRoot = path.join(packageRoot, 'src');
const packageRequire = createRequire(path.join(packageRoot, 'package.json'));

const readManifest = (manifestPath: string) =>
  JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as PackageManifest;

const manifest = readManifest(path.join(packageRoot, 'package.json'));
const dependencies = Object.keys(manifest.dependencies ?? {});

const isPublishedSource = (relativePath: string) =>
  relativePath.endsWith('.ts') === true &&
  relativePath.split(path.sep).includes('__tests__') === false;

const toPackageName = (specifier: string) => {
  const segments = specifier.split('/');

  return specifier.startsWith('@') === true ? segments.slice(0, 2).join('/') : segments[0];
};

const isBareSpecifier = (specifier: string) =>
  specifier.startsWith('.') === false && specifier.startsWith('/') === false;

// Node built-in types come from the consumer's own `@types/node`.
const isNodeBuiltin = (specifier: string) =>
  specifier.startsWith('node:') === true || builtinModules.includes(specifier);

const importedPackages = [
  ...new Set(
    fs
      .readdirSync(sourceRoot, { recursive: true, encoding: 'utf8' })
      .filter(isPublishedSource)
      .flatMap((relativePath) => {
        const content = fs.readFileSync(path.join(sourceRoot, relativePath), 'utf8');

        return ts.preProcessFile(content, true, true).importedFiles.map((file) => file.fileName);
      })
      .filter(
        (specifier) => isBareSpecifier(specifier) === true && isNodeBuiltin(specifier) === false
      )
      .map(toPackageName)
      .filter((packageName) => packageName !== manifest.name)
  ),
].sort();

const findInstalledManifest = (packageName: string) => {
  const lookupPaths = packageRequire.resolve.paths(packageName) ?? [];
  const manifestPath = lookupPaths
    .map((lookupPath) => path.join(lookupPath, packageName, 'package.json'))
    .find((candidate) => fs.existsSync(candidate) === true);

  if (manifestPath === undefined) {
    throw new Error(`${packageName} is imported by @strapi/types but is not installed`);
  }

  return { manifest: readManifest(manifestPath), directory: path.dirname(manifestPath) };
};

const shipsOwnTypes = (packageName: string) => {
  const installed = findInstalledManifest(packageName);

  return (
    installed.manifest.types !== undefined ||
    installed.manifest.typings !== undefined ||
    JSON.stringify(installed.manifest.exports ?? {}).includes('"types"') === true ||
    fs.existsSync(path.join(installed.directory, 'index.d.ts')) === true
  );
};

const toTypesPackageName = (packageName: string) =>
  `@types/${packageName.startsWith('@') === true ? packageName.slice(1).replace('/', '__') : packageName}`;

const toTypeProvider = (packageName: string) =>
  shipsOwnTypes(packageName) === true ? packageName : toTypesPackageName(packageName);

/**
 * Imports whose type provider stays a devDependency, so apps see those types as `any`.
 * `@koa/router` 12 ships no types, and `@types/koa__router` depends on `@types/koa: "*"`, which
 * package managers resolve to Koa 3 types next to the Koa 2 types of `@strapi/types`: the router
 * and Strapi middleware types then no longer match. Remove the entry once `@koa/router` ships its
 * own types (the test below fails when it does).
 */
const devOnlyTypeImports = ['@koa/router'];

const typeProviders = importedPackages
  .filter((packageName) => devOnlyTypeImports.includes(packageName) === false)
  .map((packageName) => [packageName, toTypeProvider(packageName)]);

describe('published type dependencies', () => {
  test('finds the packages imported by the published sources', () => {
    expect(importedPackages).toContain('koa');
  });

  test.each(typeProviders)(
    'types imported from %s are provided by a dependency (%s)',
    (_packageName, typeProvider) => {
      expect(dependencies).toContain(typeProvider);
    }
  );

  test.each(devOnlyTypeImports)(
    'types imported from %s still have a dev-only provider',
    (packageName) => {
      const typeProvider = toTypeProvider(packageName);

      expect(typeProvider).not.toBe(packageName);
      expect(Object.keys(manifest.devDependencies ?? {})).toContain(typeProvider);
      expect(dependencies).not.toContain(typeProvider);
    }
  );

  // A dependency that needs a newer Node than `@strapi/types` declares breaks installs with
  // `engine-strict`, and ships code that may not run on the Node versions we claim to support.
  test.each(dependencies)('%s supports the Node versions @strapi/types declares', (dependency) => {
    const ownRange = manifest.engines?.node;
    const dependencyRange = findInstalledManifest(dependency).manifest.engines?.node;

    expect(ownRange).toBeDefined();

    if (dependencyRange === undefined) {
      return;
    }

    expect(
      semver.subset(ownRange as string, dependencyRange),
      `${dependency} needs Node ${dependencyRange}, @strapi/types declares ${ownRange}`
    ).toBe(true);
  });
});
