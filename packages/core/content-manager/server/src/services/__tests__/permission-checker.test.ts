import permissionCheckerService from '../permission-checker';

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
    };

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
    };

    const permissionChecker = permissionCheckerService({ strapi } as any).create({
      userAbility,
      model: 'api::article.article',
    });

    expect(permissionChecker.requiresEntity('read')).toBe(false);
  });
});
