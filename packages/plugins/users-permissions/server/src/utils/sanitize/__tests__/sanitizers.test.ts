import { describe, expect, it, vi } from 'vitest';
import { createStrapiMock } from '../../../../tests/utils';

import { sanitizeUserRelationFromRoleEntities, defaultSanitizeOutput } from '../sanitizers';

describe('users-permissions sanitizers', () => {
  const schema = {
    modelType: 'contentType' as const,
    uid: 'plugin::users-permissions.role',
    attributes: {
      name: { type: 'string' as const },
      users: {
        type: 'relation' as const,
        relation: 'oneToMany',
        target: 'plugin::users-permissions.user',
      },
    },
  };
  const strapi = createStrapiMock({ getModel: vi.fn() });

  it.each([sanitizeUserRelationFromRoleEntities, defaultSanitizeOutput])(
    'supports direct and curried calls while removing role users',
    async (sanitize) => {
      const users = [{ id: 2 }];
      const entity = Object.freeze({ id: 1, name: 'Public', users });
      const expected = { id: 1, name: 'Public' };

      await expect(sanitize(strapi, schema, entity)).resolves.toEqual(expected);
      await expect(sanitize(strapi, schema)(entity)).resolves.toEqual(expected);
      expect(entity.users).toBe(users);
    }
  );
});
