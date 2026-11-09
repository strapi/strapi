import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { COMPAT_ROWS } from '../rows';

/** The repository root: the nearest folder above this one that holds the API tests. */
const repositoryRoot = (): string => {
  let dir = __dirname;

  while (!existsSync(join(dir, 'tests/api/plugins/end-users'))) {
    const parent = dirname(dir);

    if (parent === dir) {
      throw new Error('The repository root was not found.');
    }

    dir = parent;
  }

  return resolve(dir);
};

const root = repositoryRoot();
const sources = new Map<string, string>();

const read = (file: string): string => {
  if (!sources.has(file)) {
    sources.set(file, readFileSync(join(root, file), 'utf8'));
  }

  return sources.get(file) as string;
};

/** A call that does not run: `it.skip`, `it.todo`, `xit`, `xtest`. */
const SKIPPED_CALLEE = /(?:\.(?:skip|todo)|^x(?:it|test))$/;

/** Whether `title` is the title of a test that runs: a skipped or todo one is no coverage. */
const hasTitle = (file: string, title: string): boolean => {
  const source = read(file);

  return ["'", '"', '`'].some((quote) => {
    const needle = `(${quote}${title}${quote}`;

    for (let at = source.indexOf(needle); at !== -1; at = source.indexOf(needle, at + 1)) {
      const callee = /[\w.$]+$/.exec(source.slice(0, at))?.[0] ?? '';

      if (!SKIPPED_CALLEE.test(callee)) {
        return true;
      }
    }

    return false;
  });
};

describe('the compat coverage ledger', () => {
  it('has the 36 rows of the checklist, once each', () => {
    const numbers = COMPAT_ROWS.map((entry) => entry.row);

    expect(numbers).toEqual(Array.from({ length: 36 }, (_, index) => index + 1));
  });

  it('has a passing test name for every must-keep row and a test or note for every shim and major row', () => {
    for (const entry of COMPAT_ROWS) {
      if (entry.class === 'must-keep') {
        expect(entry.tests.length, `row ${entry.row} has no test`).toBeGreaterThan(0);
      } else {
        expect(
          entry.tests.length > 0 || Boolean(entry.note),
          `row ${entry.row} has neither a test nor a note`
        ).toBe(true);
      }
    }
  });

  it('does not count a skipped or todo test as coverage', () => {
    // Built from pieces, so this file never holds a skipped test of its own
    const skipped = ['it.sk', "ip('a title', () => {});", "xit('another', () => {});"].join('');
    const todo = ['it.to', "do('a third');"].join('');
    const running = "it('a title', () => {});";

    sources.set('fake.ts', [skipped, todo, running].join('\n'));

    expect(hasTitle('fake.ts', 'a title')).toBe(true);
    expect(hasTitle('fake.ts', 'another')).toBe(false);
    expect(hasTitle('fake.ts', 'a third')).toBe(false);

    sources.set('fake.ts', skipped);

    expect(hasTitle('fake.ts', 'a title')).toBe(false);
  });

  it('names only tests that are in their files', () => {
    const missing = COMPAT_ROWS.flatMap((entry) =>
      entry.tests
        .filter(({ file, title }) => !hasTitle(file, title))
        .map(({ file, title }) => `row ${entry.row}: ${file}: ${title}`)
    );

    expect(missing).toEqual([]);
  });

  it('points at files that exist under the compat API tests or the package', () => {
    const files = new Set(COMPAT_ROWS.flatMap((entry) => entry.tests.map(({ file }) => file)));

    for (const file of files) {
      expect(
        file.startsWith('tests/api/plugins/end-users/compat/') ||
          file.startsWith('packages/plugins/end-users/'),
        file
      ).toBe(true);
      expect(existsSync(join(root, file)), file).toBe(true);
    }
  });

  it('carries the documented break on rows 1, 7, 9 and 20', () => {
    for (const number of [1, 7, 9, 20]) {
      const entry = COMPAT_ROWS.find(({ row }) => row === number);

      expect(entry?.break, `row ${number} has no break`).toBeTruthy();
    }
  });

  it('has a note on every row the migration has to act on', () => {
    for (const number of [7, 8, 9, 17, 21, 22, 23, 25, 29, 31, 32, 33, 34, 36]) {
      const entry = COMPAT_ROWS.find(({ row }) => row === number);

      expect(entry?.note, `row ${number} has no note`).toBeTruthy();
    }
  });

  it('records each break that compatibility mode accepts, on its row', () => {
    const text = (number: number): string => {
      const entry = COMPAT_ROWS.find(({ row }) => row === number);

      return `${entry?.break ?? ''} ${entry?.note ?? ''}`;
    };

    expect(text(1)).toContain('opaque session token');
    expect(text(1)).toContain('TWO_FACTOR_REQUIRED');
    expect(text(2)).toContain('already taken');
    expect(text(2)).toContain('native sign-in by username refuses');
    expect(text(4)).toContain('only if the token was issued no later than the cutover');
    expect(text(6)).toContain('first role');
    expect(text(12)).toContain('403');
    expect(text(15)).toContain('signs the user out everywhere');
    expect(text(26)).toContain('per-email bucket is gone');
    expect(text(30)).toContain('core pagination');
    expect(text(30)).toContain('role read permission');
  });

  it('never says phase, and names no ruling or decision number', () => {
    const texts = COMPAT_ROWS.flatMap((entry) => [
      entry.break ?? '',
      entry.note ?? '',
      ...entry.tests.map(({ title }) => title),
    ]);

    for (const text of texts) {
      expect(text).not.toMatch(/phase/i);
      expect(text).not.toMatch(/decision\s*\d|ruling|P5-\d/i);
    }
  });
});
