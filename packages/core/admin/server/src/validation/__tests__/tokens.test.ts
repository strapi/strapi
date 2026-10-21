/* eslint-env jest */

/**
 * API, admin and transfer token `name` and `description` are stored in varchar(255) columns.
 * Without a max length the database rejected longer values and the admin got a 500 instead of a
 * validation error.
 */
import { validateApiTokenCreationInput, validateApiTokenUpdateInput } from '../api-tokens';
import { validateAdminTokenCreationInput, validateAdminTokenUpdateInput } from '../admin-tokens';
import {
  validateTransferTokenCreationInput,
  validateTransferTokenUpdateInput,
} from '../transfer/token';

const tooLong = 'a'.repeat(256);
const atLimit = 'a'.repeat(255);

const creations = [
  ['API token', validateApiTokenCreationInput, { type: 'read-only' }],
  ['admin token', validateAdminTokenCreationInput, {}],
  ['transfer token', validateTransferTokenCreationInput, { permissions: ['push'] }],
] as const;

const updates = [
  ['API token', validateApiTokenUpdateInput],
  ['admin token', validateAdminTokenUpdateInput],
  ['transfer token', validateTransferTokenUpdateInput],
] as const;

describe('Token name and description length', () => {
  describe.each(creations)('%s creation', (_, validate, base) => {
    test('rejects a description longer than 255 characters', async () => {
      await expect(
        validate({ ...base, name: 'token', description: tooLong })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        details: { errors: [expect.objectContaining({ path: ['description'] })] },
      });
    });

    test('rejects a name longer than 255 characters', async () => {
      await expect(validate({ ...base, name: tooLong })).rejects.toMatchObject({
        name: 'ValidationError',
        details: { errors: [expect.objectContaining({ path: ['name'] })] },
      });
    });

    test('accepts a name and description of 255 characters', async () => {
      await expect(
        validate({ ...base, name: atLimit, description: atLimit })
      ).resolves.toBeDefined();
    });
  });

  describe.each(updates)('%s update', (_, validate) => {
    test('rejects a description longer than 255 characters', async () => {
      await expect(validate({ description: tooLong })).rejects.toMatchObject({
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

    test('accepts a description of 255 characters and a null description', async () => {
      await expect(validate({ description: atLimit })).resolves.toBeDefined();
      await expect(validate({ description: null })).resolves.toBeDefined();
    });
  });
});
