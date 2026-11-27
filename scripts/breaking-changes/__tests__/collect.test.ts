import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collectFindings, type Sources } from '../collect';
import { addPublishedFiles, emptyPublishedFiles, type ChangedFile } from '../surfaces';

const sources = (
  before: Record<string, string>,
  after: Record<string, string>,
  published = emptyPublishedFiles()
): Sources => ({
  readBefore: (filePath) => before[filePath] ?? null,
  readAfter: (filePath) => after[filePath] ?? null,
  published,
});

const modified = (filePath: string): ChangedFile => ({ path: filePath, kind: 'modified' });

describe('collectFindings', () => {
  it('reports a removed @strapi/types export as tier 1, not the tier 2 of the export rule', () => {
    const filePath = 'packages/core/types/src/modules/documents.ts';
    const findings = collectFindings(
      [modified(filePath)],
      sources(
        { [filePath]: 'export type A = string;\nexport type B = string;' },
        { [filePath]: 'export type A = string;' }
      )
    );

    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'exports:removed-symbol');
    assert.equal(findings[0].tier, 1);
  });

  it('keeps a removed Admin API route at tier 2', () => {
    const filePath = 'packages/core/admin/server/src/routes/authentication.ts';
    const findings = collectFindings(
      [modified(filePath)],
      sources(
        { [filePath]: `[{ path: '/login' }, { path: '/renew-token' }]` },
        { [filePath]: `[{ path: '/login' }]` }
      )
    );

    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'routes:removed-path');
    assert.equal(findings[0].tier, 2);
  });

  it('reports a removed Content API route at tier 1', () => {
    const filePath = 'packages/plugins/users-permissions/server/src/routes/content-api/auth.js';
    const findings = collectFindings(
      [modified(filePath)],
      sources(
        { [filePath]: `[{ path: '/auth/local' }, { path: '/auth/logout' }]` },
        { [filePath]: `[{ path: '/auth/local' }]` }
      )
    );

    assert.equal(findings[0].tier, 1);
  });

  it('reports a narrowed engines range in a tier 2 manifest at tier 1', () => {
    const filePath = 'packages/core/core/package.json';
    const findings = collectFindings(
      [modified(filePath)],
      sources(
        { [filePath]: JSON.stringify({ engines: { node: '>=22' } }) },
        { [filePath]: JSON.stringify({ engines: { node: '>=24' } }) }
      )
    );

    assert.equal(findings[0].rule, 'engines:changed');
    assert.equal(findings[0].tier, 1);
  });

  it('reports one finding for a removed string bin', () => {
    const filePath = 'packages/core/strapi/package.json';
    const findings = collectFindings(
      [modified(filePath)],
      sources(
        { [filePath]: JSON.stringify({ name: '@strapi/strapi', bin: './bin/strapi.js' }) },
        { [filePath]: JSON.stringify({ name: '@strapi/strapi' }) }
      )
    );

    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'bin:removed');
    assert.equal(findings[0].tier, 1);
  });

  it('reports edits to files that only the export map publishes', () => {
    const published = emptyPublishedFiles();

    addPublishedFiles(published, 'packages/core/admin/package.json', {
      exports: {
        './_internal': { source: './_internal/index.ts' },
        './strapi-admin/ee': { source: './admin/src/ee.ts' },
      },
    });
    addPublishedFiles(published, 'packages/core/content-manager/package.json', {
      exports: { './_internal/shared': { source: './shared/index.ts' } },
    });

    const files = [
      'packages/core/admin/_internal/index.ts',
      'packages/core/admin/admin/src/ee.ts',
      'packages/core/content-manager/shared/index.ts',
    ];
    const findings = collectFindings(
      files.map(modified),
      sources(
        Object.fromEntries(files.map((file) => [file, 'export const a = 1;\nexport const b = 2;'])),
        Object.fromEntries(files.map((file) => [file, 'export const a = 1;'])),
        published
      )
    );

    assert.deepEqual(findings.map((finding) => finding.path).sort(), [...files].sort());
    assert.ok(findings.every((finding) => finding.tier === 2));
  });

  it('reports a change in the configuration loader', () => {
    const filePath = 'packages/core/core/src/configuration/config-loader.ts';
    const findings = collectFindings(
      [modified(filePath)],
      sources({ [filePath]: 'a' }, { [filePath]: 'b' })
    );

    assert.equal(findings[0].rule, 'surface:touched');
    assert.equal(findings[0].tier, 1);
  });

  it('reports the old path of a public file renamed into an internal path', () => {
    const findings = collectFindings(
      [
        {
          path: 'packages/core/core/src/services/old-config.ts',
          oldPath: 'packages/core/core/src/configuration/urls.ts',
          kind: 'renamed',
        },
      ],
      sources({}, {})
    );

    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'file:renamed');
    assert.equal(findings[0].path, 'packages/core/core/src/configuration/urls.ts');
    assert.equal(findings[0].tier, 1);
  });

  it('ignores automatic data migrations', () => {
    assert.deepEqual(
      collectFindings(
        [modified('packages/core/database/src/migrations/runner.ts')],
        sources({}, {})
      ),
      []
    );
  });
});
