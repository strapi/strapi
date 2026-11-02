import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addPublishedFiles,
  classifyPath,
  emptyPublishedFiles,
  mergeTier,
  collectNamedExports,
  collectRoutePaths,
  diffManifest,
  diffNamedExports,
  diffRoutes,
  diffSchema,
} from '../surfaces';

describe('classifyPath', () => {
  it('ignores sandboxes, tests, tooling and contributor docs', () => {
    for (const filePath of [
      'examples/getstarted/src/index.ts',
      'tests/api/core/foo.test.api.js',
      'scripts/breaking-changes/index.ts',
      'docs/docs/guides/e2e/00-setup.md',
      'packages/core/core/src/__tests__/foo.test.ts',
      'packages/core/admin/dist/index.js',
    ]) {
      assert.equal(classifyPath(filePath), null, filePath);
    }
  });

  it('treats published types as tier 1', () => {
    assert.equal(classifyPath('packages/core/types/src/modules/documents.ts')?.tier, 1);
  });

  it('treats only the entry file of a provider as its tier 1 interface', () => {
    const published = emptyPublishedFiles();

    addPublishedFiles(published, 'packages/providers/email-sendgrid/package.json', {
      source: './src/index.ts',
    });

    assert.equal(
      classifyPath('packages/providers/email-sendgrid/src/index.ts', published)?.tier,
      1
    );
    assert.equal(
      classifyPath('packages/providers/email-sendgrid/src/utils.ts', published)?.tier,
      3
    );
  });

  it('treats CLI binaries as tier 1 and CLI and GraphQL internals as tier 2', () => {
    const published = emptyPublishedFiles();

    addPublishedFiles(published, 'packages/core/strapi/package.json', {
      name: '@strapi/strapi',
      bin: './bin/strapi.js',
    });

    assert.equal(classifyPath('packages/core/strapi/bin/strapi.js', published)?.tier, 1);
    assert.equal(classifyPath('packages/cli/create-strapi-app/src/index.ts')?.tier, 2);
    assert.equal(classifyPath('packages/core/strapi/src/cli/commands/build.ts')?.tier, 2);
    assert.equal(classifyPath('packages/plugins/graphql/server/src/services/utils.ts')?.tier, 2);
    assert.equal(
      classifyPath('packages/cli/create-strapi-app/templates/example/src/api/about/routes/about.ts')
        ?.tier,
      3
    );
  });

  it('treats Content API routes, schemas and config as tier 1', () => {
    assert.equal(
      classifyPath('packages/plugins/users-permissions/server/src/routes/content-api/auth.js')
        ?.tier,
      1
    );
    assert.equal(
      classifyPath('packages/core/content-manager/server/src/content-types/foo/schema.json')?.tier,
      1
    );
    assert.equal(classifyPath('packages/core/core/src/config/index.ts')?.tier, 1);
    assert.equal(classifyPath('packages/core/core/src/configuration/config-loader.ts')?.tier, 1);
    assert.equal(
      classifyPath('packages/plugins/graphql/server/src/config/default-config.ts')?.tier,
      1
    );
  });

  it('treats a route file of unknown type as tier 1, because it cannot be ruled out', () => {
    assert.equal(classifyPath('packages/core/upload/server/src/routes/index.ts')?.tier, 1);
  });

  it('treats admin routes outside the admin package as tier 2', () => {
    assert.equal(classifyPath('packages/core/upload/server/src/routes/admin.ts')?.tier, 2);
  });

  it('treats automatic data migrations as tier 3', () => {
    assert.equal(classifyPath('packages/core/database/src/migrations/runner.ts')?.tier, 3);
    assert.equal(classifyPath('packages/core/core/src/migrations/draft-publish.ts')?.tier, 3);
  });

  it('treats admin-panel implementation as tier 3', () => {
    assert.equal(
      classifyPath('packages/core/content-manager/admin/src/history/routes.tsx')?.tier,
      3
    );
  });

  it('lifts every file the export map publishes to at least tier 2', () => {
    const published = emptyPublishedFiles();

    addPublishedFiles(published, 'packages/core/admin/package.json', {
      exports: {
        './strapi-admin/ee': { types: './dist/admin/src/ee.d.ts', source: './admin/src/ee.ts' },
        './_internal': { source: './_internal/index.ts' },
      },
    });
    addPublishedFiles(published, 'packages/core/upload/package.json', {
      exports: { './_internal/shared': { source: './shared/index.ts' } },
    });
    addPublishedFiles(published, 'packages/core/types/package.json', {
      exports: { '.': { source: './src/index.ts' }, './*': './*' },
    });

    for (const filePath of [
      'packages/core/admin/admin/src/ee.ts',
      'packages/core/admin/_internal/index.ts',
      'packages/core/upload/shared/index.ts',
    ]) {
      assert.equal(classifyPath(filePath)?.tier, 3, `${filePath} without the export map`);
      assert.equal(classifyPath(filePath, published)?.tier, 2, filePath);
    }

    // A more severe path tier is kept.
    assert.equal(classifyPath('packages/core/types/src/index.ts', published)?.tier, 1);
  });

  it('treats manifests, entry points and the Admin API as tier 2', () => {
    assert.equal(classifyPath('packages/core/core/package.json')?.tier, 2);
    assert.equal(classifyPath('packages/core/core/src/index.ts')?.tier, 2);
    assert.equal(
      classifyPath('packages/core/admin/server/src/controllers/authentication.ts')?.tier,
      2
    );
  });

  it('treats Admin API routes as tier 2, not the generic tier 1 routes rule', () => {
    assert.equal(classifyPath('packages/core/admin/server/src/routes/authentication.ts')?.tier, 2);
  });

  it('treats the Query Engine as tier 1, separately from the rest of the database layer', () => {
    assert.equal(classifyPath('packages/core/database/src/query/query-builder.ts')?.tier, 1);
    assert.equal(classifyPath('packages/core/database/src/schema/diff.ts')?.tier, 3);
  });

  it('treats unremarkable package internals as tier 3', () => {
    assert.equal(
      classifyPath('packages/core/core/src/services/entity-validator/helpers.ts')?.tier,
      3
    );
  });
});

