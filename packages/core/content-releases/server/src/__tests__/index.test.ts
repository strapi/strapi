/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable node/no-missing-require */

import { ACTIONS } from '../constants';

const { register } = require('../register');
const { bootstrap } = require('../bootstrap');
const { getService } = require('../utils');

jest.mock('../utils', () => ({
  getService: jest.fn(),
}));

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
    plugin: jest.fn(() => ({
      service: jest.fn(() => ({
        addDestroyListenerCallback: jest.fn(),
      })),
    })),
    hook: jest.fn(() => ({
      register: jest.fn(),
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

describe('bootstrap', () => {
  const mockSyncFromDatabase = jest.fn();

  getService.mockReturnValue({
    syncFromDatabase: mockSyncFromDatabase,
  });

  const strapi = {
    db: {
      lifecycles: {
        subscribe: jest.fn(),
      },
    },
    ee: {
      features: {
        isEnabled: jest.fn(),
      },
    },
    features: {
      future: {
        isEnabled: jest.fn(),
      },
    },
    log: {
      error: jest.fn(),
    },
    webhookStore: {
      addAllowedEvent: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sync scheduled jobs from the database if contentReleasesScheduling flag is enabled', async () => {
    strapi.ee.features.isEnabled.mockReturnValue(true);
    strapi.features.future.isEnabled.mockReturnValue(true);
    mockSyncFromDatabase.mockResolvedValue(new Map());
    await bootstrap({ strapi });
    expect(mockSyncFromDatabase).toHaveBeenCalled();
  });

  it('should not sync scheduled jobs from the database if contentReleasesScheduling flag is disabled', async () => {
    strapi.features.future.isEnabled.mockReturnValue(false);
    await bootstrap({ strapi });
    expect(mockSyncFromDatabase).not.toHaveBeenCalled();
  });
});
