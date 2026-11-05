import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import plugin from '../plugins/registries.ts';
import { registries } from '../registries.ts';

/**
 * Unit test for the `strapi-registries/declared-dependencies` rule: a package's
 * `server/src/registries.ts` may only import contracts of packages its nearest
 * `package.json` declares as a dependency or peer dependency.
 */

type Report = { node: unknown; message: string };

const rule = plugin.rules['declared-dependencies'];

let root: string;

beforeAll(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'oxlint-registries-')));
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

/**
 * Writes `manifest` as the package.json of a fresh package dir and returns the path of its
 * (not created) `server/src/registries.ts`. A fresh dir per test keeps the rule's manifest
 * cache from leaking between tests.
 */
const createPackage = (name: string, manifest: Record<string, unknown>) => {
  const packageDir = path.join(root, name);
  fs.mkdirSync(path.join(packageDir, 'server/src'), { recursive: true });
  fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify(manifest));
  return path.join(packageDir, 'server/src/registries.ts');
};

const lint = (filename: string, specifiers: string[]) => {
  const reports: Report[] = [];
  const visitor = rule.create({ filename, report: (report) => reports.push(report) });
  specifiers.forEach((value) => visitor.ImportDeclaration({ source: { value } }));
  return reports;
};

describe('strapi-registries/declared-dependencies', () => {
  test('accepts imports of dependencies and peer dependencies', () => {
    const filename = createPackage('declared', {
      name: '@strapi/declared',
      dependencies: { '@strapi/upload': '5.0.0' },
      peerDependencies: { '@strapi/strapi': '5.0.0' },
    });

    expect(lint(filename, ['@strapi/upload', '@strapi/strapi'])).toEqual([]);
  });

  test('resolves the package name of scoped and unscoped deep imports', () => {
    const filename = createPackage('deep-imports', {
      name: '@strapi/deep-imports',
      dependencies: { '@strapi/upload': '5.0.0', lodash: '4.0.0' },
    });

    expect(lint(filename, ['@strapi/upload/strapi-server', 'lodash/fp'])).toEqual([]);
  });

  test('reports an import of an undeclared package with the package name', () => {
    const filename = createPackage('undeclared', {
      name: '@strapi/undeclared',
      dependencies: { '@strapi/upload': '5.0.0' },
      devDependencies: { '@strapi/i18n': '5.0.0' },
    });
    const node = { source: { value: '@strapi/i18n/strapi-server' } };

    const reports: Report[] = [];
    rule.create({ filename, report: (report) => reports.push(report) }).ImportDeclaration(node);

    expect(reports).toEqual([
      {
        node,
        message:
          "'@strapi/i18n' must be a dependency or peer dependency of '@strapi/undeclared' to load its contracts.",
      },
    ]);
  });

  test('reads the nearest package.json above the linted file', () => {
    const outer = createPackage('outer', {
      name: '@strapi/outer',
      dependencies: { '@strapi/upload': '5.0.0' },
    });
    const nestedDir = path.join(path.dirname(outer), 'nested');
    fs.mkdirSync(path.join(nestedDir, 'server/src'), { recursive: true });
    fs.writeFileSync(path.join(nestedDir, 'package.json'), JSON.stringify({ name: 'nested' }));

    expect(lint(path.join(nestedDir, 'server/src/registries.ts'), ['@strapi/upload'])).toEqual([
      expect.objectContaining({
        message:
          "'@strapi/upload' must be a dependency or peer dependency of 'nested' to load its contracts.",
      }),
    ]);
  });

  test('reports every import when no package.json is found', () => {
    // The temp root has no package.json up to the filesystem root.
    const filename = path.join(root, 'orphan/server/src/registries.ts');

    expect(lint(filename, ['@strapi/upload'])).toEqual([
      expect.objectContaining({
        message:
          "'@strapi/upload' must be a dependency or peer dependency of 'undefined' to load its contracts.",
      }),
    ]);
  });

  test('the registries override enables this rule under the plugin name', () => {
    const [ruleName] = Object.keys(registries.rules);

    expect(ruleName).toBe(`${plugin.meta.name}/declared-dependencies`);
    expect(registries.files).toEqual(['**/server/src/registries.ts']);
  });
});
