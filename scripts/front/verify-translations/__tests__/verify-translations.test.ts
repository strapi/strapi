import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

import { readJsonRecord } from '../bundles';
import { resolveIdExpression } from '../extract';
import { expandTemplateToJsonKeys, isAdminMessageId, resolveMessageId } from '../patterns';
import { fixLocaleFiles } from '../validate';

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
  it('reorders locale keys to match en.json and removes extras', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-trad-'));
    const en = { 'b.key': 'B', 'a.key': 'A' };
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
  });
});
