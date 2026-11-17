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
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'oxlint-restricted-imports-')));
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

// Returns the lines reported by `no-restricted-imports`.
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
    .filter((diagnostic) => diagnostic.code === 'eslint(no-restricted-imports)')
    .map((diagnostic) => diagnostic.labels[0].span.line)
    .sort((a, b) => a - b);
};

const nativeStringArrayHelpers = [
  'toLower',
  'toUpper',
  'trim',
  'trimStart',
  'trimEnd',
  'padEnd',
  'padStart',
  'includes',
  'every',
];

describe('no-restricted-imports for lodash string and array helpers', () => {
  test.each(nativeStringArrayHelpers)('reports %s as a named, deep and deep .js import', (name) => {
    const source = [
      `import { ${name} } from 'lodash';`,
      `import a from 'lodash/${name}';`,
      `import b from 'lodash/${name}.js';`,
    ].join('\n');

    expect(lintLines(source)).toEqual([1, 2, 3]);
  });

  test('ignores unrestricted lodash imports', () => {
    const source = ["import { reduce } from 'lodash';", "import uniq from 'lodash/uniq';"].join(
      '\n'
    );

    expect(lintLines(source)).toEqual([]);
  });
});
