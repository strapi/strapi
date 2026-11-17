import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { PROFILE_UID } from '../../constants';
import profileService from '../profile';

// The core factory, as far as this service goes: what it builds is the object the callback returns
vi.mock('@strapi/strapi', () => ({
  factories: {
    createCoreService:
      (_uid: string, config: (params: { strapi: unknown }) => unknown) =>
      ({ strapi }: { strapi: unknown }) =>
        config({ strapi }),
  },
}));

const setup = ({ profile = { documentId: 'profile-1' } as unknown } = {}) => {
  const findFirst = vi.fn(async () => profile);
  const update = vi.fn(async (params: Record<string, unknown>) => ({
    documentId: 'profile-1',
    ...(params.data as object),
  }));
  const documents = vi.fn(() => ({ findFirst, update }));
  const service = profileService({
    strapi: { documents } as unknown as Core.Strapi,
  }) as unknown as {
    findForUser(id: unknown, query?: Record<string, unknown>): Promise<unknown>;
    updateForUser(id: unknown, params: Record<string, unknown>): Promise<unknown>;
  };

  return { service, findFirst, update, documents };
};

describe('profile service', () => {
  describe('findForUser', () => {
    it('finds the profile that belongs to the user', async () => {
      const { service, findFirst, documents } = setup();

      const found = await service.findForUser('user-1');

      expect(documents).toHaveBeenCalledWith(PROFILE_UID);
      expect(findFirst).toHaveBeenCalledWith({ filters: { user: { documentId: 'user-1' } } });
      expect(found).toEqual({ documentId: 'profile-1' });
    });

    it('answers null when the user has none', async () => {
      const { service } = setup({ profile: null });

      expect(await service.findForUser('user-1')).toBeNull();
    });

    it('applies fields and populate, and nothing else of the query', async () => {
      const { service, findFirst } = setup();

      await service.findForUser('user-1', {
        fields: ['company'],
        populate: ['avatar'],
        filters: { user: { documentId: 'someone-else' } },
        sort: 'company',
        pagination: { page: 3 },
      });

      expect(findFirst).toHaveBeenCalledWith({
        filters: { user: { documentId: 'user-1' } },
        fields: ['company'],
        populate: ['avatar'],
      });
    });

    it.each([
      ['undefined', undefined],
      ['an empty string', ''],
      ['null', null],
      ['a number', 5],
      ['an object', { $ne: 'x' }],
    ])(
      'refuses %s as the user: the filter would be dropped and match anyone`s profile',
      async (_name, id) => {
        const { service, findFirst } = setup();

        await expect(service.findForUser(id)).rejects.toMatchObject({ name: 'UnauthorizedError' });
        expect(findFirst).not.toHaveBeenCalled();
      }
    );
  });

  describe('updateForUser', () => {
    it('updates the profile found for the user, by its documentId', async () => {
      const { service, findFirst, update } = setup();

      const updated = await service.updateForUser('user-1', { data: { company: 'Acme' } });

      expect(findFirst).toHaveBeenCalledWith({
        filters: { user: { documentId: 'user-1' } },
        fields: ['documentId'],
      });
      expect(update).toHaveBeenCalledWith({ documentId: 'profile-1', data: { company: 'Acme' } });
      expect(updated).toEqual({ documentId: 'profile-1', company: 'Acme' });
    });

    it('passes fields and populate on', async () => {
      const { service, update } = setup();

      await service.updateForUser('user-1', {
        data: { company: 'Acme' },
        fields: ['company'],
        populate: ['avatar'],
      });

      expect(update).toHaveBeenCalledWith({
        documentId: 'profile-1',
        data: { company: 'Acme' },
        fields: ['company'],
        populate: ['avatar'],
      });
    });

    it('is a 404 when the user has no profile, and writes nothing', async () => {
      const { service, update } = setup({ profile: null });

      await expect(
        service.updateForUser('user-1', { data: { company: 'Acme' } })
      ).rejects.toMatchObject({
        name: 'NotFoundError',
      });
      expect(update).not.toHaveBeenCalled();
    });

    it('refuses to change whose profile it is, and writes nothing', async () => {
      const { service, update, findFirst } = setup();

      await expect(
        service.updateForUser('user-1', { data: { user: { connect: ['someone-else'] } } })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        details: { errors: [{ path: ['user'] }] },
      });
      expect(findFirst).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });

    it.each([
      ['no data', {}],
      ['data that is not an object', { data: 'company=Acme' }],
      ['a list', { data: [] }],
      ['null', { data: null }],
    ])('refuses %s', async (_name, params) => {
      const { service, update } = setup();

      await expect(service.updateForUser('user-1', params)).rejects.toMatchObject({
        name: 'ValidationError',
      });
      expect(update).not.toHaveBeenCalled();
    });

    it.each([
      ['undefined', undefined],
      ['an empty string', ''],
      ['null', null],
    ])('refuses %s as the user, before looking anything up', async (_name, id) => {
      const { service, findFirst, update } = setup();

      await expect(service.updateForUser(id, { data: { company: 'Acme' } })).rejects.toMatchObject({
        name: 'UnauthorizedError',
      });
      expect(findFirst).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });
  });
});
