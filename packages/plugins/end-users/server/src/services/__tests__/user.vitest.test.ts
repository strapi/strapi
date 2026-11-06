import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { USER_UID } from '../../constants';
import userService from '../user';

vi.mock('@strapi/strapi', () => ({
  factories: {
    createCoreService:
      (_uid: string, config: (params: { strapi: unknown }) => unknown) =>
      ({ strapi }: { strapi: unknown }) =>
        config({ strapi }),
  },
}));

const setup = ({ user = { documentId: 'user-1', email: 'a@x.io' } as unknown } = {}) => {
  const findOne = vi.fn(async () => user);
  const documents = vi.fn(() => ({ findOne }));
  const service = userService({ strapi: { documents } as unknown as Core.Strapi }) as unknown as {
    findMe(id: unknown, query?: Record<string, unknown>): Promise<unknown>;
  };

  return { service, findOne, documents };
};

describe('user service', () => {
  describe('findMe', () => {
    it('finds the user by the documentId it was given', async () => {
      const { service, findOne, documents } = setup();

      const found = await service.findMe('user-1');

      expect(documents).toHaveBeenCalledWith(USER_UID);
      expect(findOne).toHaveBeenCalledWith({ documentId: 'user-1' });
      expect(found).toEqual({ documentId: 'user-1', email: 'a@x.io' });
    });

    it('applies fields and populate, and nothing else of the query', async () => {
      const { service, findOne } = setup();

      await service.findMe('user-1', {
        fields: ['email'],
        populate: ['roles'],
        filters: { documentId: 'someone-else' },
      });

      expect(findOne).toHaveBeenCalledWith({
        documentId: 'user-1',
        fields: ['email'],
        populate: ['roles'],
      });
    });

    it('answers null when the user is gone', async () => {
      const { service } = setup({ user: null });

      expect(await service.findMe('user-1')).toBeNull();
    });

    it.each([
      ['undefined', undefined],
      ['an empty string', ''],
      ['null', null],
      ['a number', 1],
    ])('refuses %s as the user, before looking anything up', async (_name, id) => {
      const { service, findOne } = setup();

      await expect(service.findMe(id)).rejects.toMatchObject({ name: 'UnauthorizedError' });
      expect(findOne).not.toHaveBeenCalled();
    });
  });
});
