/* eslint-env jest */

/**
 * These exercise the real validators (not the mocked controller suite) to lock in a subtle
 * contract: `validateYupSchema` runs with `{ strict: true }` (see
 * packages/core/utils/src/validators.ts), so the email `.lowercase()` and firstname `.trim()`
 * rules behave as assertions, not transforms — non-normalized input is rejected, never rewritten.
 *
 * Controllers that want to accept mixed-case email must lowercase it themselves before validating
 * (see `normalizeEmail`); relying on Yup to normalize would silently reject those requests.
 */
import { validateProfileUpdateInput, validateUserUpdateInput } from '../user';

const messagesOf = async (fn: () => Promise<unknown>): Promise<string[]> => {
  try {
    await fn();
    throw new Error('Expected validation to reject, but it resolved');
  } catch (e: any) {
    const errors = e?.details?.errors ?? [];
    return errors.map((err: { message: string }) => err.message);
  }
};

describe('admin user update validation (strict mode)', () => {
  describe('validateProfileUpdateInput', () => {
    test('rejects an uppercase email rather than lowercasing it', async () => {
      const messages = await messagesOf(() =>
        validateProfileUpdateInput({ email: 'CASE-B@STRAPI.IO' })
      );
      expect(messages).toContain('email must be a lowercase string');
    });

    test('rejects an untrimmed firstname rather than trimming it', async () => {
      const messages = await messagesOf(() =>
        validateProfileUpdateInput({ email: 'a@b.io', firstname: '  spaced  ' })
      );
      expect(messages).toContain('firstname must be a trimmed string');
    });

    test('returns already-normalized input unchanged', async () => {
      const input = { email: 'a@b.io', firstname: 'Kai' };
      const result = await validateProfileUpdateInput(input);
      expect(result).toEqual(input);
    });
  });

  describe('validateUserUpdateInput', () => {
    test('rejects an uppercase email rather than lowercasing it', async () => {
      const messages = await messagesOf(() =>
        validateUserUpdateInput({ email: 'CASE-B@STRAPI.IO', roles: [1] })
      );
      expect(messages).toContain('email must be a lowercase string');
    });
  });
});
