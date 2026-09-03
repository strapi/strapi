import type { Ability } from '@casl/ability';

import permissionCheckerService, { ACTIONS } from '../permission-checker';

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
  test('can sanitize output using a separate entity as the permission subject', async () => {
    const toSubject = jest.fn((_entity: any, model: string) => model);
    const sanitizeOutput = jest.fn((data: any) => data);
    const permissionService = {
      createPermissionsManager: jest.fn(() => ({
        toSubject,
        sanitizeOutput,
      })),
      actionProvider: {
        unstable_aliases: jest.fn(() => []),
      },
    };
    const strapi = {
      service: jest.fn(() => permissionService),
    };
    const userAbility = {
      can: jest.fn(),
      cannot: jest.fn(),
    } as unknown as Ability;
    const backup = { title: 'Unsaved title' };
    const document = { documentId: 'doc-1', locale: 'fr', title: 'Saved title' };

    const permissionChecker = permissionCheckerService({ strapi } as any).create({
      userAbility,
      model: 'api::article.article',
    });

    await permissionChecker.sanitizeOutput(backup as any, { subject: document as any });

    expect(toSubject).toHaveBeenCalledWith(document, 'api::article.article');
    expect(sanitizeOutput).toHaveBeenCalledWith(backup, {
      subject: 'api::article.article',
      action: ACTIONS.read,
    });
  });

  test('requiresEntity is true when rules have conditions', () => {
    const strapi = createStrapiMock();
    const userAbility = {
      rulesFor: jest.fn(() => [{ conditions: { locale: 'en' } }]),
      can: jest.fn(),
      cannot: jest.fn(),
    } as unknown as Ability;

    const permissionChecker = permissionCheckerService({ strapi } as any).create({
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

    const permissionChecker = permissionCheckerService({ strapi } as any).create({
      userAbility,
      model: 'api::article.article',
    });

    expect(permissionChecker.requiresEntity('read')).toBe(false);
  });
});
