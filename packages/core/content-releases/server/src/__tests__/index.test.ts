/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable node/no-missing-require */

import { ACTIONS, RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';

const { register } = require('../register');

jest.mock('../utils', () => ({
  getService: jest.fn(),
}));

const mockGraphQlDisable = jest.fn();
const mockGraphQlShadowCrud = jest.fn(() => ({
  disable: mockGraphQlDisable,
}));
describe('register', () => {
  const strapi = {
    service(name: string) {
      switch (name) {
        case 'admin::permission':
          return this.admin.services.permission;
        default:
          throw new Error(`Service ${name} not found`);
      }
    },
    ee: {
      features: {
        isEnabled: jest.fn(),
      },
    },
    features: {
      future: {
        isEnabled: jest.fn(() => true),
      },
    },
    plugins: {
      'content-releases': {
        service: jest.fn(() => ({
          addDestroyListenerCallback: jest.fn(),
        })),
      },
      graphql: {
        service: jest.fn(() => ({
          shadowCRUD: mockGraphQlShadowCrud,
        })),
      },
    },
    // @ts-expect-error ignore
    plugin: (plugin) => strapi.plugins[plugin],
    hook: jest.fn(() => ({
      register: jest.fn().mockReturnThis(),
    })),
    admin: {
      services: {
        permission: {
          actionProvider: {
            registerMany: jest.fn(),
          },
        },
      },
    },
    db: {
      migrations: {
        providers: {
          internal: {
            register: jest.fn(),
          },
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register permissions if cms-content-releases feature is enabled', () => {
    strapi.ee.features.isEnabled.mockReturnValue(true);
    register({ strapi });

    expect(strapi.service('admin::permission').actionProvider.registerMany).toHaveBeenCalledWith(
      ACTIONS
    );
  });

  it('should not register permissions if cms-content-releases feature is disabled', () => {
    strapi.ee.features.isEnabled.mockReturnValue(false);
    register({ strapi });

    expect(strapi.service('admin::permission').actionProvider.registerMany).not.toHaveBeenCalled();
  });

  it('should exclude the release and release action models from the GraphQL schema when the feature is enabled', async () => {
    strapi.ee.features.isEnabled.mockReturnValue(true);

    await register({ strapi });

    expect(mockGraphQlShadowCrud).toHaveBeenNthCalledWith(1, RELEASE_MODEL_UID);
    expect(mockGraphQlShadowCrud).toHaveBeenNthCalledWith(2, RELEASE_ACTION_MODEL_UID);
    expect(mockGraphQlDisable).toHaveBeenCalledTimes(2);
  });

  it('should exclude the release and release action models from the GraphQL schema when the feature is disabled', async () => {
    strapi.ee.features.isEnabled.mockReturnValue(false);

    await register({ strapi });

    expect(mockGraphQlShadowCrud).toHaveBeenNthCalledWith(1, RELEASE_MODEL_UID);
    expect(mockGraphQlShadowCrud).toHaveBeenNthCalledWith(2, RELEASE_ACTION_MODEL_UID);
    expect(mockGraphQlDisable).toHaveBeenCalledTimes(2);
  });
});
