import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const configPath = path.resolve(import.meta.dirname, '../oxlint.config.ts');
const oxlintBin = path.join(
  path.dirname(createRequire(import.meta.url).resolve('oxlint/package.json')),
  'bin/oxlint'
);

type Diagnostic = { code: string; labels: { span: { line: number } }[] };

let root: string;

beforeAll(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'oxlint-lodash-')));
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

// Returns the lines reported by `strapi/no-restricted-lodash-calls`.
const lintLines = (source: string) => {
  const probe = path.join(root, 'probe.js');
  fs.writeFileSync(probe, source);

  let stdout: string;
  try {
    stdout = execFileSync(
      process.execPath,
      [oxlintBin, '--config', configPath, '--format', 'json', probe],
      { cwd: root, encoding: 'utf8' }
    );
  } catch (error) {
    // oxlint exits 1 when it reports errors.
    stdout = (error as { stdout: string }).stdout;
  }

  const { diagnostics } = JSON.parse(stdout) as { diagnostics: Diagnostic[] };
  return diagnostics
    .filter((diagnostic) => diagnostic.code === 'strapi(no-restricted-lodash-calls)')
    .map((diagnostic) => diagnostic.labels[0].span.line)
    .sort((a, b) => a - b);
};

describe('strapi/no-restricted-lodash-calls', () => {
  test('reports restricted methods on lodash bindings and lodash/<method> paths', () => {
    const source = [
      "import _ from 'lodash';",
      '_.map([1], String);',
      "_['map']([1], String);",
      "const l = require('lodash');",
      'l.map([1], String);',
      "const { map } = require('lodash');",
      "require('lodash').map([1], String);",
      "require('lodash/map.js');",
      "import('lodash/keys');",
      'export { map };',
    ].join('\n');

    expect(lintLines(source)).toEqual([2, 3, 5, 6, 7, 8, 9]);
  });

  test('ignores unrestricted lodash methods and non-lodash objects', () => {
    const source = [
      "import _ from 'lodash';",
      '_.reduce([1], (a, b) => a + b, 0);',
      '_.uniq([1]);',
      "require('lodash/reduce');",
      'const other = { map: () => [] };',
      'other.map();',
    ].join('\n');

    expect(lintLines(source)).toEqual([]);
  });
});
