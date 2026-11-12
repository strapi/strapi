import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { normalizeName } from '../apis';

// Shared with the type generators of @strapi/typescript-utils, which derive the same uids
const fixture: { cases: Array<[string, string]> } = JSON.parse(
  readFileSync(join(__dirname, '../../../../../../tests/fixtures/kebab-names.json'), 'utf8')
);

describe('normalizeName', () => {
  test.each(fixture.cases)('normalizes %j to %j', (name, expected) => {
    expect(normalizeName(name)).toBe(expected);
  });
});
