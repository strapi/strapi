import type { AdminUser } from '../../../../shared/contracts/shared';

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
  global.strapi = value as any;
};

describe('Authenticated User Controller', () => {
  const currentUser = { id: 42, password: 'stored-hash' } as AdminUser;

  beforeEach(() => {
    mockValidateProfileUpdateInput.mockImplementation(async (input: unknown) => ({
      ...(input as object),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateMe', () => {
    test('returns a validation error when email is already used by another admin', async () => {
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

    test('uses validated profile data for uniqueness checks and persistence', async () => {
      mockValidateProfileUpdateInput.mockImplementation(async (input: unknown) => ({
        ...(input as object),
        email: 'normalized@example.com',
      }));

      const exists = jest.fn(() => Promise.resolve(false));
      const updatedUser = {
        id: currentUser.id,
        email: 'normalized@example.com',
        firstname: 'Kai',
      };
      const updateById = jest.fn(() => Promise.resolve(updatedUser));
      const sanitizeUser = jest.fn((user) => user);
      const body = { email: 'NORMALIZED@EXAMPLE.COM', firstname: 'Kai' };

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

      expect(exists).toHaveBeenCalledWith({
        id: { $ne: currentUser.id },
        email: 'normalized@example.com',
      });
      expect(updateById).toHaveBeenCalledWith(currentUser.id, {
        email: 'normalized@example.com',
        firstname: 'Kai',
      });
      expect(ctx.body).toStrictEqual({ data: updatedUser });
    });

    test('does not call exists when email is omitted', async () => {
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

    test('checks password validity before duplicate email validation', async () => {
      const validatePassword = jest.fn(() => Promise.resolve(false));
      const exists = jest.fn();
      const updateById = jest.fn();
      const badRequest = jest.fn();
      const body = {
        currentPassword: 'WrongPass123',
        password: 'NewPassword456',
        email: 'someone-else@example.com',
      };

      setStrapi({
        admin: {
          services: {
            user: { exists, updateById, sanitizeUser: jest.fn((user) => user) },
            auth: { validatePassword },
          },
        },
      });

      const ctx = createContext({ body }, { badRequest, state: { user: currentUser } }) as any;

      await authenticatedUserController.updateMe(ctx);

      expect(exists).not.toHaveBeenCalled();
      expect(updateById).not.toHaveBeenCalled();
      expect(badRequest).toHaveBeenCalledWith('ValidationError', {
        currentPassword: ['Invalid credentials'],
      });
    });
  });
});
