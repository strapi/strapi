import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

import { pluginPrefixFromPackageName, readJsonRecord } from '../bundles';
import { extractMessages, resolveIdExpression } from '../extract';
import {
  adminNamespacesFromKeys,
  expandTemplateToJsonKeys,
  isAdminMessageId,
  resolveMessageId,
} from '../patterns';
import { fixLocaleFiles, validateBundle } from '../validate';
import { backfillMissingEnKeys } from '../backfill-en';
import { writeEnJsonForBundle } from '../write-en';
import type { TranslationBundle } from '../types';

describe('pluginPrefixFromPackageName', () => {
  it('derives prefix from package path (core/admin is null)', () => {
    assert.equal(pluginPrefixFromPackageName('core/admin'), null);
    assert.equal(pluginPrefixFromPackageName('core/content-manager'), 'content-manager');
    assert.equal(pluginPrefixFromPackageName('plugins/i18n'), 'i18n');
    assert.equal(pluginPrefixFromPackageName('plugins/users-permissions'), 'users-permissions');
  });
});

describe('patterns', () => {
  it('detects admin message ids from derived namespaces', () => {
    const adminKeys = new Set(['global.save', 'Settings.foo', 'app.bar']);

    assert.equal(isAdminMessageId('global.save', adminKeys), true);
    assert.equal(isAdminMessageId('Settings.missing', adminKeys), true);
    assert.equal(isAdminMessageId('upload.plugin.name', adminKeys), false);
    assert.deepEqual([...adminNamespacesFromKeys(adminKeys)].sort(), [
      'Settings.',
      'app.',
      'global.',
    ]);
  });

  it('maps plugin json keys to message ids', () => {
    const pluginKeys = new Set(['plugin.name']);
    const adminKeys = new Set(['global.save']);

    assert.equal(
      resolveMessageId('plugin.name', 'upload', pluginKeys, adminKeys, true).messageId,
      'upload.plugin.name'
    );
  });

  it('routes missing Settings.* ids to core/admin via derived namespaces', () => {
    const adminKeys = new Set(['Settings.roles.title']);
    const resolved = resolveMessageId(
      'Settings.roles.missing',
      'upload',
      new Set(['plugin.name']),
      adminKeys
    );

    assert.equal(resolved.targetBundle, 'core/admin');
    assert.equal(resolved.messageId, 'Settings.roles.missing');
  });

  it('expands attribute.${type} to one-segment keys only', () => {
    const enKeys = ['attribute.text', 'attribute.text.description', 'attribute.boolean'];
    const expanded = expandTemplateToJsonKeys('attribute.${type}', enKeys, 'content-type-builder');

    assert.deepEqual(expanded.sort(), ['attribute.boolean', 'attribute.text']);
  });

  it('expands attribute.${type}.description correctly (not non-description keys)', () => {
    const enKeys = [
      'attribute.text',
      'attribute.text.description',
      'attribute.boolean',
      'attribute.boolean.description',
    ];
    const expanded = expandTemplateToJsonKeys(
      'attribute.${type}.description',
      enKeys,
      'content-type-builder'
    );

    assert.deepEqual(expanded.sort(), [
      'attribute.boolean.description',
      'attribute.text.description',
    ]);
  });

  it('expands mid-hole templates like CMEditViewBulkLocale.${action}-title', () => {
    const enKeys = [
      'CMEditViewBulkLocale.publish-title',
      'CMEditViewBulkLocale.unpublish-title',
      'CMEditViewBulkLocale.status',
    ];
    const expanded = expandTemplateToJsonKeys(
      'CMEditViewBulkLocale.${action}-title',
      enKeys,
      'i18n'
    );

    assert.deepEqual(expanded.sort(), [
      'CMEditViewBulkLocale.publish-title',
      'CMEditViewBulkLocale.unpublish-title',
    ]);
  });

  it('falls back to multi-segment holes when one-segment matches nothing', () => {
    const enKeys = [
      'popUpWarning.bodyMessage.category.delete',
      'popUpWarning.bodyMessage.contentType.delete',
      'popUpWarning.bodyMessage.delete-condition',
    ];
    const expanded = expandTemplateToJsonKeys(
      'popUpWarning.bodyMessage.${type}',
      enKeys,
      'content-type-builder'
    );

    // one-segment matches delete-condition; prefer that over multi-segment
    assert.deepEqual(expanded, ['popUpWarning.bodyMessage.delete-condition']);
  });

  it('uses multi-segment expand when only dotted hole values exist', () => {
    const enKeys = [
      'popUpWarning.bodyMessage.category.delete',
      'popUpWarning.bodyMessage.contentType.delete',
    ];
    const expanded = expandTemplateToJsonKeys(
      'popUpWarning.bodyMessage.${type}',
      enKeys,
      'content-type-builder'
    );

    assert.deepEqual(expanded.sort(), [
      'popUpWarning.bodyMessage.category.delete',
      'popUpWarning.bodyMessage.contentType.delete',
    ]);
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

  it('folds ternary branches inside getTrad template literals', () => {
    const sourceFile = ts.createSourceFile(
      'tmp.ts',
      `const x = getTrad(\`CMEditViewBulkLocale.\${isBulkPublish ? 'publish' : 'unpublish'}-title\`);`,
      ts.ScriptTarget.Latest,
      true
    );
    const call = (sourceFile.statements[0] as ts.VariableStatement).declarationList.declarations[0]
      .initializer as ts.CallExpression;

    const bundle = {
      packagePath: '/tmp',
      packageName: 'plugins/i18n',
      enJsonPath: '/tmp/en.json',
      translationsDir: '/tmp',
      pluginPrefix: 'i18n',
      sourceDirs: [],
    };

    const resolved = resolveIdExpression(
      call,
      bundle,
      new Set(['CMEditViewBulkLocale.publish-title', 'CMEditViewBulkLocale.unpublish-title']),
      new Set(),
      { pluginId: 'i18n' }
    );

    assert.equal(
      resolved.messageId,
      'i18n.CMEditViewBulkLocale.publish-title|i18n.CMEditViewBulkLocale.unpublish-title'
    );
  });
});

describe('extractMessages finite-enum smoke', () => {
  it('expands getTrad template against package en.json', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-trad-enum-'));
    const srcDir = path.join(dir, 'admin', 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'en.json'),
      `${JSON.stringify(
        {
          'attribute.text': 'Text',
          'attribute.boolean': 'Boolean',
          'attribute.text.description': 'Text desc',
        },
        null,
        2
      )}\n`
    );
    fs.writeFileSync(
      path.join(srcDir, 'Widget.tsx'),
      `formatMessage({ id: getTrad(\`attribute.\${type}\`), defaultMessage: 'Field' });`
    );

    const bundle: TranslationBundle = {
      packagePath: dir,
      packageName: 'core/content-type-builder',
      enJsonPath: path.join(dir, 'en.json'),
      translationsDir: dir,
      pluginPrefix: 'content-type-builder',
      sourceDirs: [srcDir],
    };

    const extractions = extractMessages(bundle, new Set());
    const withExpanded = extractions.filter(
      (e) => e.expandedJsonKeys && e.expandedJsonKeys.length > 1
    );

    assert.ok(withExpanded.length >= 1);
    assert.deepEqual(withExpanded[0].expandedJsonKeys?.sort(), [
      'attribute.boolean',
      'attribute.text',
    ]);
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
  it('backfills keys from getTrad descriptors that carry a sibling defaultMessage', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-trad-sibling-'));
    const srcDir = path.join(dir, 'admin', 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'en.json'), `${JSON.stringify({}, null, 2)}\n`);
    fs.writeFileSync(
      path.join(srcDir, 'Widget.tsx'),
      `
        const label = {
          id: getTrad('settings.section.pdf.label'),
          defaultMessage: 'PDF',
        };
        formatMessage(
          editing
            ? { id: getTrad('modal.edit'), defaultMessage: 'Save' }
            : { id: getTrad('modal.create'), defaultMessage: 'Create' }
        );
      `
    );

    const adminDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-trad-admin3-'));
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

    backfillMissingEnKeys([bundle], adminBundle);

    const en = readJsonRecord(bundle.enJsonPath);
    assert.equal(en['settings.section.pdf.label'], 'PDF');
    assert.equal(en['modal.edit'], 'Save');
    assert.equal(en['modal.create'], 'Create');
  });
});

