import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

import { readJsonRecord } from '../bundles';
import { resolveIdExpression } from '../extract';
import { expandTemplateToJsonKeys, isAdminMessageId, resolveMessageId } from '../patterns';
import { fixLocaleFiles, validateBundle } from '../validate';
import { backfillMissingEnKeys } from '../write-en';
import type { TranslationBundle } from '../types';

describe('patterns', () => {
  it('detects admin message ids', () => {
    assert.equal(isAdminMessageId('global.save'), true);
    assert.equal(isAdminMessageId('upload.plugin.name'), false);
  });

  it('maps plugin json keys to message ids', () => {
    const pluginKeys = new Set(['plugin.name']);
    const adminKeys = new Set(['global.save']);

    assert.equal(
      resolveMessageId('plugin.name', 'upload', pluginKeys, adminKeys, true).messageId,
      'upload.plugin.name'
    );
  });

  it('expands attribute template prefixes from en keys', () => {
    const enKeys = ['attribute.text', 'attribute.text.description', 'attribute.boolean'];
    const expanded = expandTemplateToJsonKeys('attribute.${type}', enKeys, 'content-type-builder');

    assert.ok(expanded.includes('attribute.text'));
    assert.ok(expanded.includes('attribute.boolean'));
    assert.ok(!expanded.includes('attribute.text.description'));
  });
});

describe('extract.resolveIdExpression', () => {
  it('resolves helper calls as plugin ids', () => {
    const sourceFile = ts.createSourceFile(
      'tmp.ts',
      `const x = getTrad('plugin.name');`,
      ts.ScriptTarget.Latest,
      true
    );
    const call = (sourceFile.statements[0] as ts.VariableStatement).declarationList.declarations[0]
      .initializer as ts.CallExpression;

    const bundle = {
      packagePath: '/tmp',
      packageName: 'plugins/upload',
      enJsonPath: '/tmp/en.json',
      translationsDir: '/tmp',
      pluginPrefix: 'upload',
      sourceDirs: [],
    };

    const resolved = resolveIdExpression(call, bundle, new Set(['plugin.name']), new Set(), {
      pluginId: 'upload',
    });

    assert.equal(resolved.messageId, 'upload.plugin.name');
  });
});

describe('fixLocaleFiles', () => {
  it('reorders existing locale keys, removes extras, and preserves missing-key fallback', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-trad-'));
    const en = { 'b.key': 'B', 'missing.key': 'English fallback', 'a.key': 'A' };
    const fr = { 'a.key': 'A-fr', 'b.key': 'B-fr', 'extra.key': 'remove-me' };

    fs.writeFileSync(path.join(dir, 'en.json'), `${JSON.stringify(en, null, 2)}\n`);
    fs.writeFileSync(path.join(dir, 'fr.json'), `${JSON.stringify(fr, null, 2)}\n`);

    const bundle = {
      packagePath: dir,
      packageName: 'tmp/pkg',
      enJsonPath: path.join(dir, 'en.json'),
      translationsDir: dir,
      pluginPrefix: 'tmp',
      sourceDirs: [],
    };

    fixLocaleFiles(bundle);

    const fixed = readJsonRecord(path.join(dir, 'fr.json'));
    assert.deepEqual(Object.keys(fixed), ['b.key', 'a.key']);
    assert.deepEqual(fixed, { 'b.key': 'B-fr', 'a.key': 'A-fr' });
    assert.equal('missing.key' in fixed, false);
  });
});

