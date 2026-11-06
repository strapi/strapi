import { describe, expect, it, vi } from 'vitest';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

import permissionLayoutController from '../admin/permission-layout';

const LAYOUT = { contentTypes: [], groups: [] };
const ROUTES = [
  { actionId: 'api::article.article.find', method: 'GET', path: '/api/articles', rules: [] },
];

const setup = () => {
  const getLayout = vi.fn(async () => LAYOUT);
  const getRoutesFor = vi.fn(async () => ROUTES);
  const service = vi.fn(() => ({ getLayout, getRoutesFor }));
  const plugin = vi.fn(() => ({ service }));
  const strapi = { plugin } as unknown as Core.Strapi;

  const ctxWith = (query: Record<string, unknown> = {}) =>
    ({ query, body: undefined }) as unknown as Koa.Context;

  return {
    controller: permissionLayoutController({ strapi }),
    getLayout,
    getRoutesFor,
    service,
    plugin,
    ctxWith,
  };
};

describe('permission-layout controller', () => {
  it('answers the layout from the permission-layout service', async () => {
    const { controller, getLayout, plugin, service, ctxWith } = setup();
    const ctx = ctxWith();

    await controller.layout(ctx);

    expect(plugin).toHaveBeenCalledWith('end-users');
    expect(service).toHaveBeenCalledWith('permission-layout');
    expect(getLayout).toHaveBeenCalledTimes(1);
    expect(ctx.body).toEqual({ data: LAYOUT });
  });

  it('answers the routes bound to the subject', async () => {
    const { controller, getRoutesFor, ctxWith } = setup();
    const ctx = ctxWith({ subject: 'api::article.article' });

    await controller.routes(ctx);

    expect(getRoutesFor).toHaveBeenCalledWith('api::article.article');
    expect(ctx.body).toEqual({ data: ROUTES });
  });

  it.each([
    ['no subject', {}],
    ['two subjects', { subject: ['a', 'b'] }],
    ['a subject that is an object', { subject: { a: 'b' } }],
  ])('refuses %s with a 400, and asks nobody', async (_, query) => {
    const { controller, getRoutesFor, ctxWith } = setup();

    await expect(controller.routes(ctxWith(query))).rejects.toMatchObject({
      name: 'ValidationError',
      message: expect.stringContaining('subject is one string'),
    });
    expect(getRoutesFor).not.toHaveBeenCalled();
  });
});