describe('validateLocaleFile order vs orphans', () => {
  const makeLocaleFixture = (en: Record<string, string>, locale: Record<string, string>) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-trad-locale-'));
    fs.writeFileSync(path.join(dir, 'en.json'), `${JSON.stringify(en, null, 2)}\n`);
    fs.writeFileSync(path.join(dir, 'fr.json'), `${JSON.stringify(locale, null, 2)}\n`);

    const bundle: TranslationBundle = {
      packagePath: dir,
      packageName: 'tmp/pkg',
      enJsonPath: path.join(dir, 'en.json'),
      translationsDir: dir,
      pluginPrefix: 'tmp',
      sourceDirs: [],
    };

    return bundle;
  };

  it('reports extra-locale-key without locale-key-order when shared keys match en order', () => {
    // Shared keys a→b match en order; orphan between them must not force a false order error.
    const bundle = makeLocaleFixture(
      { 'a.key': 'A', 'b.key': 'B' },
      { 'a.key': 'A-fr', 'orphan.key': 'X', 'b.key': 'B-fr' }
    );

    const issues = validateBundle(bundle, {});
    const codes = issues.map((issue) => issue.code);

    assert.ok(codes.includes('extra-locale-key'));
    assert.equal(codes.includes('locale-key-order'), false);
  });

  it('still reports locale-key-order when shared keys are out of en order', () => {
    const bundle = makeLocaleFixture(
      { 'a.key': 'A', 'b.key': 'B' },
      { 'b.key': 'B-fr', 'orphan.key': 'X', 'a.key': 'A-fr' }
    );

    const issues = validateBundle(bundle, {});
    const codes = issues.map((issue) => issue.code);

    assert.ok(codes.includes('extra-locale-key'));
    assert.ok(codes.includes('locale-key-order'));
  });
});

describe('writeEnJsonForBundle', () => {
  it('updates en.json from defaultMessage and prefers existing en on conflicts', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-trad-write-en-'));
    const srcDir = path.join(dir, 'admin', 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'en.json'),
      `${JSON.stringify({ 'plugin.name': 'Upload' }, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(srcDir, 'Widget.tsx'),
      `
        formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Media Library' });
        formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Upload' });
        formatMessage({ id: getTrad('new.key'), defaultMessage: 'New' });
      `
    );

    const bundle: TranslationBundle = {
      packagePath: dir,
      packageName: 'core/upload',
      enJsonPath: path.join(dir, 'en.json'),
      translationsDir: dir,
      pluginPrefix: 'upload',
      sourceDirs: [srcDir],
    };

    const result = writeEnJsonForBundle(bundle, new Set());

    assert.equal(result.changed, true);
    assert.deepEqual(readJsonRecord(bundle.enJsonPath), {
      'plugin.name': 'Upload',
      'new.key': 'New',
    });
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
