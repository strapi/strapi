import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { EMAIL_REGEX } from '../email-regex';

// Read as text: create-strapi-app does not depend on `@strapi/utils`.
const readCoreRegex = () => {
  const source = readFileSync(
    path.join(__dirname, '../../../../../core/utils/src/email-regex.ts'),
    'utf8'
  );
  const literal = source
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('/^'));

  if (!literal) {
    throw new Error('EMAIL_REGEX literal not found in @strapi/utils');
  }

  const lastSlash = literal.lastIndexOf('/');

  return {
    source: literal.slice(1, lastSlash),
    flags: literal.slice(lastSlash + 1).replace(/;$/, ''),
  };
};

describe('EMAIL_REGEX', () => {
  it('is identical to the pattern that strapi admin:create-user uses', () => {
    const core = readCoreRegex();

    expect(EMAIL_REGEX.source).toBe(core.source);
    expect(EMAIL_REGEX.flags).toBe(core.flags);
  });
});