describe('diffManifest', () => {
  it('flags a removed export subpath', () => {
    const findings = diffManifest(
      {
        exports: { '.': { require: './dist/index.js' }, './admin': { require: './dist/admin.js' } },
      },
      { exports: { '.': { require: './dist/index.js' } } }
    );

    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'export-map:removed-subpath');
    assert.match(findings[0].detail, /\.\/admin/);
  });

  it('flags changed export conditions but not additions', () => {
    const changed = diffManifest(
      { exports: { '.': { require: './dist/index.js', types: './dist/index.d.ts' } } },
      { exports: { '.': { require: './dist/index.js' } } }
    );

    assert.equal(changed[0].rule, 'export-map:changed-conditions');

    const added = diffManifest(
      { exports: { '.': { require: './dist/index.js' } } },
      { exports: { '.': { require: './dist/index.js' }, './new': { require: './dist/new.js' } } }
    );

    assert.deepEqual(added, []);
  });

  it('flags a narrowed engines range as tier 1', () => {
    const findings = diffManifest({ engines: { node: '>=22' } }, { engines: { node: '>=24' } });

    assert.equal(findings[0].tier, 1);
    assert.equal(findings[0].rule, 'engines:changed');
  });

  it('flags peer dependency and bin removals', () => {
    const peers = diffManifest(
      { peerDependencies: { react: '^18.0.0' } },
      { peerDependencies: { react: '^19.0.0' } }
    );

    assert.equal(peers[0].rule, 'peer-deps:changed');

    const bins = diffManifest({ bin: { strapi: './bin/strapi.js' } }, { bin: {} });

    assert.equal(bins[0].rule, 'bin:removed');
    assert.equal(bins[0].tier, 1);
  });

  it('treats a string bin as one executable named after the package', () => {
    const removed = diffManifest(
      { name: '@strapi/strapi', bin: './bin/strapi.js' },
      { name: '@strapi/strapi' }
    );

    assert.equal(removed.length, 1);
    assert.equal(removed[0].rule, 'bin:removed');
    assert.match(removed[0].detail, /"strapi"/);
  });

  it('flags a bin that points at a different file', () => {
    const findings = diffManifest(
      { name: '@strapi/strapi', bin: './bin/strapi.js' },
      { name: '@strapi/strapi', bin: './bin/strapi.mjs' }
    );

    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'bin:changed-path');
    assert.match(findings[0].detail, /strapi\.mjs/);
  });

  it('accepts a switch between the string and object forms of the same bin', () => {
    assert.deepEqual(
      diffManifest(
        { name: 'create-strapi', bin: './bin/index.js' },
        { name: 'create-strapi', bin: { 'create-strapi': './bin/index.js' } }
      ),
      []
    );
  });

  it('is silent on an unchanged manifest', () => {
    const manifest = { name: '@strapi/core', exports: { '.': { require: './dist/index.js' } } };

    assert.deepEqual(diffManifest(manifest, { ...manifest }), []);
  });
});

