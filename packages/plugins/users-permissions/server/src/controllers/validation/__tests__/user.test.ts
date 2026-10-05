import { describe, expect, test } from 'vitest';
import { validateCreateUserBody, validateUpdateUserBody, validateDeleteRoleBody } from '../user';

const validBody = { username: 'alice', email: 'alice@example.com', password: 'password' };

describe('user validation', () => {
  test.each([1, '1', { connect: [{ id: 1 }] }, { connect: [{ documentId: 'role-1' }] }])(
    'accepts a role relation %j',
    async (role) => {
      await expect(validateCreateUserBody({ ...validBody, role })).resolves.toBeDefined();
    }
  );

  test.each([undefined, { connect: [] }, { connect: [{}] }, {}])(
    'rejects creation without a valid role %j',
    async (role) => {
      await expect(validateCreateUserBody({ ...validBody, role })).rejects.toThrow();
    }
  );

  test.each([{ disconnect: [{ id: 1 }] }, { disconnect: [{ documentId: 'role-1' }] }])(
    'rejects removing the only role %j',
    async (role) => {
      await expect(validateUpdateUserBody({ role })).rejects.toThrow('Cannot remove role');
    }
  );

  test('allows replacing the user role', async () => {
    await expect(
      validateUpdateUserBody({
        role: { disconnect: [{ id: 1 }], connect: [{ documentId: 'role-2' }] },
      })
    ).resolves.toBeDefined();
  });

  test.each([null, '', 'new-password'])(
    'leaves empty password handling to the caller for %s',
    async (password) => {
      await expect(validateUpdateUserBody({ password })).resolves.toBeDefined();
    }
  );

  test.each([42, {}, []])('rejects non-string passwords %j', async (password) => {
    await expect(validateUpdateUserBody({ password })).rejects.toThrow(
      'Password must be at least 1 character'
    );
  });

  test('requires a role identifier for deletion', async () => {
    await expect(validateDeleteRoleBody({})).rejects.toThrow();
    await expect(validateDeleteRoleBody({ role: '1' })).resolves.toEqual({ role: '1' });
  });
});
