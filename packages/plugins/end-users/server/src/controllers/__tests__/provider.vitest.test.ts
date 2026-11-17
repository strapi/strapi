import { describe, expect, it, vi } from 'vitest';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { PROVIDER_ACTIONS } from '../../admin-actions';
import providerController from '../admin/provider';

const setup = ({ needsCustom = false, mayCustom = false } = {}) => {
  const update = vi.fn(async () => ({ id: 'github' }));
  const needsCustomAccess = vi.fn(async () => needsCustom);
  const can = vi.fn((action: string) => mayCustom && action === PROVIDER_ACTIONS.custom);
  const strapi = {
    plugin: () => ({ service: () => ({ update, needsCustomAccess }) }),
  } as unknown as Core.Strapi;
  const ctx = {
    params: { id: 'github' },
    request: { body: { trustForLinking: true } },
    state: { userAbility: { can } },
  } as unknown as Koa.Context & { body?: unknown };

  return { controller: providerController({ strapi }), ctx, update, needsCustomAccess, can };
};

describe('the provider controller, update', () => {
  it('saves a plain update for an admin without the custom providers action', async () => {
    const { controller, ctx, update } = setup({ needsCustom: false });

    await controller.update(ctx);

    expect(update).toHaveBeenCalledWith('github', { trustForLinking: true });
    expect(ctx.body).toEqual({ data: { id: 'github' } });
  });

  it('refuses, and saves nothing, a custom provider edit or a trust change without it', async () => {
    const { controller, ctx, update, needsCustomAccess } = setup({ needsCustom: true });

    await expect(controller.update(ctx)).rejects.toMatchObject({ name: 'ForbiddenError' });

    expect(needsCustomAccess).toHaveBeenCalledWith('github', { trustForLinking: true });
    expect(update).not.toHaveBeenCalled();
  });

  it('saves them for an admin who holds it', async () => {
    const { controller, ctx, update, can } = setup({ needsCustom: true, mayCustom: true });

    await controller.update(ctx);

    expect(can).toHaveBeenCalledWith(PROVIDER_ACTIONS.custom);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
