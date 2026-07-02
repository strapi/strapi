import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

/**
 * Integration tests for admin token permission sync.
 *
 * These tests verify that when role permissions or user-role bindings change,
 * admin token permissions are correctly reconciled (clamped, never expanded).
 *
 * Sync triggers:
 *  - T1: role.assignPermissions → syncPermissionsForRole (fires when permissionsToAdd.length > 0 || permissionsToDelete.length > 0)
 *  - T2: admin::user afterUpdate lifecycle → syncPermissionsForUser (fires when roles field changes)
 *  - T3: admin::role beforeDelete/afterDelete lifecycles → syncPermissionsForUser for each affected user
 */
describe('Admin Token Role Sync (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;

  const CT_UID = 'api::sync-article.sync-article';
  const SYNC_ACTION = 'plugin::content-manager.explorer.read';
  const SYNC_ACTION_2 = 'plugin::content-manager.explorer.create';
  const SYNC_SUBJECT = CT_UID;

  const ADMIN_TOKEN_PERMS = [
    { action: 'admin::admin-tokens.create', subject: null, conditions: [], properties: {} },
    { action: 'admin::admin-tokens.read', subject: null, conditions: [], properties: {} },
    { action: 'admin::admin-tokens.update', subject: null, conditions: [], properties: {} },
    { action: 'admin::admin-tokens.delete', subject: null, conditions: [], properties: {} },
    { action: 'admin::admin-tokens.regenerate', subject: null, conditions: [], properties: {} },
  ];

  // Shared fixtures created in beforeAll
  let roleA: { id: number };
  let roleB: { id: number };
  let syncUserId: number;
  let syncUserBothId: number;
  let rqSync: Awaited<ReturnType<typeof createAuthRequest>>;
  let rqSyncBoth: Awaited<ReturnType<typeof createAuthRequest>>;

  // Per-test tokens (reset in beforeEach)
  let tokenA: { id: number };
  let tokenBoth: { id: number };

  const deleteAllAdminTokens = async () => {
    await strapi.db.query('admin::api-token').deleteMany({ where: { kind: 'admin' } });
  };

  /**
   * Read permission rows directly from DB for a given token, bypassing the API.
   * Returns only the fields relevant for assertions.
   */
  const getAdminPermissionsFromDB = async (
    tokenId: number
  ): Promise<Array<{ action: string; conditions: string[] }>> => {
    const perms = await strapi.db.query('admin::permission').findMany({
      where: { apiToken: { id: tokenId } },
    });
    return perms.map((p: { action: string; conditions: string[] }) => ({
      action: p.action,
      conditions: p.conditions ?? [],
    }));
  };

  beforeAll(async () => {
    await builder
      .addContentType({
        singularName: 'sync-article',
        pluralName: 'sync-articles',
        displayName: 'SyncArticle',
        draftAndPublish: false,
        attributes: { title: { type: 'string' } },
      })
      .build();

    strapi = await createStrapiInstance();
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');

    const utils = createUtils(strapi);

    // roleA: grants SYNC_ACTION + SYNC_ACTION_2 + admin-tokens CRUD
    roleA = await utils.createRole({
      name: 'sync-test-role-a',
      description: 'Role A for sync tests',
    });
    await utils.assignPermissionsToRole(roleA.id, [
      { action: SYNC_ACTION, subject: SYNC_SUBJECT, conditions: [], properties: {} },
      { action: SYNC_ACTION_2, subject: SYNC_SUBJECT, conditions: [], properties: {} },
      ...ADMIN_TOKEN_PERMS,
    ]);

    // roleB: grants SYNC_ACTION only (intentionally overlaps roleA)
    roleB = await utils.createRole({
      name: 'sync-test-role-b',
      description: 'Role B for sync tests',
    });
    await utils.assignPermissionsToRole(roleB.id, [
      { action: SYNC_ACTION, subject: SYNC_SUBJECT, conditions: [], properties: {} },
    ]);

    // syncUser: single-role user (roleA only)
    const syncUser = await utils.createUser({
      email: 'sync-user@test.com',
      firstname: 'Sync',
      lastname: 'User',
      isActive: true,
      roles: [roleA.id],
    });
    syncUserId = syncUser.id;
    rqSync = await createAuthRequest({ strapi, userInfo: { email: 'sync-user@test.com' } as any });

    // syncUserBoth: multi-role user (roleA + roleB)
    const syncUserBoth = await utils.createUser({
      email: 'sync-user-both@test.com',
      firstname: 'SyncBoth',
      lastname: 'User',
      isActive: true,
      roles: [roleA.id, roleB.id],
    });
    syncUserBothId = syncUserBoth.id;
    rqSyncBoth = await createAuthRequest({
      strapi,
      userInfo: { email: 'sync-user-both@test.com' } as any,
    });

    await deleteAllAdminTokens();
  });

  afterAll(async () => {
    await deleteAllAdminTokens();
    if (syncUserId !== undefined)
      await strapi.db.query('admin::user').delete({ where: { id: syncUserId } });
    if (syncUserBothId !== undefined)
      await strapi.db.query('admin::user').delete({ where: { id: syncUserBothId } });
    if (roleA !== undefined)
      await strapi.db.query('admin::role').delete({ where: { id: roleA.id } });
    if (roleB !== undefined)
      await strapi.db.query('admin::role').delete({ where: { id: roleB.id } });
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(async () => {
    await deleteAllAdminTokens();

    const utils = createUtils(strapi);

    // Restore roleA to its full set of permissions before each test
    await utils.assignPermissionsToRole(roleA.id, [
      { action: SYNC_ACTION, subject: SYNC_SUBJECT, conditions: [], properties: {} },
      { action: SYNC_ACTION_2, subject: SYNC_SUBJECT, conditions: [], properties: {} },
      ...ADMIN_TOKEN_PERMS,
    ]);

    // Restore roleB to its full set of permissions before each test
    await utils.assignPermissionsToRole(roleB.id, [
      { action: SYNC_ACTION, subject: SYNC_SUBJECT, conditions: [], properties: {} },
    ]);

    // Restore syncUser to roleA only
    await strapi.db.query('admin::user').update({
      where: { id: syncUserId },
      data: { roles: [roleA.id] },
    });

    // Restore syncUserBoth to roleA + roleB
    await strapi.db.query('admin::user').update({
      where: { id: syncUserBothId },
      data: { roles: [roleA.id, roleB.id] },
    });

    // Create baseline tokens with SYNC_ACTION
    const resA = await rqSync({
      url: '/admin/admin-tokens',
      method: 'POST',
      body: {
        name: 'sync-token-a',
        adminPermissions: [
          { action: SYNC_ACTION, subject: SYNC_SUBJECT, conditions: [], properties: {} },
        ],
      },
    });
    expect(resA.status).toBe(201);
    tokenA = resA.body.data;

    const resBoth = await rqSyncBoth({
      url: '/admin/admin-tokens',
      method: 'POST',
      body: {
        name: 'sync-token-both',
        adminPermissions: [
          { action: SYNC_ACTION, subject: SYNC_SUBJECT, conditions: [], properties: {} },
        ],
      },
    });
    expect(resBoth.status).toBe(201);
    tokenBoth = resBoth.body.data;
  });

  // ---------------------------------------------------------------------------
  // T1 — Role permissions edited (assignPermissions → syncForRole)
  // ---------------------------------------------------------------------------

  describe('T1 — Role permissions edited', () => {
    test('T1-1 Remove permission → token permission deleted', async () => {
      const utils = createUtils(strapi);

      // Strip SYNC_ACTION from roleA (keep only admin-tokens CRUD so the user can still operate)
      await utils.assignPermissionsToRole(roleA.id, [...ADMIN_TOKEN_PERMS]);

      const perms = await getAdminPermissionsFromDB(tokenA.id);
      const actions = perms.map((p) => p.action);
      expect(actions).not.toContain(SYNC_ACTION);
    });

    test('T1-2 Add permission → existing token unaffected (no expansion)', async () => {
      const utils = createUtils(strapi);

      // tokenA was created with SYNC_ACTION only; now add SYNC_ACTION_2 to roleA
      // Sync never expands — token should still have only SYNC_ACTION
      await utils.assignPermissionsToRole(roleA.id, [
        { action: SYNC_ACTION, subject: SYNC_SUBJECT, conditions: [], properties: {} },
        { action: SYNC_ACTION_2, subject: SYNC_SUBJECT, conditions: [], properties: {} },
        ...ADMIN_TOKEN_PERMS,
      ]);

      const perms = await getAdminPermissionsFromDB(tokenA.id);
      const actions = perms.map((p) => p.action);
      expect(actions).toContain(SYNC_ACTION);
      expect(actions).not.toContain(SYNC_ACTION_2);
    });

    test('T1-3 Multi-role: permission shared by two roles; remove from one → token keeps it', async () => {
      const utils = createUtils(strapi);

      // Remove SYNC_ACTION from roleA; roleB still grants it
      // syncUserBoth still has roleB → tokenBoth should keep SYNC_ACTION
      await utils.assignPermissionsToRole(roleA.id, [
        { action: SYNC_ACTION_2, subject: SYNC_SUBJECT, conditions: [], properties: {} },
        ...ADMIN_TOKEN_PERMS,
      ]);

      const perms = await getAdminPermissionsFromDB(tokenBoth.id);
      const actions = perms.map((p) => p.action);
      expect(actions).toContain(SYNC_ACTION);
    });

    test('T1-4 Conditions sync: role gains condition → token condition updated', async () => {
      const utils = createUtils(strapi);

      // Re-assign roleA with SYNC_ACTION + condition
      // This deletes + re-creates permissions, triggering sync for the previous token (empty conditions)
      await utils.assignPermissionsToRole(roleA.id, [
        {
          action: SYNC_ACTION,
          subject: SYNC_SUBJECT,
          conditions: ['admin::is-creator'],
          properties: {},
        },
        ...ADMIN_TOKEN_PERMS,
      ]);

      const permsWithCondition = await getAdminPermissionsFromDB(tokenA.id);
      const syncPerm = permsWithCondition.find((p) => p.action === SYNC_ACTION);
      expect(syncPerm).toBeDefined();
      expect(syncPerm?.conditions).toStrictEqual(['admin::is-creator']);

      // Revert: re-assign with empty conditions
      await utils.assignPermissionsToRole(roleA.id, [
        { action: SYNC_ACTION, subject: SYNC_SUBJECT, conditions: [], properties: {} },
        ...ADMIN_TOKEN_PERMS,
      ]);

      const permsReverted = await getAdminPermissionsFromDB(tokenA.id);
      const syncPermReverted = permsReverted.find((p) => p.action === SYNC_ACTION);
      expect(syncPermReverted).toBeDefined();
      expect(syncPermReverted?.conditions).toStrictEqual([]);
    });

    test('T1-5 Pure addition to second role triggers condition re-sync', async () => {
      const utils = createUtils(strapi);

      // roleX: SYNC_ACTION with condition + admin-token CRUD actions
      // roleY: initially empty
      const roleX = await utils.createRole({
        name: 't1-5-role-x',
        description: 'Role X for T1-5',
      });
      const roleY = await utils.createRole({
        name: 't1-5-role-y',
        description: 'Role Y for T1-5',
      });

      try {
        await utils.assignPermissionsToRole(roleX.id, [
          {
            action: SYNC_ACTION,
            subject: SYNC_SUBJECT,
            conditions: ['admin::is-creator'],
            properties: {},
          },
          ...ADMIN_TOKEN_PERMS,
        ]);

        const tempUser = await utils.createUser({
          email: 't1-5-user@test.com',
          firstname: 'T15',
          lastname: 'User',
          isActive: true,
          roles: [roleX.id, roleY.id],
        });

        try {
          const rqTemp = await createAuthRequest({
            strapi,
            userInfo: { email: 't1-5-user@test.com' } as any,
          });

          const resToken = await rqTemp({
            url: '/admin/admin-tokens',
            method: 'POST',
            body: {
              name: 't1-5-token',
              adminPermissions: [
                {
                  action: SYNC_ACTION,
                  subject: SYNC_SUBJECT,
                  conditions: ['admin::is-creator'],
                  properties: {},
                },
              ],
            },
          });
          expect(resToken.status).toBe(201);
          const tempToken: { id: number } = resToken.body.data;

          // Baseline: token should have condition admin::is-creator
          const baselinePerms = await getAdminPermissionsFromDB(tempToken.id);
          const baselinePerm = baselinePerms.find((p) => p.action === SYNC_ACTION);
          expect(baselinePerm).toBeDefined();
          expect(baselinePerm?.conditions).toStrictEqual(['admin::is-creator']);

          // Pure addition to roleY — no deletions in roleY
          await utils.assignPermissionsToRole(roleY.id, [
            { action: SYNC_ACTION, subject: SYNC_SUBJECT, conditions: [], properties: {} },
          ]);

          // user has SYNC_ACTION from roleX (conditioned) AND roleY (unconditional)
          // → anyUserPermIsUnconditional = true → enforcedConditions = [] → token updated
          const afterPerms = await getAdminPermissionsFromDB(tempToken.id);
          const afterPerm = afterPerms.find((p) => p.action === SYNC_ACTION);
          expect(afterPerm).toBeDefined();
          expect(afterPerm?.conditions).toStrictEqual([]);
        } finally {
          await strapi.db.query('admin::user').delete({ where: { id: tempUser.id } });
        }
      } finally {
        await strapi.db.query('admin::api-token').deleteMany({ where: { kind: 'admin' } });
        await strapi.db.query('admin::role').delete({ where: { id: roleX.id } });
        await strapi.db.query('admin::role').delete({ where: { id: roleY.id } });
      }
    });
  });

  // ---------------------------------------------------------------------------
  // T2 — User-role binding changed (admin::user afterUpdate lifecycle)
  // ---------------------------------------------------------------------------

  describe('T2 — User-role binding changed', () => {
    test('T2-1 Remove role from user → token permissions from that role deleted', async () => {
      // Strip all roles from syncUser
      await strapi.db.query('admin::user').update({
        where: { id: syncUserId },
        data: { roles: [] },
      });

      const perms = await getAdminPermissionsFromDB(tokenA.id);
      const actions = perms.map((p) => p.action);
      expect(actions).not.toContain(SYNC_ACTION);
    });

    test('T2-2 Add role to user → existing token unaffected (no expansion)', async () => {
      // Add roleB to syncUser (who currently only has roleA)
      // Token was created with SYNC_ACTION only; sync is not expansive
      await strapi.db.query('admin::user').update({
        where: { id: syncUserId },
        data: { roles: [roleA.id, roleB.id] },
      });

      const perms = await getAdminPermissionsFromDB(tokenA.id);
      const actions = perms.map((p) => p.action);
      expect(actions).toContain(SYNC_ACTION);
      expect(actions).not.toContain(SYNC_ACTION_2);
    });

    test('T2-3 Multi-role: remove one role that also grants SYNC_ACTION via the other', async () => {
      // syncUserBoth starts with roleA + roleB; remove roleA
      // roleB still grants SYNC_ACTION → tokenBoth should keep it
      await strapi.db.query('admin::user').update({
        where: { id: syncUserBothId },
        data: { roles: [roleB.id] },
      });

      const perms = await getAdminPermissionsFromDB(tokenBoth.id);
      const actions = perms.map((p) => p.action);
      expect(actions).toContain(SYNC_ACTION);
    });

    test('T2-4 Assign role with conditioned permission → token condition applied when only conditioned role grants it', async () => {
      const utils = createUtils(strapi);

      const roleC = await utils.createRole({
        name: 'sync-test-role-c',
        description: 'Role C with conditioned SYNC_ACTION',
      });

      try {
        await utils.assignPermissionsToRole(roleC.id, [
          {
            action: SYNC_ACTION,
            subject: SYNC_SUBJECT,
            conditions: ['admin::is-creator'],
            properties: {},
          },
        ]);

        // Add roleC to syncUser first so token keeps SYNC_ACTION when we remove it from roleA
        await strapi.db.query('admin::user').update({
          where: { id: syncUserId },
          data: { roles: [roleA.id, roleC.id] },
        });

        // Strip SYNC_ACTION from roleA → sync runs; only roleC grants it (with condition) → token condition updated
        await utils.assignPermissionsToRole(roleA.id, [...ADMIN_TOKEN_PERMS]);

        const perms = await getAdminPermissionsFromDB(tokenA.id);
        const syncPerm = perms.find((p) => p.action === SYNC_ACTION);
        expect(syncPerm).toBeDefined();
        expect(syncPerm?.conditions).toStrictEqual(['admin::is-creator']);
      } finally {
        await strapi.db.query('admin::role').delete({ where: { id: roleC.id } });
      }
    });
  });

  // ---------------------------------------------------------------------------
  // T3 — Role deleted (admin::role beforeDelete/afterDelete lifecycles)
  // ---------------------------------------------------------------------------

  describe('T3 — Role deleted', () => {
    test('T3-1 Delete role → only permissions sourced from that role are removed; others survive', async () => {
      const utils = createUtils(strapi);

      // Create two throw-away roles for a fresh tempUser
      const tempRoleKept = await utils.createRole({
        name: 'sync-temp-role-kept',
        description: 'Temp role that will be kept',
      });
      const tempRoleDeleted = await utils.createRole({
        name: 'sync-temp-role-deleted',
        description: 'Temp role that will be deleted',
      });

      try {
        // tempRoleKept: grants SYNC_ACTION + admin-tokens CRUD
        await utils.assignPermissionsToRole(tempRoleKept.id, [
          { action: SYNC_ACTION, subject: SYNC_SUBJECT, conditions: [], properties: {} },
          ...ADMIN_TOKEN_PERMS,
        ]);

        // tempRoleDeleted: grants SYNC_ACTION_2 only
        await utils.assignPermissionsToRole(tempRoleDeleted.id, [
          { action: SYNC_ACTION_2, subject: SYNC_SUBJECT, conditions: [], properties: {} },
        ]);

        const tempUser = await utils.createUser({
          email: 'sync-temp-user@test.com',
          firstname: 'Temp',
          lastname: 'SyncUser',
          isActive: true,
          roles: [tempRoleKept.id, tempRoleDeleted.id],
        });

        try {
          const tempRq = await createAuthRequest({
            strapi,
            userInfo: { email: 'sync-temp-user@test.com' } as any,
          });

          // Create a token with both SYNC_ACTION and SYNC_ACTION_2
          const createRes = await tempRq({
            url: '/admin/admin-tokens',
            method: 'POST',
            body: {
              name: 'sync-temp-token',
              adminPermissions: [
                { action: SYNC_ACTION, subject: SYNC_SUBJECT, conditions: [], properties: {} },
                { action: SYNC_ACTION_2, subject: SYNC_SUBJECT, conditions: [], properties: {} },
              ],
            },
          });
          expect(createRes.status).toBe(201);
          const tempToken = createRes.body.data;

          // The role service's deleteByIds requires 0 users (checkRolesIdForDeletion).
          // We bypass it by calling strapi.db.query directly so the beforeDelete/afterDelete
          // lifecycles fire while tempUser still holds tempRoleDeleted, exercising the sync path.
          // Role permissions are cleaned up manually first (mirrors what deleteByIds does internally).
          await strapi.db
            .query('admin::permission')
            .deleteMany({ where: { role: { id: tempRoleDeleted.id } } });
          await strapi.db.query('admin::role').delete({ where: { id: tempRoleDeleted.id } });

          const perms = await getAdminPermissionsFromDB(tempToken.id);
          const actions = perms.map((p) => p.action);

          // SYNC_ACTION still covered by tempRoleKept → must survive
          expect(actions).toContain(SYNC_ACTION);
          // SYNC_ACTION_2 was exclusively from tempRoleDeleted → must be gone
          expect(actions).not.toContain(SYNC_ACTION_2);
        } finally {
          await utils.deleteUserById(tempUser.id);
        }
      } finally {
        // Clean up roles that may still exist
        const kept = await strapi.db
          .query('admin::role')
          .findOne({ where: { id: tempRoleKept.id } });
        if (kept !== null && kept !== undefined) {
          await strapi.db.query('admin::role').delete({ where: { id: tempRoleKept.id } });
        }
      }
    });

    test("T3-2 Super-admin's tokens are never touched by sync", async () => {
      const utils = createUtils(strapi);

      const superAdminRole = await utils.getSuperAdminRole();

      // Create a super-admin user with a token that has no permissions
      const saUser = await utils.createUser({
        email: 'sync-sa-user@test.com',
        firstname: 'SA',
        lastname: 'SyncUser',
        isActive: true,
        roles: [superAdminRole.id],
      });

      try {
        const saRq = await createAuthRequest({
          strapi,
          userInfo: { email: 'sync-sa-user@test.com' } as any,
        });

        const createRes = await saRq({
          url: '/admin/admin-tokens',
          method: 'POST',
          body: {
            name: 'sync-sa-token',
            adminPermissions: [],
          },
        });
        expect(createRes.status).toBe(201);
        const saToken = createRes.body.data;

        // Trigger syncPermissionsForUser directly for the SA user.
        // The guard inside syncPermissionsForUser skips super-admins entirely.
        await (
          strapi.service('admin::api-token-admin') as {
            syncPermissionsForUser(id: number): Promise<void>;
          }
        ).syncPermissionsForUser(saUser.id);

        // SA token permissions must be unchanged (sync skips super-admins)
        const perms = await getAdminPermissionsFromDB(saToken.id);
        expect(perms).toStrictEqual([]);
      } finally {
        await utils.deleteUserById(saUser.id);
      }
    });
  });
});
