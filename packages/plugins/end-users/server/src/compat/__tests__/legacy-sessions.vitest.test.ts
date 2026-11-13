import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { revokeLegacySessions } from '../legacy-sessions';
import { USER_UID } from '../../constants';
import { LEGACY_ORIGIN } from '../origin';

const setup = ({ defined = true, user = { id: 7 } as { id?: number } | null } = {}) => {
  const invalidateRefreshToken = vi.fn(async () => undefined);
  const manager = vi.fn(() => ({ invalidateRefreshToken }));
  const findOne = vi.fn(async () => user);
  const updateMany = vi.fn(async () => ({ count: 1 }));
  const query = vi.fn(() => ({ findOne, updateMany }));
  const strapi = {
    sessionManager: Object.assign(manager, { hasOrigin: () => defined }),
    db: { query },
  } as unknown as Core.Strapi;

  return { strapi, manager, invalidateRefreshToken, findOne, updateMany, query };
};

describe('revokeLegacySessions', () => {
  it('invalidates the refresh sessions of the numeric id, under the old origin', async () => {
    const { strapi, manager, invalidateRefreshToken, findOne } = setup();

    await revokeLegacySessions(strapi, 'doc-a');

    expect(findOne).toHaveBeenCalledWith({ where: { documentId: 'doc-a' }, select: ['id'] });
    expect(manager).toHaveBeenCalledWith(LEGACY_ORIGIN);
    expect(invalidateRefreshToken).toHaveBeenCalledWith('7', undefined);
  });

  it('limits it to one device when one is named', async () => {
    const { strapi, invalidateRefreshToken } = setup();

    await revokeLegacySessions(strapi, 'doc-a', 'phone');

    expect(invalidateRefreshToken).toHaveBeenCalledWith('7', 'phone');
  });

  it('records the moment on the user when it revokes all of their sessions, and not for one device', async () => {
    const all = setup();
    const before = Date.now();

    await revokeLegacySessions(all.strapi, 'doc-a');

    expect(all.query).toHaveBeenCalledWith(USER_UID);
    expect(all.updateMany).toHaveBeenCalledTimes(1);

    const { where, data } = (all.updateMany.mock.calls[0] as unknown[])[0] as {
      where: unknown;
      data: { legacyTokensRevokedAt: Date };
    };

    expect(where).toEqual({ documentId: 'doc-a' });
    expect(data.legacyTokensRevokedAt).toBeInstanceOf(Date);
    expect(data.legacyTokensRevokedAt.getTime()).toBeGreaterThanOrEqual(before);

    const device = setup();

    await revokeLegacySessions(device.strapi, 'doc-a', 'phone');

    expect(device.updateMany).not.toHaveBeenCalled();
  });

  it('records the moment while the old origin is not defined: a token with no session needs none', async () => {
    const closed = setup({ defined: false });

    await revokeLegacySessions(closed.strapi, 'doc-a');

    expect(closed.updateMany).toHaveBeenCalledTimes(1);
  });

  it('does nothing while the old origin is not defined, or for a user that is gone', async () => {
    const closed = setup({ defined: false });
    const gone = setup({ user: null });

    await revokeLegacySessions(closed.strapi, 'doc-a');
    await revokeLegacySessions(gone.strapi, 'doc-a');

    expect(closed.findOne).not.toHaveBeenCalled();
    expect(closed.invalidateRefreshToken).not.toHaveBeenCalled();
    expect(gone.invalidateRefreshToken).not.toHaveBeenCalled();
  });
});
