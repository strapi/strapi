import { describe, expect, it, vi } from 'vitest';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { USER_SECURITY_ACTIONS } from '../../admin-actions';
import { USER_UID } from '../../constants';
import userWriteGuardController, { registerUserWriteGuard } from '../admin/user-write-guard';

const STORED = {
  email: 'ada@example.com',
  emailVerified: true,
  twoFactorEnabled: true,
  banned: false,
  banExpires: new Date('2027-01-01T00:00:00.000Z'),
  lockedUntil: null,
};

const setup = ({ mayManage = false, stored = STORED as Record<string, unknown> | null } = {}) => {
  const findOne = vi.fn(async () => stored);
  const strapi = {
    contentType: (uid: string) =>
      uid === USER_UID
        ? {
            uid,
            attributes: {
              email: { type: 'email' },
              emailVerified: { type: 'boolean', default: false },
              banned: { type: 'boolean', default: false },
              twoFactorEnabled: { type: 'boolean', default: false },
              name: { type: 'string' },
            },
          }
        : undefined,
    db: { query: vi.fn(() => ({ findOne })) },
  } as unknown as Core.Strapi;
  const next = vi.fn(async () => 'ran');
  const can = vi.fn((action: string) => mayManage && action === USER_SECURITY_ACTIONS.manage);
  const run = (
    action: 'create' | 'update' | 'publish' | 'clone',
    body: unknown,
    params: Record<string, string> = { model: USER_UID, id: 'doc-a' }
  ) => {
    const ctx = {
      params,
      request: { body },
      state: { userAbility: { can } },
    } as unknown as Koa.Context;

    return userWriteGuardController({ strapi })[action](ctx, next as unknown as Koa.Next);
  };

  return { run, next, can, findOne, strapi };
};

describe('the Content Manager write guard for end users', () => {
  it.each([
    ['twoFactorEnabled', false],
    ['banned', true],
    ['emailVerified', false],
    ['email', 'other@example.com'],
    ['lockedUntil', '2027-02-01T00:00:00.000Z'],
    ['banExpires', null],
    ['failedSignIns', 5],
    ['banReason', 'spam'],
  ])(
    'refuses an update that sets %s without the Security panel permission',
    async (field, value) => {
      const { run, next } = setup();

      await expect(run('update', { [field]: value })).rejects.toMatchObject({
        name: 'PolicyError',
      });
      expect(next).not.toHaveBeenCalled();
    }
  );

  it('names the fields it refused', async () => {
    const { run } = setup();

    await expect(run('update', { banned: true, twoFactorEnabled: false })).rejects.toMatchObject({
      message: expect.stringContaining('twoFactorEnabled, banned'),
    });
  });

  it('lets an administrator with the Security panel permission write them', async () => {
    const { run, next, can } = setup({ mayManage: true });

    await run('update', { twoFactorEnabled: false, banned: true, email: 'other@example.com' });

    expect(can).toHaveBeenCalledWith(USER_SECURITY_ACTIONS.manage);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('lets a write that does not carry them through', async () => {
    const { run, next, findOne } = setup();

    await run('update', { name: 'Ada' });

    expect(next).toHaveBeenCalledTimes(1);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('lets through the values the editor sends back as they are stored', async () => {
    const { run, next } = setup();

    await run('update', {
      email: 'Ada@Example.com',
      emailVerified: true,
      twoFactorEnabled: true,
      banned: false,
      banExpires: '2027-01-01T00:00:00.000Z',
      lockedUntil: null,
      name: 'Ada',
    });

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('refuses the data of a publish and of a clone as it refuses an update', async () => {
    const { run } = setup();

    await expect(run('publish', { banned: false, emailVerified: false })).rejects.toMatchObject({
      name: 'PolicyError',
    });
    await expect(
      run('clone', { emailVerified: true }, { model: USER_UID, sourceId: 'doc-a' })
    ).rejects.toMatchObject({ name: 'PolicyError' });
  });

  describe('a create', () => {
    it('refuses a field set to something else than its default', async () => {
      const { run, next } = setup();

      await expect(
        run('create', { email: 'new@example.com', emailVerified: true }, { model: USER_UID })
      ).rejects.toMatchObject({ name: 'PolicyError' });
      expect(next).not.toHaveBeenCalled();
    });

    it('lets the address, and a field left at its default, through', async () => {
      const { run, next } = setup();

      await run('create', { email: 'new@example.com', banned: false }, { model: USER_UID });

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  it('registers itself as the Content Manager layout action of each write', () => {
    const set = vi.fn();

    registerUserWriteGuard({ config: { set } } as unknown as Core.Strapi);

    expect(set.mock.calls).toEqual([
      ['plugin::end-users.layout.user.actions.create', 'user-write-guard.create'],
      ['plugin::end-users.layout.user.actions.update', 'user-write-guard.update'],
      ['plugin::end-users.layout.user.actions.publish', 'user-write-guard.publish'],
      ['plugin::end-users.layout.user.actions.clone', 'user-write-guard.clone'],
    ]);
  });
});