describe('diffSchema', () => {
  it('flags removed attributes, type changes and newly required fields', () => {
    const findings = diffSchema(
      {
        kind: 'collectionType',
        attributes: {
          title: { type: 'string' },
          legacy: { type: 'text' },
          slug: { type: 'string' },
        },
      },
      {
        kind: 'collectionType',
        attributes: { title: { type: 'text' }, slug: { type: 'string', required: true } },
      }
    );

    const rules = findings.map((finding) => finding.rule).sort();

    assert.deepEqual(rules, [
      'schema:attribute-now-required',
      'schema:changed-attribute-type',
      'schema:removed-attribute',
    ]);
    assert.ok(findings.every((finding) => finding.tier === 1));
  });

  it('treats a new optional attribute as additive but a new required one as breaking', () => {
    const optional = diffSchema({ attributes: {} }, { attributes: { extra: { type: 'string' } } });

    assert.deepEqual(optional, []);

    const required = diffSchema(
      { attributes: {} },
      { attributes: { extra: { type: 'string', required: true } } }
    );

    assert.equal(required[0].rule, 'schema:new-required-attribute');
  });

  it('flags a kind change', () => {
    const findings = diffSchema({ kind: 'collectionType' }, { kind: 'singleType' });

    assert.equal(findings[0].rule, 'schema:kind-changed');
  });
});

describe('collectNamedExports', () => {
  it('picks up declarations, re-exports and aliases', () => {
    const names = collectNamedExports(`
      export const createStrapi = () => {};
      export function loadConfig() {}
      export class Strapi {}
      export type Config = { a: string };
      export interface Options {}
      export { internal as documents, plain };
      export { type OnlyAType };
    `);

    for (const expected of [
      'createStrapi',
      'loadConfig',
      'Strapi',
      'Config',
      'Options',
      'documents',
      'plain',
      'OnlyAType',
    ]) {
      assert.ok(names.has(expected), `missing ${expected}`);
    }

    assert.equal(names.has('internal'), false);
  });
});

describe('diffNamedExports', () => {
  it('flags a removed export and ignores an added one', () => {
    const removed = diffNamedExports(
      'export const a = 1;\nexport const b = 2;',
      'export const a = 1;'
    );

    assert.equal(removed.length, 1);
    assert.equal(removed[0].rule, 'exports:removed-symbol');
    assert.match(removed[0].detail, /"b"/);

    assert.deepEqual(
      diffNamedExports('export const a = 1;', 'export const a = 1;\nexport const c = 3;'),
      []
    );
  });

  it('flags a removed default export, including a bare reference default export', () => {
    const removed = diffNamedExports(
      'const admin = {};\nexport default admin;',
      'const admin = {};\nexport { admin };'
    );

    assert.equal(removed.length, 1);
    assert.equal(removed[0].rule, 'exports:removed-default');

    assert.deepEqual(
      diffNamedExports('export default admin;', 'export default admin;\nexport const b = 2;'),
      []
    );
  });
});

describe('diffRoutes', () => {
  it('flags a removed route path only', () => {
    const before = `[{ method: 'GET', path: '/documents' }, { method: 'POST', path: '/documents/:id' }]`;
    const after = `[{ method: 'GET', path: '/documents' }, { method: 'GET', path: '/new' }]`;
    const findings = diffRoutes(before, after);

    assert.equal(findings.length, 1);
    // The rule alone only knows the route was served; the path tier decides the rest.
    assert.equal(findings[0].tier, 2);
    assert.match(findings[0].detail, /\/documents\/:id/);
  });

  it('collects route paths', () => {
    assert.deepEqual([...collectRoutePaths(`path: '/a'`)], ['/a']);
  });
});

describe('mergeTier', () => {
  it('keeps the more severe of the path tier and the rule tier', () => {
    assert.equal(mergeTier(1, 2), 1);
    assert.equal(mergeTier(2, 1), 1);
    assert.equal(mergeTier(2, 2), 2);
  });
});
