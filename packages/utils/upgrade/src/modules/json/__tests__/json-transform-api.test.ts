import { cloneDeep } from 'lodash/fp';

import type { Utils } from '@strapi/types';

import { createJSONTransformAPI } from '../transform-api';

import type { JSONTransformAPI } from '../types';

const model = { foo: 'bar', nested: { bar: 42 } } as const;

describe('JSON Transform API', () => {
  let api: JSONTransformAPI;
  let obj: Utils.JSONObject;

  beforeEach(() => {
    obj = cloneDeep(model);
    api = createJSONTransformAPI(obj);
  });

  test('Modifications made on the base object are ignored', () => {
    Object.assign(obj, { another: 'property ' });

    expect(api.root()).toStrictEqual(model);
  });

  describe('Get', () => {
    test('Calling get with a non-existent property returns undefined', () => {
      const value = api.get('unknown-path');

      expect(value).toBeUndefined();
    });

    test('Calling get with a non-existent property and a default value returns the default value', () => {
      const value = api.get('unknown-path', 42);

      expect(value).toBe(42);
    });

    test('Calling get on an existing property returns the actual value', () => {
      const value = api.get('foo');

      expect(value).toBe('bar');
    });

    test('Calling get with an empty path returns the whole object', () => {
      const value = api.get('');

      expect(value).toStrictEqual(model);
    });
  });

  describe('Has', () => {
    test('Calling has with a non-existent property returns false', () => {
      const exists = api.has('unknown-path');

      expect(exists).toBe(false);
    });

    test('Calling has with a valid property returns true', () => {
      const exists = api.has('foo');

      expect(exists).toBe(true);
    });
  });

  describe('Set', () => {
    test('Calling set on an already existing property overrides its value', () => {
      api.set('foo', 'baz');

      expect(api.root()).toStrictEqual({ ...model, foo: 'baz' });
    });

    test('Calling set on a non-existent property creates it', () => {
      api.set('bar', 'baz');

      expect(api.root()).toStrictEqual({ ...model, bar: 'baz' });
    });

    test('Calling set on a nested property updates it', () => {
      api.set('nested.newProp', 1);

      expect(api.root()).toStrictEqual({ ...model, nested: { ...model.nested, newProp: 1 } });
    });
  });

  describe('Merge', () => {
    test('Calling merge with conflicting properties operates a deep merge', () => {
      const other = { baz: 'foo', nested: { newProp: 84 } };

      api.merge(other);

      expect(api.root()).toStrictEqual({
        foo: 'bar',
        baz: 'foo',
        nested: { bar: 42, newProp: 84 },
      });
    });
  });
});
