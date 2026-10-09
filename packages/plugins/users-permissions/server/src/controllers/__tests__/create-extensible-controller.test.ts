import { describe, expect, test, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { createStrapiMock } from '../../../tests/utils';
import { createMockContext } from './utils';
import { createExtensibleController } from '../create-extensible-controller';
import controllers from '..';

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
