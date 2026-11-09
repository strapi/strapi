import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { revokeLegacySessions } from '../legacy-sessions';
import { LEGACY_ORIGIN } from '../origin';

const setup = ({ defined = true, user = { id: 7 } as { id?: number } | null } = {}) => {
  const invalidateRefreshToken = vi.fn(async () => undefined);
  const manager = vi.fn(() => ({ invalidateRefreshToken }));
  const findOne = vi.fn(async () => user);
  const strapi = {
    sessionManager: Object.assign(manager, { hasOrigin: () => defined }),
    db: { query: () => ({ findOne }) },
  } as unknown as Core.Strapi;

  return { strapi, manager, invalidateRefreshToken, findOne };
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
