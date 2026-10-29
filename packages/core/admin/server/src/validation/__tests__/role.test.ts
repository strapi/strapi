/* eslint-env jest */

/**
 * Role `name` and `description` are stored in varchar(255) columns. Without a max length the
 * database rejected longer values and the admin got a 500 instead of a validation error.
 */
import {
  validateRoleCreateInput,
  validateRoleDeleteInput,
  validateRolesDeleteInput,
  validateRoleUpdateInput,
} from '../role';
import { validateRoleCreateInput as validateEERoleCreateInput } from '../../../../ee/server/src/validation/role';

const tooLong = 'a'.repeat(256);
const atLimit = 'a'.repeat(255);

describe('Role validation', () => {
  describe.each([
    ['validateRoleCreateInput', validateRoleCreateInput],
    ['EE validateRoleCreateInput', validateEERoleCreateInput],
  ])('%s', (_, validate) => {
    test('rejects a description longer than 255 characters', async () => {
      await expect(validate({ name: 'Editor', description: tooLong })).rejects.toMatchObject({
        name: 'ValidationError',
        details: { errors: [expect.objectContaining({ path: ['description'] })] },
      });
    });

    test('rejects a name longer than 255 characters', async () => {
      await expect(validate({ name: tooLong })).rejects.toMatchObject({
        name: 'ValidationError',
        details: { errors: [expect.objectContaining({ path: ['name'] })] },
      });
    });

    test('accepts a name and description of 255 characters', async () => {
      await expect(validate({ name: atLimit, description: atLimit })).resolves.toBeDefined();
    });
  });

  describe('validateRoleUpdateInput', () => {
    test('rejects a description longer than 255 characters', async () => {
      await expect(validateRoleUpdateInput({ description: tooLong })).rejects.toMatchObject({
        name: 'ValidationError',
        details: { errors: [expect.objectContaining({ path: ['description'] })] },
      });
    });

    test('rejects a name longer than 255 characters', async () => {
      await expect(validateRoleUpdateInput({ name: tooLong })).rejects.toMatchObject({
        name: 'ValidationError',
        details: { errors: [expect.objectContaining({ path: ['name'] })] },
      });
    });

    test('accepts a description of 255 characters and a null description', async () => {
      await expect(validateRoleUpdateInput({ description: atLimit })).resolves.toBeDefined();
      await expect(validateRoleUpdateInput({ description: null })).resolves.toBeDefined();
    });
  });

  describe('role deletion', () => {
    const setup = (deletionError?: string) => {
      const checkRolesIdForDeletion = jest.fn(async () => {
        if (deletionError !== undefined) {
          throw new Error(deletionError);
        }
      });
      global.strapi = { admin: { services: { role: { checkRolesIdForDeletion } } } } as any;
      return { checkRolesIdForDeletion };
    };

    test('validateRoleDeleteInput accepts a role that passes the deletion checks', async () => {
      const { checkRolesIdForDeletion } = setup();

      await expect(validateRoleDeleteInput(3)).resolves.toBe(3);
      expect(checkRolesIdForDeletion).toHaveBeenCalledWith([3]);
    });

    test('validateRoleDeleteInput reports a failed deletion check on the id', async () => {
      setup('You cannot delete the super admin role');

      await expect(validateRoleDeleteInput(1)).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'You cannot delete the super admin role',
      });
    });

    test('validateRolesDeleteInput accepts roles that pass the deletion checks', async () => {
      const { checkRolesIdForDeletion } = setup();

      await expect(validateRolesDeleteInput({ ids: [3, 4] })).resolves.toEqual({ ids: [3, 4] });
      expect(checkRolesIdForDeletion).toHaveBeenCalledWith([3, 4]);
    });

    test('validateRolesDeleteInput reports a failed deletion check on the ids', async () => {
      setup('Some roles are still in use');

      await expect(validateRolesDeleteInput({ ids: [3] })).rejects.toMatchObject({
        name: 'ValidationError',
        details: { errors: [expect.objectContaining({ path: ['ids'] })] },
      });
    });
  });
});
