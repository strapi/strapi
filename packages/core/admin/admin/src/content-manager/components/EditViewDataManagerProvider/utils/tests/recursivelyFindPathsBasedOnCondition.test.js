import { recursivelyFindPathsBasedOnCondition } from '../recursivelyFindPathsBasedOnCondition';

describe('recursivelyFindPathsBasedOnCondition', () => {
  describe('relations', () => {
    test('given that there are no relational fields in the attributes it should return an empty array', () => {
      const components = {};
      const attributes = {
        field1: {
          type: 'string',
        },
        field2: {
          type: 'string',
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'relation'
      )(attributes);

      expect(actual).toEqual([]);
    });

    test('given that there are relational fields in the attributes it should return those paths in the array', () => {
      const components = {};
      const attributes = {
        field1: {
          type: 'string',
        },
        field2: {
          type: 'relation',
        },
        field3: {
          type: 'relation',
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'relation'
      )(attributes);

      expect(actual).toEqual(['field2', 'field3']);
    });

    test('given that there is a component field in the attributes which has a relational field it should return the path to that field', () => {
      const components = {
        component1: {
          attributes: {
            field1: {
              type: 'string',
            },
            field2: {
              type: 'relation',
            },
          },
        },
      };
      const attributes = {
        field1: {
          type: 'string',
        },
        field2: {
          type: 'component',
          component: 'component1',
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'relation'
      )(attributes);

      expect(actual).toEqual(['field2.field2']);
    });

    test('given that there are nested components and the nested component has a relational field it should return the path to that field', () => {
      const components = {
        component1: {
          attributes: {
            field1: {
              type: 'string',
            },
            field2: {
              component: 'component2',
              type: 'component',
            },
          },
        },
        component2: {
          attributes: {
            field1: {
              type: 'relation',
            },
          },
        },
      };
      const attributes = {
        field1: {
          type: 'string',
        },
        field2: {
          type: 'component',
          component: 'component1',
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'relation'
      )(attributes);

      expect(actual).toEqual(['field2.field2.field1']);
    });

    test('given that there are deeply nested components where the deepest has a relational field, it should return the path to that field', () => {
      const components = {
        component1: {
          attributes: {
            field1: {
              type: 'string',
            },
            field2: {
              component: 'component2',
              type: 'component',
            },
          },
        },
        component2: {
          attributes: {
            field1: {
              component: 'component3',
              type: 'component',
            },
          },
        },
        component3: {
          attributes: {
            field1: {
              type: 'relation',
            },
          },
        },
      };
      const attributes = {
        field1: {
          type: 'string',
        },
        field2: {
          type: 'component',
          component: 'component1',
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'relation'
      )(attributes);

      expect(actual).toEqual(['field2.field2.field1.field1']);
    });

    test('given that there are nested components where the multiple components and fields have relations, it should return an array to reflect this.', () => {
      const components = {
        component1: {
          attributes: {
            field1: {
              type: 'string',
            },
            field2: {
              component: 'component2',
              type: 'component',
            },
            field3: {
              type: 'relation',
            },
          },
        },
        component2: {
          attributes: {
            field1: {
              component: 'component3',
              type: 'component',
            },
          },
        },
        component3: {
          attributes: {
            field1: {
              type: 'relation',
            },
          },
        },
      };
      const attributes = {
        field1: {
          type: 'relation',
        },
        field2: {
          type: 'component',
          component: 'component1',
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'relation'
      )(attributes);

      expect(actual).toEqual(['field1', 'field2.field2.field1.field1', 'field2.field3']);
    });

    test('given that there are relations inside of a repeatable field it should return the path to those fields', () => {
      const components = {
        'basic.relation': {
          attributes: {
            id: {
              type: 'integer',
            },
            categories: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::category.category',
              targetModel: 'api::category.category',
              relationType: 'oneToMany',
            },
            my_name: {
              type: 'string',
            },
          },
        },
        'basic.nested-relation': {
          attributes: {
            id: {
              type: 'integer',
            },
            simple: {
              type: 'component',
              repeatable: false,
              component: 'basic.relation',
            },
          },
        },
        'basic.repetable-repeatble-relation': {
          attributes: {
            id: {
              type: 'integer',
            },
            repeatable_relation: {
              type: 'component',
              repeatable: true,
              component: 'basic.relation',
            },
          },
        },
      };
      const attributes = {
        repeatable_nested_component_relation: {
          type: 'component',
          repeatable: true,
          component: 'basic.nested-relation',
        },
        repeatable_single_component_relation: {
          type: 'component',
          repeatable: true,
          component: 'basic.relation',
        },
        repeatable_repeatable_nested_component: {
          type: 'component',
          repeatable: true,
          component: 'basic.repetable-repeatble-relation',
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'relation'
      )(attributes);

      expect(actual).toEqual([
        'repeatable_nested_component_relation.simple.categories',
        'repeatable_single_component_relation.categories',
        'repeatable_repeatable_nested_component.repeatable_relation.categories',
      ]);
    });

    test('given that there are relations inside a dynamic zone it should return the path to those fields', () => {
      const components = {
        'basic.relation': {
          attributes: {
            id: {
              type: 'integer',
            },
            categories: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::category.category',
              targetModel: 'api::category.category',
              relationType: 'oneToMany',
            },
            my_name: {
              type: 'string',
            },
          },
        },
        'basic.nested-relation': {
          attributes: {
            id: {
              type: 'integer',
            },
            simple: {
              type: 'component',
              repeatable: false,
              component: 'basic.relation',
            },
          },
        },
        'basic.repetable-repeatble-relation': {
          attributes: {
            id: {
              type: 'integer',
            },
            repeatable_relation: {
              type: 'component',
              repeatable: true,
              component: 'basic.relation',
            },
          },
        },
      };
      const attributes = {
        dynamic_relations: {
          type: 'dynamiczone',
          components: [
            'basic.nested-relation',
            'basic.repetable-repeatble-relation',
            'basic.relation',
          ],
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'relation'
      )(attributes);

      expect(actual).toEqual([
        'dynamic_relations.simple.categories',
        'dynamic_relations.repeatable_relation.categories',
        'dynamic_relations.categories',
      ]);
    });
  });

  describe('repeatable components', () => {
    test('given that there are repeatble fields in the attributes it should return those paths in the array', () => {
      const components = {
        component1: {
          attributes: {
            field1: {
              type: 'string',
            },
            field2: {
              type: 'string',
            },
          },
        },
      };
      const attributes = {
        field1: {
          type: 'component',
          component: 'component1',
          repeatable: true,
        },
        field2: {
          type: 'component',
          component: 'component1',
          repeatable: true,
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'component' && value.repeatable
      )(attributes);

      expect(actual).toEqual(['field1', 'field2']);
    });

    test('given that there are not repeatable fields in the attributes it should return an empty array', () => {
      const components = {
        component1: {
          attributes: {
            field1: {
              type: 'string',
            },
            field2: {
              type: 'string',
            },
          },
        },
      };
      const attributes = {
        field1: {
          type: 'component',
          component: 'component1',
          repeatable: false,
        },
        field2: {
          type: 'component',
          component: 'component1',
          repeatable: false,
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'component' && value.repeatable
      )(attributes);

      expect(actual).toEqual([]);
    });

    test('given that there are deeply nested repeatable fields in the attributes it should return those paths in the array', () => {
      const components = {
        'basic.simple': {
          attributes: {
            id: {
              type: 'integer',
            },
            categories: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::category.category',
              targetModel: 'api::category.category',
              relationType: 'oneToMany',
            },
            my_name: {
              type: 'string',
            },
          },
        },
        'basic.repetable-repeatble-relation': {
          attributes: {
            id: {
              type: 'integer',
            },
            repeatable_simple: {
              type: 'component',
              repeatable: true,
              component: 'basic.simple',
            },
          },
        },
      };

      const attributes = {
        repeatable_repeatable_nested_component: {
          type: 'component',
          repeatable: true,
          component: 'basic.repetable-repeatble-relation',
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'component' && value.repeatable
      )(attributes);

      expect(actual).toEqual([
        'repeatable_repeatable_nested_component',
        'repeatable_repeatable_nested_component.repeatable_simple',
      ]);
    });
  });

  describe('dynamic zones', () => {
    test('given that there are dynamic zones in the attributes it should return those paths in the array', () => {
      const components = {
        'basic.simple': {
          attributes: {
            id: {
              type: 'integer',
            },
            categories: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::category.category',
              targetModel: 'api::category.category',
              relationType: 'oneToMany',
            },
            my_name: {
              type: 'string',
            },
          },
        },
        'basic.nested-simple': {
          attributes: {
            id: {
              type: 'integer',
            },
            simple: {
              type: 'component',
              repeatable: false,
              component: 'basic.simple',
            },
          },
        },
        'basic.repetable-repeatble-relation': {
          attributes: {
            id: {
              type: 'integer',
            },
            repeatable_simple: {
              type: 'component',
              repeatable: true,
              component: 'basic.simple',
            },
          },
        },
      };

      const attributes = {
        dynamic_relations: {
          type: 'dynamiczone',
          components: ['basic.nested-simple', 'basic.repetable-repeatble-relation', 'basic.simple'],
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'dynamiczone'
      )(attributes);

      expect(actual).toEqual(['dynamic_relations']);
    });

    test('given that there are not dynamic zones in the attributes it should return an empty array', () => {
      const components = {};

      const attributes = {
        dynamic_relations: {
          type: 'relation',
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'dynamiczone'
      )(attributes);

      expect(actual).toEqual([]);
    });

    test('given that there are deeply nested dynamic zones in the attributes it should return those paths in the array', () => {
      const components = {
        'basic.simple': {
          attributes: {
            id: {
              type: 'integer',
            },
            categories: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::category.category',
              targetModel: 'api::category.category',
              relationType: 'oneToMany',
            },
            my_name: {
              type: 'string',
            },
          },
        },
        'basic.nested-dynamic-zone': {
          attributes: {
            id: {
              type: 'integer',
            },
            simple: {
              type: 'dynamiczone',
              components: ['basic.simple', 'basic.repetable-repeatble-relation'],
            },
          },
        },
        'basic.repetable-repeatble-relation': {
          attributes: {
            id: {
              type: 'integer',
            },
            repeatable_simple: {
              type: 'component',
              repeatable: true,
              component: 'basic.simple',
            },
          },
        },
      };

      const attributes = {
        dynamic_relations: {
          type: 'dynamiczone',
          components: ['basic.nested-dynamic-zone'],
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'dynamiczone'
      )(attributes);

      expect(actual).toEqual(['dynamic_relations', 'dynamic_relations.simple']);
    });
  });

  describe('components', () => {
    test('given that a component exits, it should be returned', () => {
      const components = {
        'basic.simple': {
          attributes: {
            id: {
              type: 'integer',
            },
            categories: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::category.category',
              targetModel: 'api::category.category',
              relationType: 'oneToMany',
            },
            my_name: {
              type: 'string',
            },
          },
        },
      };

      const attributes = {
        relation: {
          type: 'component',
          component: 'basic.simple',
          repeatable: false,
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'component' && !value.repeatable
      )(attributes);

      expect(actual).toEqual(['relation']);
    });

    test('given that a component is in a dynamic zone it should not return the name of the dynamic zone', () => {
      const components = {
        'basic.simple': {
          attributes: {
            id: {
              type: 'integer',
            },
            categories: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::category.category',
              targetModel: 'api::category.category',
              relationType: 'oneToMany',
            },
            my_name: {
              type: 'string',
            },
          },
        },
      };

      const attributes = {
        dynamic_relations: {
          type: 'dynamiczone',
          components: ['basic.simple'],
        },
      };

      const actual = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'component' && value.repeatable === false
      )(attributes);

      expect(actual).toEqual([]);
    });
  });
});
