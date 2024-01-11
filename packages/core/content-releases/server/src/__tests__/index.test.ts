/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable node/no-missing-require */

import { ACTIONS } from '../constants';

const { register } = require('../register');

describe('register', () => {
  const strapi = {
    ee: {
      features: {
        isEnabled: jest.fn(),
      },
    },
    features: {
      future: {
        isEnabled: () => true,
      },
    },
    admin: {
      services: {
        permission: {
          actionProvider: {
            registerMany: jest.fn(),
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
    expect(strapi.admin.services.permission.actionProvider.registerMany).toHaveBeenCalledWith(
      ACTIONS
    );
  });

  it('should not register permissions if cms-content-releases feature is disabled', () => {
    strapi.ee.features.isEnabled.mockReturnValue(false);
    register({ strapi });
    expect(strapi.admin.services.permission.actionProvider.registerMany).not.toHaveBeenCalled();
  });
});
