import vm from 'node:vm';

import { createYupSchema } from '../validation';

// Runs `fn` with a hard time limit and returns how long it took. A backtracking regex is
// synchronous and Jest can't interrupt it, so a regression would hang the job instead of failing.
// The vm timeout stops it mid-match and throws.
const timedWithLimit = (limitMs: number, fn: () => void) => {
  const start = process.hrtime.bigint();
  vm.runInNewContext('fn()', { fn }, { timeout: limitMs });
  return Number(process.hrtime.bigint() - start) / 1e6;
};

describe('createYupSchema email attribute', () => {
  const attributes = { email: { type: 'email' } } as const;

  // Drafts skip the server's email format check, so a stored draft can hold any string. Bulk
  // Publish and the release screens validate stored entries as soon as they open.
  // The linear `.email()` is applied globally: in the browser by the admin entry, here by
  // `@strapi/utils`, which this package's test setup loads. This guards the schema path; the
  // admin's own tests guard the browser wiring.
  test.each([
    ['a domain made of many short labels', `a@${'a.'.repeat(24)}!`],
    ['an unterminated quoted local part', `"${'x'.repeat(28)}`],
  ])('rejects a stored email with %s without freezing', (_, email) => {
    const schema = createYupSchema(attributes, {}, { status: 'published' });

    let valid = true;
    const duration = timedWithLimit(1000, () => {
      valid = schema.isValidSync({ email });
    });

    expect(valid).toBe(false);
    expect(duration).toBeLessThan(100);
  });

  test('accepts a normal stored email', () => {
    const schema = createYupSchema(attributes, {}, { status: 'published' });

    expect(schema.isValidSync({ email: 'user@example.com' })).toBe(true);
  });
});
