/* eslint-env jest */

import { mergeValidatedBody } from '../merge-validated-body';

describe('mergeValidatedBody', () => {
  test('Overlays Yup-style transforms onto the raw body (e.g. email lowercasing)', () => {
    const input = { email: 'USER@EXAMPLE.COM', firstname: 'Kai' };
    const validated = { email: 'user@example.com' };

    expect(mergeValidatedBody(input, validated)).toEqual({
      email: 'user@example.com',
      firstname: 'Kai',
    });
  });

  test('Returns a shallow copy of input when validated payload is undefined', () => {
    const input = { a: 1 };
    const out = mergeValidatedBody(input, undefined);
    expect(out).toEqual(input);
    expect(out).not.toBe(input);
  });

  test('Returns a shallow copy of input when validated payload is null', () => {
    const input = { a: 1 };
    expect(mergeValidatedBody(input, null)).toEqual({ a: 1 });
  });

  test('Ignores arrays (invalid validated shape)', () => {
    const input = { email: 'a@b.com' };
    expect(mergeValidatedBody(input, [] as unknown as object)).toEqual(input);
  });

  test('Ignores primitive validated values', () => {
    expect(mergeValidatedBody({ x: 1 }, 'oops' as any)).toEqual({ x: 1 });
  });
});
