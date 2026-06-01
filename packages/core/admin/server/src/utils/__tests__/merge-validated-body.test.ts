import { mergeValidatedBody } from '../merge-validated-body';

describe('mergeValidatedBody', () => {
  test('overlays Yup transforms onto the raw body', () => {
    const input = { email: 'USER@EXAMPLE.COM', firstname: 'Kai' };
    const validated = { email: 'user@example.com' };

    expect(mergeValidatedBody(input, validated)).toEqual({
      email: 'user@example.com',
      firstname: 'Kai',
    });
  });

  test('returns a shallow copy of input when validated payload is missing or invalid', () => {
    const input = { email: 'user@example.com' };

    const undefinedResult = mergeValidatedBody(input, undefined);

    expect(undefinedResult).toEqual(input);
    expect(undefinedResult).not.toBe(input);
    expect(mergeValidatedBody(input, null)).toEqual(input);
    expect(mergeValidatedBody(input, [])).toEqual(input);
    expect(mergeValidatedBody(input, 'invalid')).toEqual(input);
  });
});
