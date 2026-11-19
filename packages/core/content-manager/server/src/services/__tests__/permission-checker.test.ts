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
    ['create', 'plugin::content-manager.explorer.create'],
    ['update', 'plugin::content-manager.explorer.update'],
    ['delete', 'plugin::content-manager.explorer.delete'],
    ['publish', 'plugin::content-manager.explorer.publish'],
    ['unpublish', 'plugin::content-manager.explorer.publish'],
    ['discard', 'plugin::content-manager.explorer.update'],
  ] as const)(
    'sanitizedQuery.%s sanitizes and restricts the query for %s',
    async (name, action) => {
      const permissionsManager = createPermissionsManagerMock();
      const strapi = createStrapiMock(permissionsManager);
      const userAbility = { rulesFor: jest.fn(() => []) } as unknown as Ability;
      const query = { page: '1', sort: 'title:asc' };

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

  test('sanitizedQuery accepts the action as a plain string', async () => {
    const permissionsManager = createPermissionsManagerMock();
    const strapi = createStrapiMock(permissionsManager);
    const userAbility = { rulesFor: jest.fn(() => []) } as unknown as Ability;
    const query = {};

    const permissionChecker = permissionCheckerService({ strapi } as any).create({
      userAbility,
      model: 'api::article.article',
    });

    await permissionChecker.sanitizedQuery(query, 'plugin::content-manager.explorer.delete');

    expect(permissionsManager.sanitizeQuery).toHaveBeenCalledWith(query, {
      subject: 'api::article.article',
      action: 'plugin::content-manager.explorer.delete',
    });
    expect(permissionsManager.addPermissionsQueryTo).toHaveBeenCalledWith(
      query,
      'plugin::content-manager.explorer.delete'
    );
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
      rulesFor: jest.fn<unknown[], [action: string, subject: string]>(() => []),
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

  const shortcuts = [
    ['read', 'plugin::content-manager.explorer.read'],
    ['create', 'plugin::content-manager.explorer.create'],
    ['update', 'plugin::content-manager.explorer.update'],
    ['delete', 'plugin::content-manager.explorer.delete'],
    ['publish', 'plugin::content-manager.explorer.publish'],
    ['unpublish', 'plugin::content-manager.explorer.publish'],
    ['discard', 'plugin::content-manager.explorer.update'],
  ] as const;

  test.each(shortcuts)('can.%s checks %s', (name, action) => {
    const { permissionChecker, userAbility } = setup();

    permissionChecker.can[name](undefined, 'title');

    expect(userAbility.can).toHaveBeenCalledTimes(1);
    expect(userAbility.can).toHaveBeenCalledWith(action, model, 'title');
  });

  test.each(shortcuts)('cannot.%s checks %s', (name, action) => {
    const { permissionChecker, userAbility } = setup();

    permissionChecker.cannot[name](undefined, 'title');

    expect(userAbility.cannot).toHaveBeenCalledTimes(1);
    expect(userAbility.cannot).toHaveBeenCalledWith(action, model, 'title');
  });

  test.each(shortcuts)('requiresEntity.%s reads the rules of %s', (name, action) => {
    const { permissionChecker, userAbility } = setup();

    expect(permissionChecker.requiresEntity[name]()).toBe(false);
    expect(userAbility.rulesFor).toHaveBeenCalledTimes(1);
    expect(userAbility.rulesFor).toHaveBeenCalledWith(action, model);
  });

  // Controllers pass `null` (relations) and partial objects such as `{ locale }`, not only
  // documents: the contract keeps `entity?: unknown`.
  test('can.read and cannot.read check the model when the entity is null', () => {
    const { permissionChecker, userAbility } = setup();

    permissionChecker.can.read(null, 'title');
    permissionChecker.cannot.read(null, 'title');

    expect(userAbility.can).toHaveBeenCalledWith(
      'plugin::content-manager.explorer.read',
      model,
      'title'
    );
    expect(userAbility.cannot).toHaveBeenCalledWith(
      'plugin::content-manager.explorer.read',
      model,
      'title'
    );
  });

  test('cannot.create checks a partial entity as a subject', () => {
    const { permissionChecker, permissionsManager, userAbility } = setup();

    permissionChecker.cannot.create({ locale: 'fr' });

    expect(permissionsManager.toSubject).toHaveBeenCalledWith({ locale: 'fr' }, model);
    expect(userAbility.cannot).toHaveBeenCalledWith(
      'plugin::content-manager.explorer.create',
      `${model}#entity`,
      undefined
    );
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
