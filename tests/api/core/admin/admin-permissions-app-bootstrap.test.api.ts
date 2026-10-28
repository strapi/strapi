'use strict';

import { createStrapiInstance } from 'api-tests/strapi';

type StrapiInstance = Awaited<ReturnType<typeof createStrapiInstance>>;

const registerPhaseAction = {
  uid: 'app-register-phase.read',
  displayName: 'Read (registered in app register)',
  section: 'settings',
  category: 'app bootstrap test',
};

const bootstrapPhaseAction = {
  uid: 'app-bootstrap-phase.read',
  displayName: 'Read (registered in app bootstrap)',
  section: 'settings',
  category: 'app bootstrap test',
};

const registerPhaseActionId = `api::${registerPhaseAction.uid}`;
const bootstrapPhaseActionId = `api::${bootstrapPhaseAction.uid}`;

const getActionProvider = (strapi: StrapiInstance) =>
  strapi.service('admin::permission').actionProvider;

/**
 * Starts Strapi with one action registered in the app `register` and one registered in the app
 * `bootstrap`, the phase the contributor docs recommend.
 */
const startStrapi = () =>
  createStrapiInstance({
    async register({ strapi }: { strapi: StrapiInstance }) {
      // Runs the app lifecycles exactly where Strapi runs `src/index` register and bootstrap
      const runUserLifecycles = strapi.runUserLifecycles.bind(strapi);

      strapi.runUserLifecycles = async (lifecycleName: 'register' | 'bootstrap' | 'destroy') => {
        await runUserLifecycles(lifecycleName);

        if (lifecycleName === 'register') {
          await getActionProvider(strapi).register(registerPhaseAction);
        }

        if (lifecycleName === 'bootstrap') {
          await getActionProvider(strapi).register(bootstrapPhaseAction);
        }
      };
    },
  });

const findPermissionActions = async (strapi: StrapiInstance, roleId: string | number) => {
  const permissions = await strapi.db
    .query('admin::permission')
    .findMany({ where: { role: { id: roleId } } });

  return permissions.map((permission: { action: string }) => permission.action);
};

describe('Admin permissions of actions registered in the app lifecycles', () => {
  let strapi: StrapiInstance;
  let roleId: string | number;

  beforeAll(async () => {
    strapi = await startStrapi();

    const role = await strapi.service('admin::role').create({
      name: 'App bootstrap actions role',
      description: 'Holds permissions of actions registered in the app lifecycles',
    });
    roleId = role.id;

    await strapi.service('admin::role').assignPermissions(roleId, [
      { action: registerPhaseActionId, subject: null, properties: {}, conditions: [] },
      { action: bootstrapPhaseActionId, subject: null, properties: {}, conditions: [] },
    ]);
  });

  afterAll(async () => {
    await strapi.service('admin::role').deleteByIds([roleId]);
    await strapi.destroy();
  });

  test('Role keeps its permissions after a restart', async () => {
    expect(await findPermissionActions(strapi, roleId)).toEqual(
      expect.arrayContaining([registerPhaseActionId, bootstrapPhaseActionId])
    );

    await strapi.destroy();
    strapi = await startStrapi();

    expect(await findPermissionActions(strapi, roleId)).toEqual(
      expect.arrayContaining([registerPhaseActionId, bootstrapPhaseActionId])
    );
  });

  test('Super admin role gets the permissions of every registered action', async () => {
    const superAdminRole = await strapi.service('admin::role').getSuperAdmin();

    expect(await findPermissionActions(strapi, superAdminRole.id)).toEqual(
      expect.arrayContaining([registerPhaseActionId, bootstrapPhaseActionId])
    );
  });
});
