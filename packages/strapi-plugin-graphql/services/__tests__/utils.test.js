'use strict';

const {
  mergeSchemas,
  getDisabledResolverMethods,
  hasParameters,
  getMethodName,
  shouldRemoveFromDefinitions,
  removeDisabledResolvers,
} = require('../utils');

const createRootSchema = () => ({
  definition: '',
  resolvers: {},
  query: {},
  mutation: {},
});

describe('Utils', () => {
  describe('mergeSchemas', () => {
    test('Ignore empty schema', () => {
      const rootSchema = createRootSchema();
      mergeSchemas(rootSchema, {});

      expect(rootSchema).toEqual(createRootSchema());
    });

    test('Concatenates definitions', () => {
      const rootSchema = createRootSchema();
      mergeSchemas(rootSchema, {
        definition: 'type Query {}',
      });

      expect(rootSchema).toMatchObject({
        definition: '\ntype Query {}',
      });
    });

    test('merges resolvers', () => {
      const resolvers = {
        Post: {
          id: () => {},
        },
      };

      const rootSchema = createRootSchema();
      mergeSchemas(rootSchema, {
        resolvers,
      });

      expect(rootSchema.resolvers).toEqual(resolvers);
    });

    test('merges query and mutation', () => {
      const query = {
        posts() {},
      };

      const mutation = {
        createMutation() {},
      };

      const rootSchema = createRootSchema();
      mergeSchemas(rootSchema, {
        query,
        mutation,
      });

      expect(rootSchema.query).toEqual(query);
      expect(rootSchema.mutation).toEqual(mutation);
    });
  });

  describe('getDisabledResolverMethods', () => {
    it('should return an array with disabled methods', () => {
      const schemaGraphql = {
        Query: {
          resolverOne: false,
          resolverTwo: 'other value',
          resolverThree: false,
        },
      };
      const result = getDisabledResolverMethods(schemaGraphql, 'Query');

      expect(result).toEqual(['resolverOne', 'resolverThree']);
    });
  });

  describe('hasParameters', () => {
    it('should return true when the method has params', () => {
      const methodString = 'methodName(param)';
      const result = hasParameters(methodString);
      expect(result).toEqual(true);
    });

    it('should return false when the method method has no params', () => {
      const methodString = 'methodName:returnType';
      const result = hasParameters(methodString);
      expect(result).toEqual(false);
    });
  });

  describe('getMethodName', () => {
    it('should return methodFoo if method definition is: methodFoo(param)', () => {
      const methodString = 'methodFoo(param)';
      const result = getMethodName(methodString);
      expect(result).toEqual('methodFoo');
    });

    it('should return methodBar if method definition is: methodBar: returnType', () => {
      const methodString = 'methodBar: returnType';
      const result = getMethodName(methodString);
      expect(result).toEqual('methodBar');
    });
  });

  describe('shouldRemoveFromDefinitions', () => {
    it('should return false when resolverDef is empty', () => {
      const resolverDef = '';
      const disabledResolvers = ['resolverOne', 'resolverTwo', 'resolverThree'];
      const result = shouldRemoveFromDefinitions(resolverDef, disabledResolvers);
      expect(result).toEqual(false);
    });

    it('should return false when resolverDef is in disabledResolvers', () => {
      const resolverDef = 'resolverOne(param)';
      const disabledResolvers = ['resolverOne', 'resolverTwo', 'resolverThree'];
      const result = shouldRemoveFromDefinitions(resolverDef, disabledResolvers);
      expect(result).toEqual(false);
    });

    it('should return true when resolverDef is in disabledResolvers', () => {
      const resolverDef = 'resolverFour:returnType';
      const disabledResolvers = ['resolverOne', 'resolverTwo', 'resolverThree'];
      const result = shouldRemoveFromDefinitions(resolverDef, disabledResolvers);
      expect(result).toEqual(true);
    });
  });

  describe('removeDisabledResolvers', () => {
    it('should remove the disabled resolvers from the definitions', () => {
      const disabledResolvers = ['resolverOne', 'resolverTwo', 'resolverThree'];
      const definitions = `
          foo(bar): baz
          test: baz
          resolverOne: baz
          resolverFour(foo): baz
        `;

      const result = removeDisabledResolvers(definitions, disabledResolvers);

      const definitionsWithoutResolverOne = `foo(bar): baz/ntest: baz/nresolverFour(foo): baz`;

      expect(result).toEqual(definitionsWithoutResolverOne);
    });
  });
});
