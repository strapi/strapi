import type { Ability } from '@casl/ability';

import permissionCheckerService from '../permission-checker';
import type { PermissionCheckerService } from '../../types/services';

// The registered contract describes the action shortcuts attached at runtime.
const createService = (strapi: unknown) =>
  permissionCheckerService({ strapi } as any) as unknown as PermissionCheckerService;

const createPermissionsManagerMock = () => ({
  toSubject: (_entity: any, model: string) => model,
  sanitizeOutput: jest.fn((data: any) => data),
  sanitizeQuery: jest.fn((query: any) => query),
  sanitizeInput: jest.fn((data: any) => data),
  validateQuery: jest.fn((query: any) => query),
  validateInput: jest.fn((data: any) => data),
  addPermissionsQueryTo: jest.fn((query: any) => query),
});

const createStrapiMock = (permissionsManager = createPermissionsManagerMock()) => ({
  service: jest.fn(() => ({
    createPermissionsManager: jest.fn(() => permissionsManager),
    actionProvider: {
      unstable_aliases: jest.fn(() => []),
    },
  })),
});

describe('permission-checker', () => {
  test('requiresEntity is true when rules have conditions', () => {
    const strapi = createStrapiMock();
    const userAbility = {
      rulesFor: jest.fn(() => [{ conditions: { locale: 'en' } }]),
      can: jest.fn(),
      cannot: jest.fn(),
    } as unknown as Ability;

    const permissionChecker = createService(strapi).create({
      userAbility,
      model: 'api::article.article',
    });

    expect(permissionChecker.requiresEntity('read')).toBe(true);
  });

  test('requiresEntity is false when rules have no conditions', () => {
    const strapi = createStrapiMock();
    const userAbility = {
      rulesFor: jest.fn(() => [{ conditions: {} }, {}]),
      can: jest.fn(),
      cannot: jest.fn(),
    } as unknown as Ability;

    const permissionChecker = createService(strapi).create({
      userAbility,
      model: 'api::article.article',
    });

    expect(permissionChecker.requiresEntity('read')).toBe(false);
  });

  test.each([
    ['read', 'plugin::content-manager.explorer.read'],
    ['update', 'plugin::content-manager.explorer.update'],
    ['delete', 'plugin::content-manager.explorer.delete'],
    ['publish', 'plugin::content-manager.explorer.publish'],
  ] as const)(
    'sanitizedQuery.%s sanitizes and restricts the query for %s',
    async (name, action) => {
      const permissionsManager = createPermissionsManagerMock();
      const strapi = createStrapiMock(permissionsManager);
      const userAbility = { rulesFor: jest.fn(() => []) } as unknown as Ability;
      const query = { fields: ['title'] };

      const permissionChecker = createService(strapi).create({
        userAbility,
        model: 'api::article.article',
      });

      await permissionChecker.sanitizedQuery[name](query);

      expect(permissionsManager.sanitizeQuery).toHaveBeenCalledWith(query, {
        subject: 'api::article.article',
        action,
      });
      expect(permissionsManager.addPermissionsQueryTo).toHaveBeenCalledWith(query, action);
    }
  );

  test('sanitizedQuery defaults to the read action', async () => {
    const permissionsManager = createPermissionsManagerMock();
    const strapi = createStrapiMock(permissionsManager);
    const userAbility = { rulesFor: jest.fn(() => []) } as unknown as Ability;
    const query = {};

    const permissionChecker = createService(strapi).create({
      userAbility,
      model: 'api::article.article',
    });

    await permissionChecker.sanitizedQuery(query);

    expect(permissionsManager.sanitizeQuery).toHaveBeenCalledWith(query, {
      subject: 'api::article.article',
      action: 'plugin::content-manager.explorer.read',
    });
    expect(permissionsManager.addPermissionsQueryTo).toHaveBeenCalledWith(
      query,
      'plugin::content-manager.explorer.read'
    );
  });
});
