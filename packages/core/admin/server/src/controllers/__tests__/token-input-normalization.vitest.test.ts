import { describe, test, expect, vi } from 'vitest';
import type { Context } from 'koa';
import { errors } from '@strapi/utils';

// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import apiTokenController from '../api-token';
import adminTokenController from '../admin-token';
import transferTokenController from '../transfer/token';

const owner = { id: 42, roles: [{ code: 'strapi-super-admin' }] };

type TokenController = {
  create: (ctx: Context) => Promise<unknown>;
  update: (ctx: Context) => Promise<unknown>;
};

type Case = {
  label: string;
  controller: TokenController;
  extraCreateBody: Record<string, unknown>;
  mountServices: (service: Record<string, unknown>) => void;
};

const cases: Case[] = [
  {
    label: 'content API token',
    controller: apiTokenController,
    extraCreateBody: { type: 'read-only' },
    mountServices(service) {
      global.strapi = { admin: { services: { 'api-token-content-api': service } } } as any;
    },
  },
  {
    label: 'admin token',
    controller: adminTokenController,
    extraCreateBody: { adminPermissions: [] },
    mountServices(service) {
      global.strapi = { admin: { services: { 'api-token-admin': service } } } as any;
    },
  },
  {
    label: 'transfer token',
    controller: transferTokenController,
    extraCreateBody: { permissions: ['push'] },
    mountServices(service) {
      global.strapi = { admin: { services: { transfer: { token: service } } } } as any;
    },
  },
];

describe.each(cases)(
  '$label controller input normalization',
  ({ controller, extraCreateBody, mountServices }) => {
    test('create trims name and description', async () => {
      const create = vi.fn().mockResolvedValue({});
      mountServices({ exists: vi.fn(() => false), create });
      const ctx = createContext(
        {
          body: {
            name: '  padded name  ',
            description: '\t padded description \n',
            ...extraCreateBody,
          },
        },
        { created: vi.fn(), badRequest: vi.fn(), state: { user: owner } }
      );

      await controller.create(ctx);

      expect(create.mock.calls[0][0]).toMatchObject({
        name: 'padded name',
        description: 'padded description',
      });
    });

    test('create stores a missing description as an empty string', async () => {
      const create = vi.fn().mockResolvedValue({});
      mountServices({ exists: vi.fn(() => false), create });
      const ctx = createContext(
        { body: { name: 'token', ...extraCreateBody } },
        { created: vi.fn(), badRequest: vi.fn(), state: { user: owner } }
      );

      await controller.create(ctx);

      expect(create.mock.calls[0][0]).toMatchObject({ description: '' });
    });

    test('create rejects a missing name instead of storing "undefined"', async () => {
      const create = vi.fn();
      mountServices({ exists: vi.fn(() => false), create });
      const ctx = createContext(
        { body: { ...extraCreateBody } },
        { created: vi.fn(), badRequest: vi.fn(), state: { user: owner } }
      );

      await expect(controller.create(ctx)).rejects.toBeInstanceOf(errors.ValidationError);
      expect(create).not.toHaveBeenCalled();
    });

    test('update trims name and description', async () => {
      const update = vi.fn().mockResolvedValue({});
      mountServices({
        getById: vi.fn(() => ({ id: 1, kind: 'admin', adminUserOwner: owner.id })),
        getByName: vi.fn(() => null),
        update,
      });
      const ctx = createContext(
        { body: { name: '  renamed  ', description: '  new description  ' }, params: { id: 1 } },
        { send: vi.fn(), notFound: vi.fn(), forbidden: vi.fn(), state: { user: owner } }
      );

      await controller.update(ctx);

      expect(update.mock.calls[0][1]).toMatchObject({
        name: 'renamed',
        description: 'new description',
      });
    });

    test('update stores a null description as an empty string', async () => {
      const update = vi.fn().mockResolvedValue({});
      mountServices({
        getById: vi.fn(() => ({ id: 1, kind: 'admin', adminUserOwner: owner.id })),
        getByName: vi.fn(() => null),
        update,
      });
      const ctx = createContext(
        { body: { description: null }, params: { id: 1 } },
        { send: vi.fn(), notFound: vi.fn(), forbidden: vi.fn(), state: { user: owner } }
      );

      await controller.update(ctx);

      expect(update.mock.calls[0][1]).toMatchObject({ description: '' });
    });

    test('update rejects a null name instead of storing "null"', async () => {
      const update = vi.fn();
      mountServices({
        getById: vi.fn(() => ({ id: 1, kind: 'admin', adminUserOwner: owner.id })),
        getByName: vi.fn(() => null),
        update,
      });
      const ctx = createContext(
        { body: { name: null }, params: { id: 1 } },
        { send: vi.fn(), notFound: vi.fn(), forbidden: vi.fn(), state: { user: owner } }
      );

      await expect(controller.update(ctx)).rejects.toBeInstanceOf(errors.ValidationError);
      expect(update).not.toHaveBeenCalled();
    });
  }
);
