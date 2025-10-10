import createPoliciesRegistry from '../policies';

describe('Policy util', () => {
  const registry = createPoliciesRegistry();

  describe('Get policy', () => {
    test('Throws on policy not found', () => {
      expect(registry.get('undefined')).toBeUndefined();
    });

    test('Retrieves policy by fullName', () => {
      const policyFn = () => {};

      registry.set('global::test-policy', policyFn as any);

      expect(registry.get('global::test-policy')).toBe(policyFn);
    });

    test('Retrieves a global plugin policy', () => {
      const policyFn = () => {};

      registry.set('plugin::test-plugin.test-policy', policyFn as any);

      expect(registry.get('test-plugin.test-policy')).toBeUndefined();
      expect(registry.get('plugin::test-plugin.test-policy')).toBe(policyFn);
    });

    test('Retrieves a plugin policy locally', () => {
      const policyFn = () => {};

      registry.set('plugin::test-plugin.test-policy', policyFn as any);

      expect(registry.get('test-policy', { pluginName: 'test-plugin' })).toBe(policyFn);
    });

    test('Retrieves an api policy locally', () => {
      const policyFn = () => {};

      registry.set('api::test-api.test-policy', policyFn as any);

      expect(registry.get('test-policy', { apiName: 'test-api' })).toBe(policyFn);
    });
  });

  describe('keys', () => {
    test('Returns an array of strings', () => {
      const keysRegistry = createPoliciesRegistry();
      const policyFn = () => {};

      keysRegistry.set('plugin::test-plugin.test-policy', policyFn as any);

      expect(keysRegistry.keys()).toStrictEqual(['plugin::test-plugin.test-policy']);
    });
  });
});
