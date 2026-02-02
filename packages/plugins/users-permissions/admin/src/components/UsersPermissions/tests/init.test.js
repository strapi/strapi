import init from '../init';

describe('USERS PERMISSIONS | COMPONENTS | UserPermissions | init', () => {
  it('should return the initial state and set permissions, routes and policies', () => {
    const initialState = {
      initialData: {},
      modifiedData: {},
      routes: {},
      selectedAction: '',
    };
    const permissions = {
      application: {
        controllers: {
          address: {
            find: { enabled: false, policy: '' },
          },
          category: {
            find: { enabled: false, policy: '' },
          },
        },
      },
      'content-manager': {
        controllers: {
          components: {
            find: { enabled: false, policy: '' },
          },
          contenttypes: {
            find: { enabled: false, policy: '' },
          },
        },
      },
    };

    const routes = {
      application: [{ method: 'GET', path: '/addresses' }],
    };

    const expected = {
      initialData: permissions,
      modifiedData: permissions,
      routes,
      selectedAction: '',
    };

    expect(init(initialState, permissions, routes)).toEqual(expected);
  });
});
