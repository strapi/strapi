/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable node/no-missing-require */

import { ACTIONS } from '../constants';

const { features } = require('@strapi/strapi/dist/utils/ee');
const { register } = require('../register');

jest.mock('@strapi/strapi/dist/utils/ee', () => ({
  features: {
    isEnabled: jest.fn(),
  },
}));
describe('register', () => {
  const strapi = {
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
    features.isEnabled.mockReturnValue(true);
    register({ strapi });
    expect(strapi.admin.services.permission.actionProvider.registerMany).toHaveBeenCalledWith(
      ACTIONS
    );
  });

  it('should not register permissions if cms-content-releases feature is disabled', () => {
    features.isEnabled.mockReturnValue(false);
    register({ strapi });
    expect(strapi.admin.services.permission.actionProvider.registerMany).not.toHaveBeenCalled();
  });
});
