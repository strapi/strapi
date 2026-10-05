import { describe, expect, it } from 'vitest';

import { UsersPermissionsRouteValidator } from '../validation';

describe('content API user role validation', () => {
  const validator = new UsersPermissionsRouteValidator({});
  const user = { username: 'user', email: 'user@example.com', password: 'password' };

  it.each([
    1,
    'document-id',
    { connect: [{ id: 1 }] },
    { connect: [{ documentId: 'role-document' }] },
    { disconnect: [{ id: '1' }] },
  ])('accepts supported relation notation: %s', (role) => {
    expect(validator.createUserBodySchema.safeParse({ ...user, role }).success).toBe(true);
    expect(validator.updateUserBodySchema.safeParse({ role }).success).toBe(true);
  });

  it.each([{}, { connect: [{}] }, { disconnect: [{}] }, { connect: [null] }, true])(
    'rejects malformed role relations: %s',
    (role) => {
      expect(validator.createUserBodySchema.safeParse({ ...user, role }).success).toBe(false);
      expect(validator.updateUserBodySchema.safeParse({ role }).success).toBe(false);
    }
  );

  it('allows partial updates and rejects invalid registration email', () => {
    expect(validator.updateUserBodySchema.safeParse({}).success).toBe(true);
    expect(validator.registerBodySchema.safeParse({ ...user, email: 'invalid' }).success).toBe(
      false
    );
  });
});
