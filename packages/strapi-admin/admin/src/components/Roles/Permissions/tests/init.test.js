import init from '../init';

describe('ADMIN | COMPONENTS | ROLE | init', () => {
  it('should generate all content type actions to set', () => {
    const initialState = {
      collapsePath: {},
      contentTypesPermissions: {},
      pluginsAndSettingsPermissions: [],
      permissionsLayout: {},
      isSuperAdmin: false,
    };

    const permissionsLayout = {
      section: {
        firstSection: 'true',
      },
    };

    const permissions = {
      contentTypesPermissions: {
        firstPermission: true,
      },
    };

    const role = {
      code: 'strapi-super-admin',
    };

    const expected = {
      collapsePath: {},
      contentTypesPermissions: {
        firstPermission: true,
      },
      pluginsAndSettingsPermissions: [],
      permissionsLayout: {
        section: {
          firstSection: 'true',
        },
      },
      isSuperAdmin: true,
    };

    expect(init(initialState, permissionsLayout, permissions, role)).toEqual(expected);
  });
});
