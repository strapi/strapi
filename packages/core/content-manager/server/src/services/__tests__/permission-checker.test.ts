import type { Ability } from '@casl/ability';

import permissionCheckerService from '../permission-checker';
import type { PermissionCheckerService } from '../../types/services';

// The registered contract describes the action shortcuts attached at runtime.
const createService = (strapi: unknown) =>
  permissionCheckerService({ strapi } as any) as unknown as PermissionCheckerService;

const createStrapiMock = () => ({
  service: jest.fn(() => ({
    createPermissionsManager: jest.fn(() => ({
      toSubject: (_entity: any, model: string) => model,
      sanitizeOutput: jest.fn((data: any) => data),
      sanitizeQuery: jest.fn((query: any) => query),
      sanitizeInput: jest.fn((data: any) => data),
      validateQuery: jest.fn((query: any) => query),
      validateInput: jest.fn((data: any) => data),
      addPermissionsQueryTo: jest.fn((query: any) => query),
    })),
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
});

describe('permission-checker action shortcuts', () => {
  const model = 'api::article.article';

  const setup = ({ aliases = [] as string[] } = {}) => {
    const permissionsManager = {
      toSubject: jest.fn((_entity: any, subjectModel: string) => `${subjectModel}#entity`),
      sanitizeQuery: jest.fn(async (query: any) => ({ ...query, sanitized: true })),
      addPermissionsQueryTo: jest.fn(async (query: any) => ({ ...query, permissions: true })),
    };
    const strapi = {
      service: jest.fn(() => ({
        createPermissionsManager: jest.fn(() => permissionsManager),
        actionProvider: { unstable_aliases: jest.fn(() => aliases) },
      })),
    };
    const userAbility = {
      can: jest.fn<boolean, [action: string, subject?: unknown, field?: string]>(() => false),
      cannot: jest.fn<boolean, [action: string, subject?: unknown, field?: string]>(() => true),
    };
    const permissionChecker = createService(strapi).create({
      userAbility: userAbility as unknown as Ability,
      model,
    });

    return { permissionChecker, permissionsManager, userAbility };
  };

  test('can.<action> checks the mapped action on the entity subject and field', () => {
    const { permissionChecker, userAbility } = setup();
    userAbility.can.mockReturnValue(true);
    const entity = { id: 1 } as any;

    expect(permissionChecker.can.update(entity, 'title')).toBe(true);
    expect(userAbility.can).toHaveBeenCalledWith(
      'plugin::content-manager.explorer.update',
      `${model}#entity`,
      'title'
    );
  });

  test('can.<action> passes when only an alias of the action is granted', () => {
    const { permissionChecker, userAbility } = setup({ aliases: ['alias::read'] });
    userAbility.can.mockImplementation((action: string) => action === 'alias::read');

    expect(permissionChecker.can.read()).toBe(true);
    expect(userAbility.can).toHaveBeenCalledWith('alias::read', model, undefined);
  });

  test('cannot.<action> checks the mapped action on the model without an entity', () => {
    const { permissionChecker, userAbility } = setup();

    expect(permissionChecker.cannot.publish()).toBe(true);
    expect(userAbility.cannot).toHaveBeenCalledWith(
      'plugin::content-manager.explorer.publish',
      model,
      undefined
    );
  });

  test('cannot.<action> fails when an alias of the action is granted', () => {
    const { permissionChecker, userAbility } = setup({ aliases: ['alias::delete'] });
    userAbility.cannot.mockImplementation((action: string) => action !== 'alias::delete');

    expect(permissionChecker.cannot.delete()).toBe(false);
  });

  test('sanitizedQuery.<action> sanitizes the query, then adds the permissions query', async () => {
    const { permissionChecker, permissionsManager } = setup();

    await expect(permissionChecker.sanitizedQuery.update({ page: '1' })).resolves.toEqual({
      page: '1',
      sanitized: true,
      permissions: true,
    });
    expect(permissionsManager.addPermissionsQueryTo).toHaveBeenCalledWith(
      { page: '1', sanitized: true },
      'plugin::content-manager.explorer.update'
    );
  });
});
