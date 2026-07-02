/* eslint-env jest */

/**
 * Validation is mocked so this suite does not pull in `validation/user` → `@strapi/utils`
 * (which resolves to built `dist/`). Validation behavior is covered separately in
 * `validation/__tests__/user.test.ts`.
 */
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import { validateProfileUpdateInput } from '../../validation/user';
import authenticatedUserController from '../authenticated-user';

jest.mock('../../validation/user', () => ({
  validateProfileUpdateInput: jest.fn(),
}));

const mockValidateProfileUpdateInput = jest.mocked(validateProfileUpdateInput);

const setStrapi = (value: object) => {
  (globalThis as any).strapi = value;
};

describe('Authenticated User Controller', () => {
  beforeEach(() => {
    mockValidateProfileUpdateInput.mockImplementation(
      async (input: unknown) => ({ ...(input as object) }) as any
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    test('Returns sanitized user from ctx.state.user', async () => {
      const sanitized = { id: 1, email: 'sanitized@example.com' };
      const sanitizeUser = jest.fn(() => sanitized);
      const user = { id: 1, email: 'raw@example.com' };

      setStrapi({
        admin: {
          services: {
            user: { sanitizeUser },
          },
        },
      });

      const ctx = createContext({}, { state: { user } }) as any;

      await authenticatedUserController.getMe(ctx);

      expect(sanitizeUser).toHaveBeenCalledWith(user);
      expect(ctx.body).toStrictEqual({ data: sanitized });
    });
  });

  describe('getOwnPermissions', () => {
    test('Maps findUserPermissions through sanitizePermission', async () => {
      const rawPermissions = [{ action: 'read' as const, subject: 'article' }];
      const findUserPermissions = jest.fn(() => Promise.resolve(rawPermissions));
      const sanitizePermission = jest.fn((p: unknown) => ({ ...(p as object), sanitized: true }));

      setStrapi({
        admin: {
          services: {
            permission: { findUserPermissions, sanitizePermission },
          },
        },
      });

      const user = { id: 7, email: 'u@example.com' };
      const ctx = createContext({}, { state: { user } }) as any;

      await authenticatedUserController.getOwnPermissions(ctx);

      expect(findUserPermissions).toHaveBeenCalledWith(user);
      expect(sanitizePermission).toHaveBeenCalledTimes(1);
      expect(ctx.body.data).toEqual([{ action: 'read', subject: 'article', sanitized: true }]);
    });
  });

  describe('updateMe', () => {
    const currentUser = { id: 42, password: 'stored-hash' };

    test('Returns validation error when email is already used by another admin', async () => {
      const exists = jest.fn(() => Promise.resolve(true));
      const updateById = jest.fn();
      const sanitizeUser = jest.fn((user) => user);
      const badRequest = jest.fn();
      const body = { email: 'taken@example.com', firstname: 'Kai' };

      setStrapi({
        admin: {
          services: {
            user: { exists, updateById, sanitizeUser },
            auth: { validatePassword: jest.fn() },
          },
        },
      });

      const ctx = createContext({ body }, { badRequest, state: { user: currentUser } }) as any;

      await authenticatedUserController.updateMe(ctx);

      expect(exists).toHaveBeenCalledWith({
        id: { $ne: currentUser.id },
        email: body.email,
      });
      expect(updateById).not.toHaveBeenCalled();
      expect(badRequest).toHaveBeenCalledWith('ValidationError', {
        email: ['Email already taken'],
      });
    });

    test('Lowercases email before validation, uniqueness check, and persistence', async () => {
      const exists = jest.fn(() => Promise.resolve(false));
      const updatedUser = {
        id: currentUser.id,
        email: 'kept@example.com',
        firstname: 'Kai',
      };
      const updateById = jest.fn(() => Promise.resolve(updatedUser));
      const sanitizeUser = jest.fn((u) => u);
      const body = { email: 'KEPT@EXAMPLE.COM', firstname: 'Kai' };

      setStrapi({
        admin: {
          services: {
            user: { exists, updateById, sanitizeUser },
            auth: { validatePassword: jest.fn() },
          },
        },
      });

      const ctx = createContext({ body }, { state: { user: currentUser } }) as any;

      await authenticatedUserController.updateMe(ctx);

      expect(mockValidateProfileUpdateInput).toHaveBeenCalledWith({
        email: 'kept@example.com',
        firstname: 'Kai',
      });
      expect(exists).toHaveBeenCalledWith({
        id: { $ne: currentUser.id },
        email: 'kept@example.com',
      });
      expect(updateById).toHaveBeenCalledWith(currentUser.id, {
        email: 'kept@example.com',
        firstname: 'Kai',
      });
    });

    test('Updates profile when email is not taken', async () => {
      const exists = jest.fn(() => Promise.resolve(false));
      const updatedUser = { id: currentUser.id, email: 'fresh@example.com', firstname: 'Kai' };
      const updateById = jest.fn(() => Promise.resolve(updatedUser));
      const sanitizeUser = jest.fn((user) => user);
      const body = { email: 'fresh@example.com' };

      setStrapi({
        admin: {
          services: {
            user: { exists, updateById, sanitizeUser },
            auth: { validatePassword: jest.fn() },
          },
        },
      });

      const ctx = createContext({ body }, { state: { user: currentUser } }) as any;

      await authenticatedUserController.updateMe(ctx);

      expect(updateById).toHaveBeenCalledWith(currentUser.id, {
        email: body.email,
      });
      expect(ctx.body).toStrictEqual({ data: updatedUser });
      expect(sanitizeUser).toHaveBeenCalledWith(updatedUser);
    });

    test('Does not call exists when email is omitted', async () => {
      const exists = jest.fn();
      const updatedUser = { id: currentUser.id, firstname: 'OnlyFirst' };
      const updateById = jest.fn(() => Promise.resolve(updatedUser));
      const sanitizeUser = jest.fn((user) => user);
      const body = { firstname: 'OnlyFirst' };

      setStrapi({
        admin: {
          services: {
            user: { exists, updateById, sanitizeUser },
            auth: { validatePassword: jest.fn() },
          },
        },
      });

      const ctx = createContext({ body }, { state: { user: currentUser } }) as any;

      await authenticatedUserController.updateMe(ctx);

      expect(exists).not.toHaveBeenCalled();
      expect(updateById).toHaveBeenCalledWith(currentUser.id, body);
    });

    test('Returns badRequest when currentPassword does not match', async () => {
      const validatePassword = jest.fn(() => Promise.resolve(false));
      const exists = jest.fn();
      const updateById = jest.fn();
      const sanitizeUser = jest.fn((user) => user);
      const badRequest = jest.fn();
      const body = {
        currentPassword: 'WrongPass123',
        password: 'NewPassword456',
      };

      setStrapi({
        admin: {
          services: {
            user: { exists, updateById, sanitizeUser },
            auth: { validatePassword },
          },
        },
      });

      const ctx = createContext({ body }, { badRequest, state: { user: currentUser } }) as any;

      await authenticatedUserController.updateMe(ctx);

      expect(validatePassword).toHaveBeenCalledWith(body.currentPassword, currentUser.password);
      expect(exists).not.toHaveBeenCalled();
      expect(updateById).not.toHaveBeenCalled();
      expect(badRequest).toHaveBeenCalledWith('ValidationError', {
        currentPassword: ['Invalid credentials'],
      });
    });

    test('Invalid password is checked before duplicate email validation', async () => {
      const validatePassword = jest.fn(() => Promise.resolve(false));
      const exists = jest.fn();
      const updateById = jest.fn();
      const sanitizeUser = jest.fn((user) => user);
      const badRequest = jest.fn();
      const body = {
        currentPassword: 'WrongPass123',
        password: 'NewPassword456',
        email: 'someone-else@example.com',
      };

      setStrapi({
        admin: {
          services: {
            user: { exists, updateById, sanitizeUser },
            auth: { validatePassword },
          },
        },
      });

      const ctx = createContext({ body }, { badRequest, state: { user: currentUser } }) as any;

      await authenticatedUserController.updateMe(ctx);

      expect(exists).not.toHaveBeenCalled();
      expect(badRequest).toHaveBeenCalledWith('ValidationError', {
        currentPassword: ['Invalid credentials'],
      });
    });

    test('Invalidates refresh tokens when password changes and session manager supports admin', async () => {
      const invalidateRefreshToken = jest.fn(() => Promise.resolve());
      const sessionManagerFn = jest.fn(() => ({ invalidateRefreshToken }));
      Object.assign(sessionManagerFn, {
        hasOrigin: jest.fn(() => true),
      });

      const validatePassword = jest.fn(() => Promise.resolve(true));
      const exists = jest.fn();
      const updatedUser = { id: currentUser.id };
      const updateById = jest.fn(() => Promise.resolve(updatedUser));
      const sanitizeUser = jest.fn((user) => user);
      const body = {
        currentPassword: 'Password123',
        password: 'NewPassword456',
      };

      setStrapi({
        admin: {
          services: {
            user: { exists, updateById, sanitizeUser },
            auth: { validatePassword },
          },
        },
        sessionManager: sessionManagerFn,
      });

      const ctx = createContext({ body }, { state: { user: currentUser } }) as any;

      await authenticatedUserController.updateMe(ctx);

      expect(sessionManagerFn).toHaveBeenCalledWith('admin');
      expect(invalidateRefreshToken).toHaveBeenCalledWith(String(currentUser.id));
      expect(updateById).toHaveBeenCalled();
    });

    test('Does not invalidate sessions when session manager is missing', async () => {
      const validatePassword = jest.fn(() => Promise.resolve(true));
      const exists = jest.fn();
      const updatedUser = { id: currentUser.id };
      const updateById = jest.fn(() => Promise.resolve(updatedUser));
      const sanitizeUser = jest.fn((user) => user);
      const body = {
        currentPassword: 'Password123',
        password: 'NewPassword456',
      };

      setStrapi({
        admin: {
          services: {
            user: { exists, updateById, sanitizeUser },
            auth: { validatePassword },
          },
        },
      });

      const ctx = createContext({ body }, { state: { user: currentUser } }) as any;

      await authenticatedUserController.updateMe(ctx);

      expect(updateById).toHaveBeenCalled();
    });

    test('Does not invalidate sessions when session manager has no admin origin', async () => {
      const invalidateRefreshToken = jest.fn();
      const sessionManagerFn = jest.fn(() => ({ invalidateRefreshToken }));
      Object.assign(sessionManagerFn, {
        hasOrigin: jest.fn(() => false),
      });

      const validatePassword = jest.fn(() => Promise.resolve(true));
      const exists = jest.fn();
      const updatedUser = { id: currentUser.id };
      const updateById = jest.fn(() => Promise.resolve(updatedUser));
      const sanitizeUser = jest.fn((user) => user);
      const body = {
        currentPassword: 'Password123',
        password: 'NewPassword456',
      };

      setStrapi({
        admin: {
          services: {
            user: { exists, updateById, sanitizeUser },
            auth: { validatePassword },
          },
        },
        sessionManager: sessionManagerFn,
      });

      const ctx = createContext({ body }, { state: { user: currentUser } }) as any;

      await authenticatedUserController.updateMe(ctx);

      expect(invalidateRefreshToken).not.toHaveBeenCalled();
      expect(updateById).toHaveBeenCalled();
    });

    test('Does not invalidate sessions when the email is already taken', async () => {
      const invalidateRefreshToken = jest.fn(() => Promise.resolve());
      const sessionManagerFn = jest.fn(() => ({ invalidateRefreshToken }));
      Object.assign(sessionManagerFn, {
        hasOrigin: jest.fn(() => true),
      });

      const validatePassword = jest.fn(() => Promise.resolve(true));
      const exists = jest.fn(() => Promise.resolve(true));
      const updateById = jest.fn();
      const sanitizeUser = jest.fn((user) => user);
      const badRequest = jest.fn();
      const body = {
        currentPassword: 'Password123',
        password: 'NewPassword456',
        email: 'taken@example.com',
      };

      setStrapi({
        admin: {
          services: {
            user: { exists, updateById, sanitizeUser },
            auth: { validatePassword },
          },
        },
        sessionManager: sessionManagerFn,
      });

      const ctx = createContext({ body }, { badRequest, state: { user: currentUser } }) as any;

      await authenticatedUserController.updateMe(ctx);

      expect(exists).toHaveBeenCalled();
      expect(invalidateRefreshToken).not.toHaveBeenCalled();
      expect(updateById).not.toHaveBeenCalled();
      expect(badRequest).toHaveBeenCalledWith('ValidationError', {
        email: ['Email already taken'],
      });
    });
  });
});
