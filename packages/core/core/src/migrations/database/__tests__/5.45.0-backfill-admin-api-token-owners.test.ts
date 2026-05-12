import {
  backfillAdminApiTokenOwners,
  backfillAdminApiTokenOwnersMigration,
} from '../5.45.0-backfill-admin-api-token-owners';

const buildKnexMock = (options: { ownerId: number | null; updateMock: jest.Mock }) => {
  const { ownerId, updateMock } = options;

  const knex = jest.fn((table: string) => {
    if (table === 'strapi_users_roles') {
      return {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(ownerId === null ? undefined : { owner_id: ownerId }),
      };
    }
    if (table === 'strapi_api_tokens') {
      return {
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        update: updateMock,
      };
    }
    throw new Error(`unexpected table ${table}`);
  }) as any;

  knex.schema = {
    hasTable: jest.fn().mockResolvedValue(true),
    hasColumn: jest.fn().mockResolvedValue(true),
  };

  return knex;
};

const buildMetadataMock = () => {
  const apiTokenMeta = {
    tableName: 'strapi_api_tokens',
    attributes: {
      adminUserOwner: {
        type: 'relation',
        relation: 'manyToOne',
        joinColumn: { name: 'admin_user_owner_id' },
      },
      kind: { type: 'enumeration', columnName: 'kind' },
    },
  };

  const userMeta = {
    attributes: {
      roles: {
        type: 'relation',
        relation: 'manyToMany',
        joinTable: {
          name: 'strapi_users_roles',
          joinColumn: { name: 'user_id' },
          inverseJoinColumn: { name: 'role_id' },
        },
      },
    },
  };

  const roleMeta = {
    tableName: 'admin_roles',
    attributes: {
      code: { type: 'string', columnName: 'code' },
    },
  };

  return {
    has: jest.fn((uid: string) => ['admin::api-token', 'admin::user', 'admin::role'].includes(uid)),
    get: jest.fn((uid: string) => {
      if (uid === 'admin::api-token') {
        return apiTokenMeta;
      }
      if (uid === 'admin::user') {
        return userMeta;
      }
      if (uid === 'admin::role') {
        return roleMeta;
      }
      return undefined;
    }),
  };
};

describe('5.45.0-backfill-admin-api-token-owners', () => {
  describe('backfillAdminApiTokenOwners', () => {
    test('sets admin_user_owner_id from the first super-admin user link', async () => {
      const updateMock = jest.fn().mockResolvedValue(1);
      const knex = buildKnexMock({ ownerId: 7, updateMock });
      const db = { metadata: buildMetadataMock() } as any;

      await backfillAdminApiTokenOwners(knex, db);

      expect(updateMock).toHaveBeenCalledWith({ admin_user_owner_id: 7 });
    });

    test('does not update when no super-admin user exists in the link table', async () => {
      const updateMock = jest.fn().mockResolvedValue(0);
      const knex = buildKnexMock({ ownerId: null, updateMock });
      const db = { metadata: buildMetadataMock() } as any;

      await backfillAdminApiTokenOwners(knex, db);

      expect(updateMock).not.toHaveBeenCalled();
    });

    test('no-ops when admin API token model is absent from metadata', async () => {
      const updateMock = jest.fn();
      const knex = buildKnexMock({ ownerId: 7, updateMock });
      const db = {
        metadata: {
          has: jest.fn(() => false),
          get: jest.fn(),
        },
      } as any;

      await backfillAdminApiTokenOwners(knex, db);

      expect(knex).not.toHaveBeenCalled();
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe('backfillAdminApiTokenOwnersMigration', () => {
    test('up delegates to backfillAdminApiTokenOwners', async () => {
      const updateMock = jest.fn().mockResolvedValue(1);
      const knex = buildKnexMock({ ownerId: 2, updateMock });
      const db = { metadata: buildMetadataMock() } as any;

      await backfillAdminApiTokenOwnersMigration.up(knex, db);

      expect(updateMock).toHaveBeenCalledWith({ admin_user_owner_id: 2 });
    });
  });
});