describe('backfillMissingEnKeys', () => {
  it('adds missing en.json keys from defaultMessage before locale prune keeps translations', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-trad-backfill-'));
    const srcDir = path.join(dir, 'admin', 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'en.json'),
      `${JSON.stringify({ 'plugin.name': 'Upload' }, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(dir, 'fr.json'),
      `${JSON.stringify(
        { 'plugin.name': 'Upload-fr', 'used.key': 'Utilisée', 'orphan.key': 'Orpheline' },
        null,
        2
      )}\n`
    );
    fs.writeFileSync(
      path.join(srcDir, 'Widget.tsx'),
      `formatMessage({ id: getTrad('used.key'), defaultMessage: 'Used' });`
    );

    const adminDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-trad-admin-'));
    fs.writeFileSync(path.join(adminDir, 'en.json'), `${JSON.stringify({}, null, 2)}\n`);

    const bundle: TranslationBundle = {
      packagePath: dir,
      packageName: 'core/upload',
      enJsonPath: path.join(dir, 'en.json'),
      translationsDir: dir,
      pluginPrefix: 'upload',
      sourceDirs: [srcDir],
    };

    const adminBundle: TranslationBundle = {
      packagePath: adminDir,
      packageName: 'core/admin',
      enJsonPath: path.join(adminDir, 'en.json'),
      translationsDir: adminDir,
      pluginPrefix: null,
      sourceDirs: [],
    };

    const result = backfillMissingEnKeys([bundle], adminBundle);
    assert.equal(
      result.addedKeys.some((entry) => entry.key === 'used.key'),
      true
    );
    assert.equal(readJsonRecord(bundle.enJsonPath)['used.key'], 'Used');

    fixLocaleFiles(bundle);

    const fixed = readJsonRecord(path.join(dir, 'fr.json'));
    assert.deepEqual(fixed, { 'plugin.name': 'Upload-fr', 'used.key': 'Utilisée' });
  });

  it('backfills cross-package admin keys referenced from plugins', () => {
    const pluginDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-trad-plugin-'));
    const pluginSrc = path.join(pluginDir, 'admin', 'src');
    fs.mkdirSync(pluginSrc, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, 'en.json'),
      `${JSON.stringify({ 'plugin.name': 'Upload' }, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(pluginSrc, 'Widget.tsx'),
      `formatMessage({ id: 'global.move', defaultMessage: 'Move' });`
    );

    const adminDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-trad-admin2-'));
    const adminSrc = path.join(adminDir, 'admin', 'src');
    fs.mkdirSync(adminSrc, { recursive: true });
    fs.writeFileSync(
      path.join(adminDir, 'en.json'),
      `${JSON.stringify({ 'global.save': 'Save' }, null, 2)}\n`
    );

    const pluginBundle: TranslationBundle = {
      packagePath: pluginDir,
      packageName: 'core/upload',
      enJsonPath: path.join(pluginDir, 'en.json'),
      translationsDir: pluginDir,
      pluginPrefix: 'upload',
      sourceDirs: [pluginSrc],
    };

    const adminBundle: TranslationBundle = {
      packagePath: adminDir,
      packageName: 'core/admin',
      enJsonPath: path.join(adminDir, 'en.json'),
      translationsDir: adminDir,
      pluginPrefix: null,
      sourceDirs: [adminSrc],
    };

    backfillMissingEnKeys([adminBundle, pluginBundle], adminBundle);

    assert.equal(readJsonRecord(adminBundle.enJsonPath)['global.move'], 'Move');
    assert.equal(readJsonRecord(adminBundle.enJsonPath)['global.save'], 'Save');
  });
});

describe('validateBundle admin self-checks', () => {
  const makeAdminFixture = (source: string, en: Record<string, string>) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-admin-trad-'));
    const srcDir = path.join(dir, 'admin', 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'en.json'), `${JSON.stringify(en, null, 2)}\n`);
    fs.writeFileSync(path.join(srcDir, 'Widget.tsx'), source);

    const bundle: TranslationBundle = {
      packagePath: dir,
      packageName: 'core/admin',
      enJsonPath: path.join(dir, 'en.json'),
      translationsDir: dir,
      pluginPrefix: null,
      sourceDirs: [srcDir],
    };

    return { bundle, adminEn: en };
  };

  it('reports missing-en-key for core/admin formatMessage ids absent from en.json', () => {
    const { bundle, adminEn } = makeAdminFixture(
      `formatMessage({ id: 'global.missing-from-en', defaultMessage: 'Nope' });`,
      { 'global.save': 'Save' }
    );

    const issues = validateBundle(bundle, adminEn);
    const missing = issues.filter((issue) => issue.code === 'missing-en-key');

    assert.equal(missing.length, 1);
    assert.match(missing[0].message, /global\.missing-from-en/);
  });

  it('does not flag known core/admin keys as missing', () => {
    const { bundle, adminEn } = makeAdminFixture(
      `formatMessage({ id: 'global.save', defaultMessage: 'Save' });`,
      { 'global.save': 'Save' }
    );

    const issues = validateBundle(bundle, adminEn);
    assert.equal(issues.filter((issue) => issue.code === 'missing-en-key').length, 0);
  });
});

describe('validateBundle cross-package admin refs', () => {
  it('reports missing-admin-key when a plugin references an absent admin id', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-plugin-trad-'));
    const srcDir = path.join(dir, 'admin', 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'en.json'),
      `${JSON.stringify({ 'plugin.name': 'Upload' }, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(srcDir, 'Widget.tsx'),
      `formatMessage({ id: 'global.not-in-admin', defaultMessage: 'Nope' });`
    );

    const bundle: TranslationBundle = {
      packagePath: dir,
      packageName: 'plugins/upload',
      enJsonPath: path.join(dir, 'en.json'),
      translationsDir: dir,
      pluginPrefix: 'upload',
      sourceDirs: [srcDir],
    };

    const issues = validateBundle(bundle, { 'global.save': 'Save' });
    const missing = issues.filter((issue) => issue.code === 'missing-admin-key');

    assert.equal(missing.length, 1);
    assert.match(missing[0].message, /global\.not-in-admin/);
  });
});
