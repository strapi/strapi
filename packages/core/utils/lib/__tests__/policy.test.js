'use strict';

const policyUtils = require('../policy');

describe('Policy util', () => {
  describe('Get policy', () => {
    test('Throws on policy not found', () => {
      expect(() => policyUtils.get('undefined')).toThrow();
    });

    test('Retrieves global policy', () => {
      const policyFn = () => {};

      // init global strapi
      global.strapi = {
        policy(name) {
          return this.policies[name];
        },
        policies: {
          'global::test-policy': policyFn,
        },
      };

      expect(policyUtils.get('global::test-policy')).toBe(policyFn);
    });

    test('Retrieves a global plugin policy', () => {
      const policyFn = () => {};

      global.strapi = {
        policy(name) {
          return this.policies[name];
        },
        policies: {
          'plugin::test-plugin.test-policy': policyFn,
        },
      };

      expect(() => policyUtils.get('test-plugin.test-policy')).toThrow();
      expect(policyUtils.get('plugin::test-plugin.test-policy')).toBe(policyFn);
    });

    test('Retrieves a plugin policy locally', () => {
      const policyFn = () => {};

      global.strapi = {
        policy(name) {
          return this.policies[name];
        },
        policies: {
          'plugin::test-plugin.test-policy': policyFn,
        },
      };

      expect(policyUtils.get('test-policy', { pluginName: 'test-plugin' })).toBe(policyFn);
    });

    test('Retrieves an api policy locally', () => {
      const policyFn = () => {};

      global.strapi = {
        policy(name) {
          return this.policies[name];
        },
        policies: {
          'api::test-api.test-policy': policyFn,
        },
      };

      expect(policyUtils.get('test-policy', { apiName: 'test-api' })).toBe(policyFn);
    });
  });
});
