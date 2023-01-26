'use strict';

/**
 *
 * Strapi
 * This file allow to mock any key that is in the global strapi variable
 *
 */

// FIXME create a better jest setup
require('@testing-library/jest-dom/extend-expect');

global.process.env.ADMIN_PATH = '/admin/';

global.strapi = {
  backendURL: 'http://localhost:1337',
  isEE: false,
  features: {
    SSO: 'sso',
    isEnabled: () => false,
  },
  projectType: 'Community',
};

global.prompt = jest.fn();

global.URL.createObjectURL = (file) => `http://localhost:4000/assets/${file.name}`;
