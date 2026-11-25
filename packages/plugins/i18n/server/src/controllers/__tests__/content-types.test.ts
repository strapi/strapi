import { errors } from '@strapi/utils';
import controller from '../content-types';
import ctServiceFactory from '../../services/content-types';

const ctService = ctServiceFactory();

const { ApplicationError } = errors;

const constants = { default: { READ_ACTION: 'read', CREATE_ACTION: 'create' } };

// `global.strapi = …` (unit-test-utils/jest-setup.js) resolves `strapi.service('admin::x')` from
// `strapi.admin.services.x`. Assign `strapi.service` afterwards to mock the services registry.
const mockAdminServices = (services: Record<string, unknown>) =>
  jest.fn((uid: string) =>
    uid.startsWith('admin::') ? services[uid.slice('admin::'.length)] : undefined
  ) as any;

describe('i18n - Controller - content-types', () => {
  describe('getNonLocalizedAttributes', () => {
    beforeEach(() => {
      const contentType = () => ({});
      const getModel = () => ({});

      const documentMetadataService = {
        getMetadata: () => ({
          availableLocales: [{ id: 2, locale: 'it', publishedAt: null }],
        }),
      };

      const permissionCheckerService = {
        create: () => ({
          cannot: { read: () => false },
        }),
      };

      const contentManagerPlugin = {
        services: {
          'document-metadata': documentMetadataService,
          'permission-checker': permissionCheckerService,
        } as Record<string, unknown>,
        service(name: string) {
          return this.services[name];
        },
      };

      global.strapi = {
        contentType,
        getModel,
        plugin(name: string) {
          if (name === 'content-manager') return contentManagerPlugin;
        },
        service(name: string) {
          if (name === 'admin::constants') {
            return { default: { READ_ACTION: 'read', CREATE_ACTION: 'create' } };
          }
        },
        plugins: {
          i18n: { services: { 'content-types': ctService } },
          'content-manager': contentManagerPlugin,
        },
        admin: {
          services: { constants: { default: { READ_ACTION: 'read', CREATE_ACTION: 'create' } } },
        },
        db: {},
      } as any;
    });

    test('model not localized', async () => {
      const badRequest = jest.fn();
      const ctx: any = {
        state: { user: {} },
        request: {
          body: {
            model: 'api::country.country',
            id: 1,
            locale: 'fr',
          },
        },
        badRequest,
      };

      expect.assertions(2);

      try {
        await controller.getNonLocalizedAttributes(ctx);
      } catch (e: any) {
        expect(e instanceof ApplicationError).toBe(true);
        expect(e.message).toEqual('Model api::country.country is not localized');
      }
    });

    test('entity not found', async () => {
      const notFound = jest.fn();
      const findOne = jest.fn(() => Promise.resolve(undefined));
      const contentType = jest.fn(() => ({ pluginOptions: { i18n: { localized: true } } }));

      global.strapi.db.query = () => ({ findOne }) as any;
      global.strapi.contentType = contentType as any;
      const ctx: any = {
        state: { user: {} },
        request: {
          body: {
            model: 'api::country.country',
            id: 1,
            locale: 'fr',
          },
        },
        notFound,
      };
      await controller.getNonLocalizedAttributes(ctx);

      expect(notFound).toHaveBeenCalledWith();
    });

    test('returns nonLocalizedFields', async () => {
      const model = {
        pluginOptions: { i18n: { localized: true } },
        attributes: {
          name: { type: 'string' },
          averagePrice: { type: 'integer' },
          description: { type: 'string', pluginOptions: { i18n: { localized: true } } },
        },
      };
      const entity = {
        id: 1,
        name: "Papailhau's Pizza",
        description: 'Best pizza restaurant of the town',
        locale: 'en',
        publishedAt: '2021-03-30T09:34:54.042Z',
        localizations: [{ id: 2, locale: 'it', publishedAt: null }],
      };
      const permissions = [
        { properties: { fields: ['name', 'averagePrice'], locales: ['it'] } },
        { properties: { fields: ['name', 'description'], locales: ['fr'] } },
        { properties: { fields: ['name'], locales: ['fr'] } },
      ];

      const findOne = jest.fn(() => Promise.resolve(entity));
      const findMany = jest.fn(() => Promise.resolve(permissions));
      const contentType = jest.fn(() => model);

      global.strapi.db.query = () => ({ findOne }) as any;
      global.strapi.contentType = contentType as any;
      global.strapi.service = mockAdminServices({ constants, permission: { findMany } });
      const ctx: any = {
        state: { user: { roles: [{ id: 1 }, { id: 2 }] } },
        request: {
          body: {
            model: 'api::country.country',
            id: 1,
            locale: 'fr',
          },
        },
      };
      await controller.getNonLocalizedAttributes(ctx);
      expect(findMany).toHaveBeenCalledWith({
        where: {
          action: ['read', 'create'],
          subject: 'api::country.country',
          role: {
            id: [1, 2],
          },
        },
      });
      expect(ctx.body).toEqual({
        nonLocalizedFields: { name: "Papailhau's Pizza" },
        localizations: [
          { id: 2, locale: 'it', publishedAt: null },
          { id: 1, locale: 'en', publishedAt: '2021-03-30T09:34:54.042Z' },
        ],
      });
    });

    test('reads permissions from the services registry, so admin service extensions apply', async () => {
      const model = {
        pluginOptions: { i18n: { localized: true } },
        attributes: {
          name: { type: 'string' },
          description: { type: 'string', pluginOptions: { i18n: { localized: true } } },
        },
      };
      const entity = { id: 1, name: 'Pizza', description: 'Pizza', locale: 'en' };
      // The services registry returns the extended service; `strapi.admin.services` keeps the
      // original one, because `extend()` writes only to the registry
      const originalFindMany = jest.fn(() =>
        Promise.resolve([{ properties: { fields: ['name'], locales: ['fr'] } }])
      );
      const extendedFindMany = jest.fn(() => Promise.resolve([]));

      global.strapi.db.query = () => ({ findOne: jest.fn(() => Promise.resolve(entity)) }) as any;
      global.strapi.contentType = jest.fn(() => model) as any;
      global.strapi.admin.services.permission = { findMany: originalFindMany };
      global.strapi.service = mockAdminServices({
        constants,
        permission: { findMany: extendedFindMany },
      });
      const ctx: any = {
        state: { user: { roles: [{ id: 1 }] } },
        request: { body: { model: 'api::country.country', id: 1, locale: 'fr' } },
      };

      await controller.getNonLocalizedAttributes(ctx);

      expect(extendedFindMany).toHaveBeenCalledTimes(1);
      expect(originalFindMany).not.toHaveBeenCalled();
      expect(ctx.body.nonLocalizedFields).toEqual({});
    });
  });
});
