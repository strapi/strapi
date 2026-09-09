import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyPath,
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

  it('treats published types, providers and the CLI as tier 1', () => {
    assert.equal(classifyPath('packages/core/types/src/modules/documents.ts')?.tier, 1);
    assert.equal(classifyPath('packages/providers/email-sendgrid/src/index.ts')?.tier, 1);
    assert.equal(classifyPath('packages/cli/create-strapi-app/src/index.ts')?.tier, 1);
  });

  it('treats routes, schemas and config as tier 1', () => {
    assert.equal(classifyPath('packages/core/upload/server/src/routes/admin.ts')?.tier, 1);
    assert.equal(
      classifyPath('packages/core/content-manager/server/src/content-types/foo/schema.json')?.tier,
      1
    );
    assert.equal(classifyPath('packages/core/core/src/config/index.ts')?.tier, 1);
  });

  it('treats manifests, entry points and the Admin API as tier 2', () => {
    assert.equal(classifyPath('packages/core/core/package.json')?.tier, 2);
    assert.equal(classifyPath('packages/core/core/src/index.ts')?.tier, 2);
    assert.equal(
      classifyPath('packages/core/admin/server/src/controllers/authentication.ts')?.tier,
      2
    );
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
});

describe('diffRoutes', () => {
  it('flags a removed route path only', () => {
    const before = `[{ method: 'GET', path: '/documents' }, { method: 'POST', path: '/documents/:id' }]`;
    const after = `[{ method: 'GET', path: '/documents' }, { method: 'GET', path: '/new' }]`;
    const findings = diffRoutes(before, after);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].tier, 1);
    assert.match(findings[0].detail, /\/documents\/:id/);
  });

  it('collects route paths', () => {
    assert.deepEqual([...collectRoutePaths(`path: '/a'`)], ['/a']);
  });
});
