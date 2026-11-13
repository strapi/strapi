import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { assertNodeVersion } from '../assert-node-version';

describe('assertNodeVersion', () => {
  it('takes Node 22.12 and later', () => {
    for (const version of ['22.12.0', '22.12.1', '22.13.0', '22.20.1', '24.18.0', '26.0.0']) {
      expect(() => assertNodeVersion(version), version).not.toThrow();
    }
  });

  it('refuses anything older, and says what is needed and why', () => {
    for (const version of ['22.11.0', '22.0.0', '20.19.0', '18.20.4']) {
      expect(() => assertNodeVersion(version), version).toThrow(/Node\.js 22\.12/);
      expect(() => assertNodeVersion(version), version).toThrow(version);
    }

    expect(() => assertNodeVersion('22.11.0')).toThrow(/require\(\)/);
  });

  it('runs on the Node it is running on', () => {
    expect(() => assertNodeVersion()).not.toThrow();
  });
});

/**
 * Better Auth is loaded with `require()` by the first module that imports it, so the check has to
 * be imported before that one: it is the first import of every entry point that reaches Better Auth.
 */
describe('the check is the first thing each entry point loads', () => {
  const firstImport = (file: string) => {
    const source = readFileSync(join(__dirname, '..', file), 'utf8');

    return source.match(/^import\s.+?;$/ms)?.[0];
  };

  it.each([
    ['index.ts', "import './assert-node-version';"],
    ['engine/better-auth/public/plugins.ts', "import '../../../assert-node-version';"],
    ['engine/better-auth/public/passkey.ts', "import '../../../assert-node-version';"],
  ])('%s', (file, expected) => {
    expect(firstImport(file)).toBe(expected);
  });
});
