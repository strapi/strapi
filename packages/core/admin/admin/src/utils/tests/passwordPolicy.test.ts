import { createIntl, createIntlCache } from 'react-intl';
import { ValidationError } from 'yup';

import {
  DEFAULT_PASSWORD_POLICY,
  createPasswordSchema,
  formatPasswordPolicyHint,
} from '../passwordPolicy';
import { translatedErrors } from '../translatedErrors';

import type { PasswordPolicy } from '../../../../shared/contracts/admin';

const errorIdsOf = async (password: string, policy?: PasswordPolicy): Promise<string[]> => {
  try {
    await createPasswordSchema(policy).validate(password, { abortEarly: false });
    return [];
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;

    return error.errors.map((message) => (message as unknown as { id: string }).id);
  }
};

const RELAXED_POLICY: PasswordPolicy = {
  minLength: 12,
  requireLowercase: false,
  requireUppercase: false,
  requireNumber: false,
  requireSpecialCharacter: false,
};

describe('passwordPolicy', () => {
  describe('createPasswordSchema', () => {
    it('accepts a password satisfying the default policy', async () => {
      expect(await errorIdsOf('Testing1234')).toEqual([]);
    });

    it('reports every broken rule of the default policy', async () => {
      expect(await errorIdsOf('123')).toEqual([
        translatedErrors.minLength.id,
        'components.Input.error.contain.lowercase',
        'components.Input.error.contain.uppercase',
      ]);
    });

    it('carries the configured minimum length in the message values', async () => {
      try {
        await createPasswordSchema({ ...DEFAULT_PASSWORD_POLICY, minLength: 12 }).validate(
          'Testing1234'
        );
        throw new Error('expected a validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).errors[0]).toMatchObject({
          id: translatedErrors.minLength.id,
          values: { min: 12 },
        });
      }
    });

    it('only checks the rules the policy enables', async () => {
      expect(await errorIdsOf('lowercaseonly!', RELAXED_POLICY)).toEqual([]);
      expect(await errorIdsOf('short', RELAXED_POLICY)).toEqual([translatedErrors.minLength.id]);
    });

    it('can require a special character', async () => {
      const policy = { ...DEFAULT_PASSWORD_POLICY, requireSpecialCharacter: true };

      expect(await errorIdsOf('Testing1234', policy)).toEqual([
        'components.Input.error.contain.specialCharacter',
      ]);
      expect(await errorIdsOf('Testing1234!', policy)).toEqual([]);
    });

    it('keeps rejecting passwords over 72 bytes whatever the policy', async () => {
      expect(await errorIdsOf(`aA1${'b'.repeat(70)}`, RELAXED_POLICY)).toEqual([
        'components.Input.error.contain.maxBytes',
      ]);
    });

    it('leaves a missing value to the required rule', async () => {
      await expect(createPasswordSchema().validate(undefined)).resolves.toBeUndefined();
    });
  });

  describe('formatPasswordPolicyHint', () => {
    const { formatMessage } = createIntl({ locale: 'en', messages: {} }, createIntlCache());

    it('lists the enabled rules', () => {
      expect(formatPasswordPolicyHint(DEFAULT_PASSWORD_POLICY, formatMessage)).toBe(
        'Must be at least 8 characters, 1 lowercase, 1 uppercase, 1 number'
      );
      expect(
        formatPasswordPolicyHint(
          { ...DEFAULT_PASSWORD_POLICY, requireSpecialCharacter: true },
          formatMessage
        )
      ).toBe(
        'Must be at least 8 characters, 1 lowercase, 1 uppercase, 1 number, 1 special character'
      );
    });

    it('only mentions the length when no other rule is enabled', () => {
      expect(formatPasswordPolicyHint(RELAXED_POLICY, formatMessage)).toBe(
        'Must be at least 12 characters'
      );
    });
  });
});
