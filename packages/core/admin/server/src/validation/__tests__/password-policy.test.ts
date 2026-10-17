import { validateUpdatePasswordPolicy } from '../password-policy';

const validPolicy = {
  minLength: 12,
  requireLowercase: true,
  requireUppercase: false,
  requireNumber: true,
  requireSpecialCharacter: true,
};

const errorsOf = (body: unknown): string[] => {
  try {
    validateUpdatePasswordPolicy(body);
    return [];
  } catch (e: any) {
    return (e?.details?.errors ?? []).map((error: { path: string[] }) => error.path.join('.'));
  }
};

describe('password policy validation', () => {
  test('accepts a complete policy', () => {
    expect(validateUpdatePasswordPolicy(validPolicy)).toEqual(validPolicy);
  });

  test('rejects a minimum length below 8 or above 64', () => {
    expect(errorsOf({ ...validPolicy, minLength: 7 })).toEqual(['minLength']);
    expect(errorsOf({ ...validPolicy, minLength: 65 })).toEqual(['minLength']);
  });

  test('rejects a non-integer minimum length', () => {
    expect(errorsOf({ ...validPolicy, minLength: 8.5 })).toEqual(['minLength']);
    expect(errorsOf({ ...validPolicy, minLength: '12' })).toEqual(['minLength']);
  });

  test('rejects non-boolean flags', () => {
    expect(errorsOf({ ...validPolicy, requireNumber: 'yes' })).toEqual(['requireNumber']);
  });

  test('requires every rule to be present', () => {
    const { requireSpecialCharacter: _omitted, ...incomplete } = validPolicy;

    expect(errorsOf(incomplete)).toEqual(['requireSpecialCharacter']);
  });

  test('rejects unknown keys', () => {
    expect(errorsOf({ ...validPolicy, maxLength: 20 })).toHaveLength(1);
  });
});
