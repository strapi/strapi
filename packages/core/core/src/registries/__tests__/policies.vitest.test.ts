import { describe, test, expect, vi } from 'vitest';
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

describe('resolve', () => {
  test('Resolves a function policy', () => {
    const registry = createPoliciesRegistry();
    const policyFn = () => true;

    registry.add('global::', { 'is-owner': policyFn as any });

    expect(registry.resolve('global::is-owner')).toStrictEqual([{ handler: policyFn, config: {} }]);
  });

  test('Resolves a { handler, validator } policy and validates its config', () => {
    const registry = createPoliciesRegistry();
    const handler = () => true;
    const validator = vi.fn();
    const config = { role: 'editor' };

    registry.add('global::', { 'is-owner': { name: 'is-owner', handler, validator } as any });

    expect(registry.resolve({ name: 'global::is-owner', config })).toStrictEqual([
      { handler, config },
    ]);
    expect(validator).toHaveBeenCalledWith(config);
  });

  // An ESM `.js` policy with only a named export, loaded through Node's `require(esm)`:
  // `importDefault` returns the namespace object, which has no `__esModule` and no `default`.
  const esmNamespaceWithoutDefault = Object.freeze(
    Object.assign(Object.create(null), { isOwner: () => true })
  );

  test('Throws when a policy has no handler, naming its uid', () => {
    const registry = createPoliciesRegistry();

    registry.add('global::', { 'is-owner': esmNamespaceWithoutDefault });

    expect(() => registry.resolve('global::is-owner')).toThrow(
      'Policy global::is-owner has no handler (no default export?)'
    );
  });

  test('Names the full uid when a namespaced policy has no handler', () => {
    const registry = createPoliciesRegistry();

    registry.add('api::article', { 'is-owner': esmNamespaceWithoutDefault });

    expect(() => registry.resolve('is-owner', { apiName: 'article' })).toThrow(
      'Policy api::article.is-owner has no handler (no default export?)'
    );
  });
});
