import permissionService from '../permission';

jest.mock('../../utils', () => ({
  getService: jest.fn(),
}));

const { getService } = jest.requireMock('../../utils');

describe('permission service', () => {
  test('registerPermissions includes non-displayed content types for explorer.read only', async () => {
    const registerMany = jest.fn();
    const findAllContentTypes = jest.fn(() => [
      { uid: 'api::article.article', isDisplayed: true },
      { uid: 'plugin::users-permissions.role', isDisplayed: false },
    ]);

    getService.mockReturnValue({ findAllContentTypes });

    const strapi = {
      service: jest.fn(() => ({
        actionProvider: { registerMany },
      })),
    };

    await permissionService({ strapi } as any).registerPermissions();

    const actions = registerMany.mock.calls[0][0];
    const readAction = actions.find((action: { uid: string }) => action.uid === 'explorer.read');
    const createAction = actions.find(
      (action: { uid: string }) => action.uid === 'explorer.create'
    );

    expect(readAction.subjects).toEqual(['api::article.article', 'plugin::users-permissions.role']);
    expect(createAction.subjects).toEqual(['api::article.article']);
  });
});
