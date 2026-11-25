import { describe, test, expect } from 'vitest';
import { errors } from '@strapi/utils';

import { verify } from '../data-transfer';

describe('Data transfer strategy', () => {
  describe('verify', () => {
    const credentials = { id: 1, name: 'transfer-token', expiresAt: null };
    const ability = { can: (scope: unknown) => scope === 'push' };

    test('allows a scope the token has', async () => {
      await expect(verify({ credentials, ability }, { scope: ['push'] })).resolves.toBeUndefined();
    });

    test('rejects a scope the token does not have', async () => {
      await expect(verify({ credentials, ability }, { scope: ['pull'] })).rejects.toBeInstanceOf(
        errors.ForbiddenError
      );
    });

    test('rejects a sparse scope that hides an action', async () => {
      // eslint-disable-next-line no-sparse-arrays
      const scope = [, 'push'];

      await expect(verify({ credentials, ability }, { scope })).rejects.toBeInstanceOf(
        errors.ForbiddenError
      );
    });
  });
});
