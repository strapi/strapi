import { afterEach, describe, expect, it, vi } from 'vitest';

import { PLUGIN_ID } from '../../constants';

/**
 * Core's controller factory gives the object the base actions as its prototype, which is what the
 * `super.<action>` calls of the controller reach.
 */
const base = {
  find: vi.fn(() => 'core find'),
  findOne: vi.fn(() => 'core findOne'),
  create: vi.fn(() => 'core create'),
  update: vi.fn(() => 'core update'),
  delete: vi.fn(() => 'core delete'),
};

vi.mock('@strapi/strapi', () => ({
  factories: {
    createCoreController(_uid: string, build: (deps: { strapi: unknown }) => object) {
      const strapi = (globalThis as { __strapi?: unknown }).__strapi;

      return Object.setPrototypeOf(build({ strapi }), base);
    },
  },
}));

const load = async (compat: boolean) => {
  const strapi = {
    config: {
      get: (key: string) =>
        key === `plugin::${PLUGIN_ID}.compat.usersPermissions` ? compat : undefined,
    },
  };

  (globalThis as { __strapi?: unknown }).__strapi = strapi;
  vi.resetModules();

  const { default: controller } = await import('../user');

  return controller as unknown as Record<string, (ctx: unknown) => unknown>;
};

afterEach(() => {
  delete (globalThis as { __strapi?: unknown }).__strapi;
});

describe('the user controller with the compatibility mode off', () => {
  it('answers every action with the core one', async () => {
    const controller = await load(false);

    expect(await controller.find({})).toBe('core find');
    expect(await controller.findOne({})).toBe('core findOne');
    expect(await controller.create({})).toBe('core create');
    expect(await controller.update({})).toBe('core update');
    expect(await controller.delete({})).toBe('core delete');
  });

  it('answers count with a 404', async () => {
    const controller = await load(false);

    await expect(async () => controller.count({})).rejects.toMatchObject({ name: 'NotFoundError' });
  });
});
