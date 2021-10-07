/**
 *
 * Strapi
 * This file allow to mock any key that is in the global strapi variable
 *
 */

// Setup the strapi function global variable

// FIXME create a better jest setup
import '@testing-library/jest-dom/extend-expect';

global.process.env.ADMIN_PATH = '/admin/';

global.strapi = {
  backendURL: 'http://localhost:1337',
  isEE: false,
  features: {
    SSO: 'sso',
    allFeatures: [],
    isEnabled: () => false,
  },
  projectType: 'Community',
};

global.prompt = jest.fn();
