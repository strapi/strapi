import { describe, expect, test, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { createStrapiMock } from '../../../tests/utils';
import { createMockContext } from './utils';
import {
  createExtensibleController,
  instantiateStockActions,
} from '../create-extensible-controller';
import controllers from '..';
import register from '../../register';

const strapi = createStrapiMock({ name: 'strapi' });
const ctx = createMockContext({ body: undefined as unknown });
const next = vi.fn();

/** Build a controller the way core does: call factories with the Strapi instance. */
const instantiate = (
  controller: Core.Controller | ((context: { strapi: Core.Strapi }) => unknown)
) => (typeof controller === 'function' ? controller({ strapi }) : controller) as Core.Controller;

const createFixture = () =>
  createExtensibleController(({ strapi: injected }) => ({
    async find(context) {
      context.body = { action: 'find', strapi: injected };
    },
    async findOne(context) {
      context.body = { action: 'findOne' };
    },
  }));

describe('createExtensibleController', () => {
  test('keeps the factory contract', async () => {
    const controller = createFixture();

    await controller({ strapi }).find(ctx);

    expect(ctx.body).toEqual({ action: 'find', strapi });
  });

  test('serves an action replaced by an extension', async () => {
    const controller = createFixture();

    controller.find = async (context) => {
      context.body = { action: 'replaced' };
    };
    await instantiate(controller).find(ctx, next);

    expect(ctx.body).toEqual({ action: 'replaced' });
  });

  test('lets an extension wrap the stock action it read', async () => {
    const controller = createFixture();

    const stockFind = controller.find;
    controller.find = async (context) => {
      await stockFind(context);
      context.body = { wrapped: context.body };
    };
    await instantiate(controller).find(ctx, next);

    expect(ctx.body).toEqual({ wrapped: { action: 'find', strapi } });
  });

  test('serves an action added by an extension', async () => {
    const controller = createFixture();

    Object.assign(controller, {
      async updateMe(context: typeof ctx) {
        context.body = { action: 'updateMe' };
      },
    });
    const instance = instantiate(controller);
    await instance.updateMe(ctx, next);

    expect(ctx.body).toEqual({ action: 'updateMe' });
    expect(typeof instance.findOne).toBe('function');
  });

  test('supports wrapping the factory', async () => {
    const stockFactory = createFixture();

    const wrappedFactory = (context: { strapi: Core.Strapi }) => {
      const instance = stockFactory(context);
      return {
        ...instance,
        async find(koaContext: typeof ctx) {
          koaContext.body = { action: 'factory-wrapped' };
        },
      };
    };
    await instantiate(wrappedFactory).find(ctx, next);

    expect(ctx.body).toEqual({ action: 'factory-wrapped' });
  });

  test('lets an extension spread the factory into a plain controller', async () => {
    const controller = createFixture();

    const plainController = {
      ...controller,
      async findOne(context: typeof ctx) {
        context.body = { action: 'overridden' };
      },
    };
    instantiateStockActions(strapi);

    await plainController.find(ctx);
    expect(ctx.body).toEqual({ action: 'find', strapi });

    await plainController.findOne(ctx);
    expect(ctx.body).toEqual({ action: 'overridden' });
  });

  test('gives replaced and added actions precedence over the stock actions', async () => {
    const controller = createFixture();

    controller.find = async (context) => {
      context.body = { action: 'replaced' };
    };
    Object.assign(controller, {
      async updateMe(context: typeof ctx) {
        context.body = { action: 'updateMe' };
      },
    });
    const instance = instantiate(controller);

    expect(Object.keys(instance).sort()).toEqual(['find', 'findOne', 'updateMe']);
    await instance.find(ctx, next);
    expect(ctx.body).toEqual({ action: 'replaced' });
    await instance.findOne(ctx, next);
    expect(ctx.body).toEqual({ action: 'findOne' });
  });

  test('rejects a stock action called before Strapi instantiates the controller', () => {
    const controller = createFixture();

    expect(() => controller.find(ctx)).toThrow(
      'users-permissions controller actions run only after Strapi instantiates it'
    );
  });
});

describe('users-permissions controllers', () => {
  test.each(['user', 'role', 'permissions', 'settings', 'contentmanageruser'] as const)(
    'exposes the %s stock actions to extensions',
    (name) => {
      const instance = controllers[name]({ strapi });

      for (const actionName of Object.keys(instance)) {
        expect(typeof controllers[name][actionName as keyof typeof instance]).toBe('function');
      }
    }
  );
});

describe('users-permissions controllers spread by an extension', () => {
  const services = {
    user: { count: vi.fn().mockResolvedValue(3) },
    role: { find: vi.fn().mockResolvedValue([]) },
  };
  // Covers the plugin register and the stock actions called below, nothing else.
  const appStrapi = createStrapiMock({
    get: () => ({ register: vi.fn() }),
    sanitizers: { add: vi.fn() },
    getModel: () => ({}),
    contentAPI: {
      validate: { query: vi.fn() },
      sanitize: { query: async (query: unknown) => query },
    },
    store: () => ({ get: async () => ({ reset_password: {} }) }),
    plugin: (name: string) =>
      name === 'users-permissions'
        ? { service: (service: keyof typeof services) => services[service] }
        : undefined,
  });

  const overriddenAction = async (context: typeof ctx) => {
    context.body = { action: 'overridden' };
  };

  /**
   * Reproduce `src/extensions/users-permissions/strapi-server`: the extension replaces the factory
   * with a spread plain object, so core never instantiates the factory, then the plugin registers.
   */
  const spreadAndRegister = <TController extends object>(
    controller: TController,
    overrides: Core.Controller
  ) => {
    const plainController = { ...controller, ...overrides } as Core.Controller;
    register({ strapi: appStrapi });
    return plainController;
  };

  test('serves the stock user actions next to the overridden me', async () => {
    const user = spreadAndRegister(controllers.user, { me: overriddenAction });
    const context = createMockContext({ body: undefined as unknown, query: {}, state: {} });

    await user.count(context, next);
    expect(context.body).toBe(3);

    await user.me(context, next);
    expect(context.body).toEqual({ action: 'overridden' });
  });

  test('serves the stock role actions next to an overridden action', async () => {
    const role = spreadAndRegister(controllers.role, { createRole: overriddenAction });
    const send = vi.fn();

    await role.find(createMockContext({ send }), next);

    expect(send).toHaveBeenCalledWith({ roles: [] });
  });

  test('serves the stock settings actions next to an overridden action', async () => {
    const settings = spreadAndRegister(controllers.settings, {
      updateEmailTemplate: overriddenAction,
    });
    const send = vi.fn();

    await settings.getEmailTemplate(createMockContext({ send }), next);

    expect(send).toHaveBeenCalledWith({ reset_password: {} });
  });
});
