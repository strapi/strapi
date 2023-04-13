import reducer, { initialState } from '../reducer';

describe('CONTENT MANAGER | COMPONENTS | EditViewDataManagerProvider | reducer', () => {
  describe('ADD_NON_REPEATABLE_COMPONENT_TO_FIELD', () => {
    it('should add component correctly in the modifiedData', () => {
      const components = {
        'blog.simple': {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            name: {
              type: 'string',
            },
          },
        },
      };

      const state = {
        ...initialState,
        componentsDataStructure: {
          'blog.simple': { name: 'test' },
        },
        initialData: {
          name: 'name',
        },
        modifiedData: {
          name: 'name',
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {
          'blog.simple': { name: 'test' },
        },
        initialData: {
          name: 'name',
        },
        modifiedData: {
          name: 'name',
          component_field: { sub_component: { name: 'test' } },
        },
      };

      const action = {
        type: 'ADD_NON_REPEATABLE_COMPONENT_TO_FIELD',
        componentLayoutData: components['blog.simple'],
        allComponents: components,
        keys: ['component_field', 'sub_component'],
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should correctly prepare a relational field in the component', () => {
      const components = {
        'blog.simple': {
          uid: 'blog.simple',
          attributes: {
            category: {
              type: 'relation',
            },
          },
        },
      };

      const state = {
        ...initialState,
        componentsDataStructure: {},
        initialData: {
          name: 'name',
        },
        modifiedData: {
          name: 'name',
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {},
        initialData: {
          name: 'name',
        },
        modifiedData: {
          name: 'name',
          component_field: { sub_component: { category: [] } },
        },
      };

      const action = {
        type: 'ADD_NON_REPEATABLE_COMPONENT_TO_FIELD',
        componentLayoutData: components['blog.simple'],
        allComponents: components,
        keys: ['component_field', 'sub_component'],
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should not prepare a relational field in the component if the component is repeatable', () => {
      const components = {
        'basic.simple': {
          uid: 'basic.simple',
          attributes: {
            categories: {
              type: 'relation',
            },
          },
        },
        'basic.repeatable-repeatble-relation': {
          uid: 'basic.repeatable-repeatble-relation',
          attributes: {
            repeatable_simple: {
              type: 'component',
              repeatable: true,
              component: 'basic.simple',
            },
          },
        },
      };

      const state = {
        ...initialState,
        initialData: {
          name: 'name',
        },
        modifiedData: {
          name: 'name',
        },
      };

      const expected = {
        ...initialState,
        initialData: {
          name: 'name',
        },
        modifiedData: {
          name: 'name',
          component_field: { sub_component: {} },
        },
      };

      const action = {
        type: 'ADD_NON_REPEATABLE_COMPONENT_TO_FIELD',
        componentLayoutData: components['basic.repeatable-repeatble-relation'],
        allComponents: components,
        keys: ['component_field', 'sub_component'],
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ADD_REPEATABLE_COMPONENT_TO_FIELD', () => {
    it('should add a repeatable field with the correct __temp_key__ to the modifiedData when the leaf is an empty Array', () => {
      const components = {
        'blog.simple': {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            name: {
              type: 'string',
            },
          },
        },
      };

      const state = {
        ...initialState,
        componentsDataStructure: {
          'blog.simple': { name: 'test' },
        },
        initialData: {
          name: 'name',
          component_field: [],
        },
        modifiedData: {
          name: 'name',
          component_field: [],
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {
          'blog.simple': { name: 'test' },
        },
        initialData: {
          name: 'name',
          component_field: [],
        },
        modifiedData: {
          name: 'name',
          component_field: [{ name: 'test', __temp_key__: 0 }],
        },
      };

      const action = {
        type: 'ADD_REPEATABLE_COMPONENT_TO_FIELD',
        componentLayoutData: {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            name: {
              type: 'string',
            },
          },
        },
        allComponents: components,
        keys: ['component_field'],
        shouldCheckErrors: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add a repeatable field with the correct __temp_key__ to the modifiedData when the leaf is not an empty Array', () => {
      const components = {
        'blog.simple': {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            name: {
              type: 'string',
            },
          },
        },
      };

      const state = {
        ...initialState,
        componentsDataStructure: {
          'blog.simple': { name: 'test' },
        },
        initialData: {
          name: 'name',
          component_field: [{ name: 'test', __temp_key__: 12 }],
        },
        modifiedData: {
          name: 'name',
          component_field: [{ name: 'test', __temp_key__: 12 }],
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {
          'blog.simple': { name: 'test' },
        },
        initialData: {
          name: 'name',
          component_field: [{ name: 'test', __temp_key__: 12 }],
        },
        modifiedData: {
          name: 'name',
          component_field: [
            { name: 'test', __temp_key__: 12 },
            { name: 'test', __temp_key__: 13 },
          ],
        },
        shouldCheckErrors: true,
      };

      const action = {
        type: 'ADD_REPEATABLE_COMPONENT_TO_FIELD',
        componentLayoutData: {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            name: {
              type: 'string',
            },
          },
        },
        allComponents: components,
        keys: ['component_field'],
        shouldCheckErrors: true,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add a repeatable field to the modifiedData when the leaf is not defined', () => {
      const components = {
        'blog.simple': {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            name: {
              type: 'string',
            },
          },
        },
      };

      const state = {
        ...initialState,
        componentsDataStructure: {
          'blog.simple': { name: 'test' },
        },
        initialData: {
          name: 'name',
        },
        modifiedData: {
          name: 'name',
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {
          'blog.simple': { name: 'test' },
        },
        initialData: {
          name: 'name',
        },
        modifiedData: {
          name: 'name',
          component_field: [{ name: 'test', __temp_key__: 0 }],
        },
      };

      const action = {
        type: 'ADD_REPEATABLE_COMPONENT_TO_FIELD',
        componentLayoutData: {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            name: {
              type: 'string',
            },
          },
        },
        allComponents: components,
        keys: ['component_field'],
        shouldCheckErrors: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add a repeatable field and correctly set up the relational field', () => {
      const components = {
        'blog.simple': {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            relation: {
              type: 'relation',
            },
          },
        },
      };

      const state = {
        ...initialState,
        initialData: {
          name: 'name',
          component_field: [],
        },
        modifiedData: {
          name: 'name',
          component_field: [],
        },
      };

      const expected = {
        ...initialState,
        initialData: {
          name: 'name',
          component_field: [],
        },
        modifiedData: {
          name: 'name',
          component_field: [{ relation: [], __temp_key__: 0 }],
        },
      };

      const action = {
        type: 'ADD_REPEATABLE_COMPONENT_TO_FIELD',
        componentLayoutData: {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            relation: {
              type: 'relation',
            },
          },
        },
        allComponents: components,
        keys: ['component_field'],
        shouldCheckErrors: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add a repeatable field and not set up the relational field if its a nested repeatable field until the component with the relation is added', () => {
      const components = {
        'basic.simple': {
          uid: 'basic.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            categories: {
              type: 'relation',
            },
            my_name: {
              type: 'string',
            },
          },
        },
        'basic.repeatable-repeatble-relation': {
          uid: 'basic.repeatable-repeatble-relation',
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

      const state = {
        ...initialState,
        initialData: {
          name: 'name',
          repeatable_repeatable_nested_component: [],
        },
        modifiedData: {
          name: 'name',
          repeatable_repeatable_nested_component: [],
        },
      };

      const stateAfterAddingRepeatable1 = reducer(state, {
        type: 'ADD_REPEATABLE_COMPONENT_TO_FIELD',
        keys: ['repeatable_repeatable_nested_component'],
        componentLayoutData: {
          uid: 'basic.repeatable-repeatble-relation',
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
        allComponents: components,
        shouldCheckErrors: false,
      });

      expect(stateAfterAddingRepeatable1).toEqual({
        ...initialState,
        initialData: {
          name: 'name',
          repeatable_repeatable_nested_component: [],
        },
        modifiedData: {
          name: 'name',
          repeatable_repeatable_nested_component: [{ __temp_key__: 0 }],
        },
      });

      const stateAfterAddingRepeatable2 = reducer(stateAfterAddingRepeatable1, {
        type: 'ADD_REPEATABLE_COMPONENT_TO_FIELD',
        keys: ['repeatable_repeatable_nested_component', '0', 'repeatable_simple'],
        componentLayoutData: {
          uid: 'basic.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            categories: {
              type: 'relation',
            },
            my_name: {
              type: 'string',
            },
          },
        },
        allComponents: components,
        shouldCheckErrors: false,
      });

      expect(stateAfterAddingRepeatable2).toEqual({
        ...initialState,
        initialData: {
          name: 'name',
          repeatable_repeatable_nested_component: [],
        },
        modifiedData: {
          name: 'name',
          repeatable_repeatable_nested_component: [
            {
              __temp_key__: 0,
              repeatable_simple: [
                {
                  __temp_key__: 0,
                  categories: [],
                },
              ],
            },
          ],
        },
      });
    });

    it('should add a repeatable field and not set up the relational field if its a deeply nested repeatable field within another component', () => {
      /**
       * Structurally this component looks like:
       * - outer_single_compo
       *    - level_one_repeatable
       *        - level_two_single_component
       *            - level_three_repeatable
       *
       * The reducer should only handle the repeatable at level_one in this case.
       */

      const state = {
        ...initialState,
        componentsDataStructure: {
          'basic.outer_single_compo': {},
          'basic.level_one_repeatable': {},
          'basic.level_two_single_component': {},
          'basic.level_three_repeatable': {},
        },
        initialData: {},
        modifiedData: {
          outer_single_compo: {},
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {
          'basic.outer_single_compo': {},
          'basic.level_one_repeatable': {},
          'basic.level_two_single_component': {},
          'basic.level_three_repeatable': {},
        },
        initialData: {},
        modifiedData: {
          outer_single_compo: {
            level_one_repeatable: [
              {
                __temp_key__: 0,
              },
            ],
          },
        },
      };

      const action = {
        type: 'ADD_REPEATABLE_COMPONENT_TO_FIELD',
        keys: ['outer_single_compo', 'level_one_repeatable'],
        componentLayoutData: {
          uid: 'basic.level_one_repeatable',
          attributes: {
            id: {
              type: 'integer',
            },
            level_two_single_component: {
              displayName: 'level_two_single_component',
              type: 'component',
              component: 'basic.level_two_single_component',
            },
          },
        },
        allComponents: {
          'basic.outer_single_compo': {
            uid: 'basic.outer_single_compo',
            attributes: {
              id: {
                type: 'integer',
              },
              level_one_repeatable: {
                displayName: 'level_one_repeatable',
                type: 'component',
                repeatable: true,
                component: 'basic.level_one_repeatable',
              },
            },
          },
          'basic.level_one_repeatable': {
            uid: 'basic.level_one_repeatable',
            attributes: {
              id: {
                type: 'integer',
              },
              level_two_single_component: {
                displayName: 'level_two_single_component',
                type: 'component',
                component: 'basic.level_two_single_component',
              },
            },
          },
          'basic.level_two_single_component': {
            uid: 'basic.level_two_single_component',
            attributes: {
              id: {
                type: 'integer',
              },
              level_three_repeatable: {
                displayName: 'level_three_repeatable',
                repeatable: true,
                type: 'component',
                component: 'basic.level_three_repeatable',
              },
            },
          },
          'basic.level_three_repeatable': {
            uid: 'basic.level_three_repeatable',
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
            },
          },
        },
        shouldCheckErrors: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ADD_COMPONENT_TO_DYNAMIC_ZONE', () => {
    it('should add a component in a DZ to the modifiedData when the DZ is not defined', () => {
      const components = {
        'blog.simple': {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            name: {
              type: 'string',
            },
          },
        },
      };

      const state = {
        ...initialState,
        componentsDataStructure: {
          'blog.simple': { name: 'test' },
        },
        initialData: {
          name: 'name',
        },
        modifiedData: {
          name: 'name',
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {
          'blog.simple': { name: 'test' },
        },
        initialData: {
          name: 'name',
        },
        modifiedData: {
          name: 'name',
          dz: [{ name: 'test', __component: 'blog.simple', __temp_key__: 0 }],
        },
        modifiedDZName: 'dz',
      };

      const action = {
        type: 'ADD_COMPONENT_TO_DYNAMIC_ZONE',
        componentLayoutData: {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            name: {
              type: 'string',
            },
          },
        },
        allComponents: components,
        keys: ['dz'],
        shouldCheckErrors: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add a component to a DZ to the modifiedData when the DZ is defined', () => {
      const components = {
        'blog.simple': {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            name: {
              type: 'string',
            },
          },
        },
      };

      const state = {
        ...initialState,
        componentsDataStructure: {
          'blog.simple': { name: 'test' },
        },
        initialData: {
          name: 'name',
          dz: [{ name: 'test', __component: 'blog.simple', id: 0 }],
        },
        modifiedData: {
          name: 'name',
          dz: [{ name: 'test', __component: 'blog.simple', id: 0 }],
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {
          'blog.simple': { name: 'test' },
        },
        initialData: {
          name: 'name',
          dz: [{ name: 'test', __component: 'blog.simple', id: 0 }],
        },
        modifiedData: {
          name: 'name',
          dz: [
            { name: 'test', __component: 'blog.simple', id: 0 },
            { name: 'test', __component: 'blog.simple', __temp_key__: 1 },
          ],
        },
        modifiedDZName: 'dz',
        shouldCheckErrors: true,
      };

      const action = {
        type: 'ADD_COMPONENT_TO_DYNAMIC_ZONE',
        componentLayoutData: {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            name: {
              type: 'string',
            },
          },
        },
        allComponents: components,
        keys: ['dz'],
        shouldCheckErrors: true,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add a component field and correctly set up the relational field if that component contains a relational field', () => {
      const components = {
        'blog.relation': {
          uid: 'blog.simple',
          attributes: {
            id: {
              type: 'integer',
            },
            relation: {
              type: 'relation',
            },
          },
        },
      };

      const state = {
        ...initialState,
        initialData: {
          name: 'name',
        },
        modifiedData: {
          name: 'name',
        },
      };

      const expected = {
        ...initialState,
        initialData: {
          name: 'name',
        },
        modifiedData: {
          name: 'name',
          dz: [{ relation: [], __component: 'blog.relation', __temp_key__: 0 }],
        },
        modifiedDZName: 'dz',
      };

      const action = {
        type: 'ADD_COMPONENT_TO_DYNAMIC_ZONE',
        componentLayoutData: {
          uid: 'blog.relation',
          attributes: {
            id: {
              type: 'integer',
            },
            relation: {
              type: 'relation',
            },
          },
        },
        allComponents: components,
        keys: ['dz'],
        shouldCheckErrors: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('CONNECT_RELATION', () => {
    it('should add a relation in the modifiedData', () => {
      const state = {
        ...initialState,

        initialData: {},
        modifiedData: {
          relation: [],
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {},
        initialData: {},
        modifiedData: {
          relation: [{ id: 1, __temp_key__: 'a0' }],
        },
      };

      const action = {
        type: 'CONNECT_RELATION',
        keys: ['relation'],
        value: { id: 1 },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should set a temp key every time a relation is connected', () => {
      const state = {
        ...initialState,

        initialData: {
          relation: [
            { id: 1, __temp_key__: 'a0' },
            { id: 2, __temp_key__: 'a1' },
          ],
        },
        modifiedData: {
          relation: [
            { id: 1, __temp_key__: 'a0' },
            { id: 2, __temp_key__: 'a1' },
          ],
        },
      };

      const nextState = reducer(state, {
        type: 'CONNECT_RELATION',
        keys: ['relation'],
        value: { id: 3 },
      });

      expect(nextState).toStrictEqual({
        ...initialState,
        componentsDataStructure: {},
        initialData: {
          relation: [
            { id: 1, __temp_key__: 'a0' },
            { id: 2, __temp_key__: 'a1' },
          ],
        },
        modifiedData: {
          relation: [
            { id: 1, __temp_key__: 'a0' },
            { id: 2, __temp_key__: 'a1' },
            { id: 3, __temp_key__: 'a2' },
          ],
        },
      });

      expect(
        reducer(nextState, {
          type: 'CONNECT_RELATION',
          keys: ['relation'],
          value: { id: 4 },
        })
      ).toStrictEqual({
        ...initialState,
        componentsDataStructure: {},
        initialData: {
          relation: [
            { id: 1, __temp_key__: 'a0' },
            { id: 2, __temp_key__: 'a1' },
          ],
        },
        modifiedData: {
          relation: [
            { id: 1, __temp_key__: 'a0' },
            { id: 2, __temp_key__: 'a1' },
            { id: 3, __temp_key__: 'a2' },
            { id: 4, __temp_key__: 'a3' },
          ],
        },
      });
    });

    it('should overwrite existing data, when toOneRelation is set to true', () => {
      const state = {
        ...initialState,

        initialData: {},
        modifiedData: {
          relation: [],
        },
      };

      const action = {
        type: 'CONNECT_RELATION',
        keys: ['relation'],
        value: { id: 1 },
        toOneRelation: true,
      };

      let nextState = reducer(state, action);

      expect(nextState).toEqual({
        ...initialState,
        componentsDataStructure: {},
        initialData: {},
        modifiedData: {
          relation: [{ id: 1 }],
        },
      });

      nextState = reducer(nextState, {
        type: 'CONNECT_RELATION',
        keys: ['relation'],
        value: { id: 2 },
        toOneRelation: true,
      });

      expect(nextState).toEqual({
        ...initialState,
        componentsDataStructure: {},
        initialData: {},
        modifiedData: {
          relation: [{ id: 2 }],
        },
      });
    });
  });

  describe('LOAD_RELATION', () => {
    it('should add loaded relations to initalData & modifiedState', () => {
      const state = {
        ...initialState,
        initialData: {
          relation: [],
        },
        modifiedData: {
          relation: [],
        },
      };

      const initialDataPath = ['initialData', 'relation'];
      const modifiedDataPath = ['modifiedData', 'relation'];

      let nextState = reducer(state, {
        type: 'LOAD_RELATION',
        initialDataPath,
        modifiedDataPath,
        value: [{ id: 1 }],
      });

      expect(nextState).toStrictEqual({
        ...initialState,
        initialData: {
          relation: [{ id: 1, __temp_key__: 'a0' }],
        },
        modifiedData: {
          relation: [{ id: 1, __temp_key__: 'a0' }],
        },
      });

      expect(
        reducer(nextState, {
          type: 'LOAD_RELATION',
          initialDataPath,
          modifiedDataPath,
          value: [{ id: 2 }],
        })
      ).toStrictEqual({
        ...initialState,
        initialData: {
          relation: [
            { id: 2, __temp_key__: 'Zz' },
            { id: 1, __temp_key__: 'a0' },
          ],
        },
        modifiedData: {
          relation: [
            { id: 2, __temp_key__: 'Zz' },
            { id: 1, __temp_key__: 'a0' },
          ],
        },
      });
    });

    it('should not add the new relations if the last relation of the passed value is the same as the current initialDatas last relation', () => {
      const state = {
        ...initialState,
        initialData: {
          relation: [],
        },
        modifiedData: {
          relation: [],
        },
      };

      const initialDataPath = ['initialData', 'relation'];
      const modifiedDataPath = ['modifiedData', 'relation'];

      let nextState = reducer(state, {
        type: 'LOAD_RELATION',
        initialDataPath,
        modifiedDataPath,
        value: [{ id: 1 }],
      });

      expect(nextState).toStrictEqual({
        ...initialState,
        initialData: {
          relation: [{ id: 1, __temp_key__: 'a0' }],
        },
        modifiedData: {
          relation: [{ id: 1, __temp_key__: 'a0' }],
        },
      });

      expect(
        reducer(nextState, {
          type: 'LOAD_RELATION',
          initialDataPath,
          modifiedDataPath,
          value: [{ id: 1 }],
        })
      ).toStrictEqual({
        ...initialState,
        initialData: {
          relation: [{ id: 1, __temp_key__: 'a0' }],
        },
        modifiedData: {
          relation: [{ id: 1, __temp_key__: 'a0' }],
        },
      });
    });

    it('should add a temp key for all the relations added', () => {
      const state = {
        ...initialState,
        initialData: {
          relation: [],
        },
        modifiedData: {
          relation: [],
        },
      };

      const initialDataPath = ['initialData', 'relation'];
      const modifiedDataPath = ['modifiedData', 'relation'];

      let nextState = reducer(state, {
        type: 'LOAD_RELATION',
        initialDataPath,
        modifiedDataPath,
        value: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      });

      expect(nextState).toStrictEqual({
        ...initialState,
        initialData: {
          relation: [
            { id: 1, __temp_key__: 'a0' },
            { id: 2, __temp_key__: 'a1' },
            { id: 3, __temp_key__: 'a2' },
            { id: 4, __temp_key__: 'a3' },
            { id: 5, __temp_key__: 'a4' },
          ],
        },
        modifiedData: {
          relation: [
            { id: 1, __temp_key__: 'a0' },
            { id: 2, __temp_key__: 'a1' },
            { id: 3, __temp_key__: 'a2' },
            { id: 4, __temp_key__: 'a3' },
            { id: 5, __temp_key__: 'a4' },
          ],
        },
      });
    });

    it('should add a temp key working backwards on every new load because of how relations are shown in the UI', () => {
      const state = {
        ...initialState,
        initialData: {
          relation: [],
        },
        modifiedData: {
          relation: [],
        },
      };

      const initialDataPath = ['initialData', 'relation'];
      const modifiedDataPath = ['modifiedData', 'relation'];

      let nextState = reducer(state, {
        type: 'LOAD_RELATION',
        initialDataPath,
        modifiedDataPath,
        value: [{ id: 1 }, { id: 2 }],
      });

      expect(
        reducer(nextState, {
          type: 'LOAD_RELATION',
          initialDataPath,
          modifiedDataPath,
          value: [{ id: 3 }, { id: 4 }],
        })
      ).toStrictEqual({
        ...initialState,
        initialData: {
          relation: [
            { id: 3, __temp_key__: 'Zy' },
            { id: 4, __temp_key__: 'Zz' },
            { id: 1, __temp_key__: 'a0' },
            { id: 2, __temp_key__: 'a1' },
          ],
        },
        modifiedData: {
          relation: [
            { id: 3, __temp_key__: 'Zy' },
            { id: 4, __temp_key__: 'Zz' },
            { id: 1, __temp_key__: 'a0' },
            { id: 2, __temp_key__: 'a1' },
          ],
        },
      });
    });
  });

  describe('DISCONNECT_RELATION', () => {
    it('should remove a relation from modifiedData', () => {
      const state = {
        ...initialState,
        initialData: { relation: [{ id: 1 }] },
        modifiedData: {
          relation: [{ id: 1 }],
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {},
        initialData: { relation: [{ id: 1 }] },
        modifiedData: {
          relation: [],
        },
      };

      const action = {
        type: 'DISCONNECT_RELATION',
        keys: ['relation'],
        id: 1,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('INIT_FORM', () => {
    it('should set the state correctly', () => {
      const state = {
        ...initialState,
        formErrors: true,
        initialData: true,
        modifiedData: true,
        modifiedDZName: true,
        shouldCheckErrors: true,
      };
      const expected = {
        ...initialState,
        formErrors: {},
        initialData: { ok: true },
        modifiedData: { ok: true },
        modifiedDZName: null,
        shouldCheckErrors: false,
      };

      const action = {
        type: 'INIT_FORM',
        initialValues: { ok: true },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    describe('relation fields', () => {
      it('should create an array per relational field passed as the initialValues', () => {
        const state = {
          ...initialState,
          formErrors: true,
          initialData: {},
          modifiedData: {},
          modifiedDZName: true,
          shouldCheckErrors: true,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues: { ok: true, relation: { count: 10 } },
          attributes: {
            okay: {
              type: 'boolean',
            },
            relation: {
              type: 'relation',
              relation: 'manyToMany',
              target: 'api::category.category',
              inversedBy: 'relation_locales',
              targetModel: 'api::category.category',
              relationType: 'manyToMany',
            },
          },
        };

        expect(reducer(state, action)).toMatchInlineSnapshot(`
          {
            "componentsDataStructure": {},
            "contentTypeDataStructure": {},
            "formErrors": {},
            "initialData": {
              "ok": true,
              "relation": [],
            },
            "modifiedDZName": null,
            "modifiedData": {
              "ok": true,
              "relation": [],
            },
            "publishConfirmation": {
              "draftCount": 0,
              "show": false,
            },
            "shouldCheckErrors": false,
          }
        `);
      });

      it('should create an array per relational field even when the relationalFieldPaths path is nested', () => {
        const state = {
          ...initialState,
          formErrors: true,
          initialData: {},
          modifiedData: {},
          modifiedDZName: true,
          shouldCheckErrors: true,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues: {
            ok: true,
            relation: { count: 10 },
            component: { relation: { count: 10 } },
          },
          components: {
            test: {
              attributes: {
                relation: {
                  type: 'relation',
                  relation: 'manyToMany',
                  target: 'api::category.category',
                  inversedBy: 'relation_locales',
                  targetModel: 'api::category.category',
                  relationType: 'manyToMany',
                },
              },
            },
          },
          attributes: {
            okay: {
              type: 'boolean',
            },
            relation: {
              type: 'relation',
              relation: 'manyToMany',
              target: 'api::category.category',
              inversedBy: 'relation_locales',
              targetModel: 'api::category.category',
              relationType: 'manyToMany',
            },
            component: {
              type: 'component',
              repeatable: false,
              component: 'test',
            },
          },
        };

        expect(reducer(state, action)).toMatchInlineSnapshot(`
          {
            "componentsDataStructure": {},
            "contentTypeDataStructure": {},
            "formErrors": {},
            "initialData": {
              "component": {
                "__temp_key__": 0,
                "relation": [],
              },
              "ok": true,
              "relation": [],
            },
            "modifiedDZName": null,
            "modifiedData": {
              "component": {
                "__temp_key__": 0,
                "relation": [],
              },
              "ok": true,
              "relation": [],
            },
            "publishConfirmation": {
              "draftCount": 0,
              "show": false,
            },
            "shouldCheckErrors": false,
          }
        `);
      });

      it('should create an array per relational field even when the relationalFieldPaths path is nested', () => {
        const state = {
          ...initialState,
          formErrors: true,
          initialData: {},
          modifiedData: {},
          modifiedDZName: true,
          shouldCheckErrors: true,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues: {
            ok: true,
            relation: { count: 10 },
            component: {
              field1: {
                field2: {
                  count: 10,
                },
              },
            },
          },
          components: {
            test: {
              attributes: {
                field1: {
                  type: 'component',
                  repeatable: false,
                  component: 'test2',
                },
              },
            },
            test2: {
              attributes: {
                field2: {
                  type: 'relation',
                  relation: 'manyToMany',
                  target: 'api::category.category',
                  inversedBy: 'relation_locales',
                  targetModel: 'api::category.category',
                  relationType: 'manyToMany',
                },
              },
            },
          },
          attributes: {
            okay: {
              type: 'boolean',
            },
            relation: {
              type: 'relation',
              relation: 'manyToMany',
              target: 'api::category.category',
              inversedBy: 'relation_locales',
              targetModel: 'api::category.category',
              relationType: 'manyToMany',
            },
            component: {
              type: 'component',
              repeatable: false,
              component: 'test',
            },
          },
        };

        expect(reducer(state, action)).toMatchInlineSnapshot(`
          {
            "componentsDataStructure": {},
            "contentTypeDataStructure": {},
            "formErrors": {},
            "initialData": {
              "component": {
                "__temp_key__": 0,
                "field1": {
                  "__temp_key__": 0,
                  "field2": [],
                },
              },
              "ok": true,
              "relation": [],
            },
            "modifiedDZName": null,
            "modifiedData": {
              "component": {
                "__temp_key__": 0,
                "field1": {
                  "__temp_key__": 0,
                  "field2": [],
                },
              },
              "ok": true,
              "relation": [],
            },
            "publishConfirmation": {
              "draftCount": 0,
              "show": false,
            },
            "shouldCheckErrors": false,
          }
        `);
      });
    });

    describe('repeatable components', () => {
      it('should create an array for a relational field', () => {
        const initialValues = {
          categories: 'my_category',
          repeatable_single_component_relation: [
            {
              id: 15,
              my_name: null,
              categories: {
                count: 2,
              },
              __temp_key__: 0,
            },
          ],
        };

        const state = {
          ...initialState,
          formErrors: true,
          initialData: {},
          modifiedData: {},
          modifiedDZName: true,
          shouldCheckErrors: true,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues,
          components: {
            test: {
              attributes: {
                my_name: {
                  type: 'string',
                },
                categories: {
                  type: 'relation',
                  relation: 'manyToMany',
                  target: 'api::category.category',
                  inversedBy: 'relation_locales',
                  targetModel: 'api::category.category',
                  relationType: 'manyToMany',
                },
              },
            },
          },
          attributes: {
            categories: {
              type: 'string',
            },
            repeatable_single_component_relation: {
              type: 'component',
              repeatable: true,
              component: 'test',
            },
          },
        };

        expect(reducer(state, action)).toMatchInlineSnapshot(`
          {
            "componentsDataStructure": {},
            "contentTypeDataStructure": {},
            "formErrors": {},
            "initialData": {
              "categories": "my_category",
              "repeatable_single_component_relation": [
                {
                  "__temp_key__": 0,
                  "categories": [],
                  "id": 15,
                  "my_name": null,
                },
              ],
            },
            "modifiedDZName": null,
            "modifiedData": {
              "categories": "my_category",
              "repeatable_single_component_relation": [
                {
                  "__temp_key__": 0,
                  "categories": [],
                  "id": 15,
                  "my_name": null,
                },
              ],
            },
            "publishConfirmation": {
              "draftCount": 0,
              "show": false,
            },
            "shouldCheckErrors": false,
          }
        `);
      });

      it('should create an array for a relational field inside a component', () => {
        const initialValues = {
          categories: 'my_category',
          repeatable_nested_component_relation: [
            {
              id: 2,
              simple: {
                id: 16,
                my_name: null,
                categories: {
                  count: 1,
                },
              },
              __temp_key__: 0,
            },
          ],
        };

        const state = {
          ...initialState,
          formErrors: true,
          initialData: {},
          modifiedData: {},
          modifiedDZName: true,
          shouldCheckErrors: true,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues,
          components: {
            test: {
              attributes: {
                simple: {
                  type: 'component',
                  repeatable: false,
                  component: 'test2',
                },
              },
            },
            test2: {
              attributes: {
                my_name: {
                  type: 'string',
                },
                categories: {
                  type: 'relation',
                  relation: 'manyToMany',
                  target: 'api::category.category',
                  inversedBy: 'relation_locales',
                  targetModel: 'api::category.category',
                  relationType: 'manyToMany',
                },
              },
            },
          },
          attributes: {
            categories: {
              type: 'string',
            },
            repeatable_nested_component_relation: {
              type: 'component',
              repeatable: true,
              component: 'test',
            },
          },
        };

        expect(reducer(state, action)).toMatchInlineSnapshot(`
          {
            "componentsDataStructure": {},
            "contentTypeDataStructure": {},
            "formErrors": {},
            "initialData": {
              "categories": "my_category",
              "repeatable_nested_component_relation": [
                {
                  "__temp_key__": 0,
                  "id": 2,
                  "simple": {
                    "__temp_key__": 0,
                    "categories": [],
                    "id": 16,
                    "my_name": null,
                  },
                },
              ],
            },
            "modifiedDZName": null,
            "modifiedData": {
              "categories": "my_category",
              "repeatable_nested_component_relation": [
                {
                  "__temp_key__": 0,
                  "id": 2,
                  "simple": {
                    "__temp_key__": 0,
                    "categories": [],
                    "id": 16,
                    "my_name": null,
                  },
                },
              ],
            },
            "publishConfirmation": {
              "draftCount": 0,
              "show": false,
            },
            "shouldCheckErrors": false,
          }
        `);
      });

      it('should create an array for a relational field inside a repeatable component which is inside a repeatable component', () => {
        const initialValues = {
          categories: 'my_category',
          repeatable_repeatable_nested_component: [
            {
              id: 1,
              repeatable_simple: [
                {
                  id: 17,
                  my_name: null,
                  categories: {
                    count: 2,
                  },
                  __temp_key__: 0,
                },
              ],
              __temp_key__: 0,
            },
          ],
        };

        const state = {
          ...initialState,
          formErrors: true,
          initialData: {},
          modifiedData: {},
          modifiedDZName: true,
          shouldCheckErrors: true,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues,
          components: {
            test: {
              attributes: {
                repeatable_simple: {
                  type: 'component',
                  repeatable: true,
                  component: 'test2',
                },
              },
            },
            test2: {
              attributes: {
                my_name: {
                  type: 'string',
                },
                categories: {
                  type: 'relation',
                  relation: 'manyToMany',
                  target: 'api::category.category',
                  inversedBy: 'relation_locales',
                  targetModel: 'api::category.category',
                  relationType: 'manyToMany',
                },
              },
            },
          },
          attributes: {
            categories: {
              type: 'string',
            },
            repeatable_repeatable_nested_component: {
              type: 'component',
              repeatable: true,
              component: 'test',
            },
          },
        };

        expect(reducer(state, action)).toMatchInlineSnapshot(`
          {
            "componentsDataStructure": {},
            "contentTypeDataStructure": {},
            "formErrors": {},
            "initialData": {
              "categories": "my_category",
              "repeatable_repeatable_nested_component": [
                {
                  "__temp_key__": 0,
                  "id": 1,
                  "repeatable_simple": [
                    {
                      "__temp_key__": 0,
                      "categories": [],
                      "id": 17,
                      "my_name": null,
                    },
                  ],
                },
              ],
            },
            "modifiedDZName": null,
            "modifiedData": {
              "categories": "my_category",
              "repeatable_repeatable_nested_component": [
                {
                  "__temp_key__": 0,
                  "id": 1,
                  "repeatable_simple": [
                    {
                      "__temp_key__": 0,
                      "categories": [],
                      "id": 17,
                      "my_name": null,
                    },
                  ],
                },
              ],
            },
            "publishConfirmation": {
              "draftCount": 0,
              "show": false,
            },
            "shouldCheckErrors": false,
          }
        `);
      });

      it('should create an array for a relational field inside a repeatable component which is inside a regular component', () => {
        const initialValues = {
          categories: 'my_category',
          component: {
            id: 2,
            __temp_key__: 2,
            repeatable_simple: [
              {
                id: 18,
                my_name: null,
                categories: {
                  count: 2,
                },
                __temp_key__: 0,
              },
            ],
          },
        };

        const state = {
          ...initialState,
          formErrors: true,
          initialData: {},
          modifiedData: {},
          modifiedDZName: true,
          shouldCheckErrors: true,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues,
          components: {
            test: {
              attributes: {
                repeatable_simple: {
                  type: 'component',
                  repeatable: true,
                  component: 'test2',
                },
              },
            },
            test2: {
              attributes: {
                my_name: {
                  type: 'string',
                },
                categories: {
                  type: 'relation',
                  relation: 'manyToMany',
                  target: 'api::category.category',
                  inversedBy: 'relation_locales',
                  targetModel: 'api::category.category',
                  relationType: 'manyToMany',
                },
              },
            },
          },
          attributes: {
            categories: {
              type: 'string',
            },
            component: {
              type: 'component',
              repeatble: false,
              component: 'test',
            },
          },
        };

        expect(reducer(state, action)).toMatchInlineSnapshot(`
          {
            "componentsDataStructure": {},
            "contentTypeDataStructure": {},
            "formErrors": {},
            "initialData": {
              "categories": "my_category",
              "component": {
                "__temp_key__": 0,
                "id": 2,
                "repeatable_simple": [
                  {
                    "__temp_key__": 0,
                    "categories": [],
                    "id": 18,
                    "my_name": null,
                  },
                ],
              },
            },
            "modifiedDZName": null,
            "modifiedData": {
              "categories": "my_category",
              "component": {
                "__temp_key__": 0,
                "id": 2,
                "repeatable_simple": [
                  {
                    "__temp_key__": 0,
                    "categories": [],
                    "id": 18,
                    "my_name": null,
                  },
                ],
              },
            },
            "publishConfirmation": {
              "draftCount": 0,
              "show": false,
            },
            "shouldCheckErrors": false,
          }
        `);
      });
    });

    describe('dynamic zones', () => {
      it('should create an array for a relational field', () => {
        const state = {
          ...initialState,
          formErrors: true,
          initialData: {},
          modifiedData: {},
          modifiedDZName: true,
          shouldCheckErrors: true,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues: {
            ok: true,
            dynamic_relations: [
              {
                __component: 'basic.simple',
                id: 36,
                my_name: null,
                categories: {
                  count: 1,
                },
              },
            ],
          },
          components: {
            'basic.simple': {
              attributes: {
                my_name: {
                  type: 'string',
                },
                categories: {
                  type: 'relation',
                  relation: 'manyToMany',
                  target: 'api::category.category',
                  inversedBy: 'relation_locales',
                  targetModel: 'api::category.category',
                  relationType: 'manyToMany',
                },
              },
            },
          },
          attributes: {
            ok: {
              type: 'boolean',
            },
            dynamic_relations: {
              type: 'dynamiczone',
              components: ['basic.simple'],
            },
          },
        };

        expect(reducer(state, action)).toMatchInlineSnapshot(`
          {
            "componentsDataStructure": {},
            "contentTypeDataStructure": {},
            "formErrors": {},
            "initialData": {
              "dynamic_relations": [
                {
                  "__component": "basic.simple",
                  "__temp_key__": 0,
                  "categories": [],
                  "id": 36,
                  "my_name": null,
                },
              ],
              "ok": true,
            },
            "modifiedDZName": null,
            "modifiedData": {
              "dynamic_relations": [
                {
                  "__component": "basic.simple",
                  "__temp_key__": 0,
                  "categories": [],
                  "id": 36,
                  "my_name": null,
                },
              ],
              "ok": true,
            },
            "publishConfirmation": {
              "draftCount": 0,
              "show": false,
            },
            "shouldCheckErrors": false,
          }
        `);
      });

      it('should create an array for a relational field inside a nested component', () => {
        const state = {
          ...initialState,
          formErrors: true,
          initialData: {},
          modifiedData: {},
          modifiedDZName: true,
          shouldCheckErrors: true,
        };
        const action = {
          type: 'INIT_FORM',
          initialValues: {
            ok: true,
            dynamic_relations: [
              {
                __component: 'basic.nested-simple',
                id: 7,
                simple: {
                  id: 47,
                  my_name: null,
                  categories: {
                    count: 1,
                  },
                },
              },
            ],
          },
          components: {
            'basic.nested-simple': {
              attributes: {
                simple: {
                  type: 'component',
                  component: 'basic.simple',
                },
              },
            },
            'basic.simple': {
              attributes: {
                my_name: {
                  type: 'string',
                },
                categories: {
                  type: 'relation',
                  relation: 'manyToMany',
                  target: 'api::category.category',
                  inversedBy: 'relation_locales',
                  targetModel: 'api::category.category',
                  relationType: 'manyToMany',
                },
              },
            },
          },
          attributes: {
            ok: {
              type: 'boolean',
            },
            dynamic_relations: {
              type: 'dynamiczone',
              components: ['basic.nested-simple'],
            },
          },
        };

        expect(reducer(state, action)).toMatchInlineSnapshot(`
          {
            "componentsDataStructure": {},
            "contentTypeDataStructure": {},
            "formErrors": {},
            "initialData": {
              "dynamic_relations": [
                {
                  "__component": "basic.nested-simple",
                  "__temp_key__": 0,
                  "id": 7,
                  "simple": {
                    "__temp_key__": 0,
                    "categories": [],
                    "id": 47,
                    "my_name": null,
                  },
                },
              ],
              "ok": true,
            },
            "modifiedDZName": null,
            "modifiedData": {
              "dynamic_relations": [
                {
                  "__component": "basic.nested-simple",
                  "__temp_key__": 0,
                  "id": 7,
                  "simple": {
                    "__temp_key__": 0,
                    "categories": [],
                    "id": 47,
                    "my_name": null,
                  },
                },
              ],
              "ok": true,
            },
            "publishConfirmation": {
              "draftCount": 0,
              "show": false,
            },
            "shouldCheckErrors": false,
          }
        `);
      });

      it('should create an array for a relational field inside a repeatable field', () => {
        const state = {
          ...initialState,
          formErrors: true,
          initialData: {},
          modifiedData: {},
          modifiedDZName: true,
          shouldCheckErrors: true,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues: {
            ok: true,
            dynamic_relations: [
              {
                __component: 'basic.repeatable-repeatble-relation',
                id: 5,
                __temp_key__: 0,
                repeatable_simple: [
                  {
                    id: 48,
                    my_name: null,
                    categories: {
                      count: 1,
                    },
                    __temp_key__: 0,
                  },
                  {
                    id: 49,
                    my_name: null,
                    categories: {
                      count: 1,
                    },
                    __temp_key__: 1,
                  },
                ],
              },
            ],
          },
          components: {
            'basic.repeatable-repeatble-relation': {
              attributes: {
                repeatable_simple: {
                  type: 'component',
                  component: 'basic.simple',
                  repeatable: true,
                },
              },
            },
            'basic.simple': {
              attributes: {
                my_name: {
                  type: 'string',
                },
                categories: {
                  type: 'relation',
                  relation: 'manyToMany',
                  target: 'api::category.category',
                  inversedBy: 'relation_locales',
                  targetModel: 'api::category.category',
                  relationType: 'manyToMany',
                },
              },
            },
          },
          attributes: {
            ok: {
              type: 'boolean',
            },
            dynamic_relations: {
              type: 'dynamiczone',
              components: ['basic.repeatable-repeatble-relation'],
            },
          },
        };

        expect(reducer(state, action)).toMatchInlineSnapshot(`
          {
            "componentsDataStructure": {},
            "contentTypeDataStructure": {},
            "formErrors": {},
            "initialData": {
              "dynamic_relations": [
                {
                  "__component": "basic.repeatable-repeatble-relation",
                  "__temp_key__": 0,
                  "id": 5,
                  "repeatable_simple": [
                    {
                      "__temp_key__": 0,
                      "categories": [],
                      "id": 48,
                      "my_name": null,
                    },
                    {
                      "__temp_key__": 1,
                      "categories": [],
                      "id": 49,
                      "my_name": null,
                    },
                  ],
                },
              ],
              "ok": true,
            },
            "modifiedDZName": null,
            "modifiedData": {
              "dynamic_relations": [
                {
                  "__component": "basic.repeatable-repeatble-relation",
                  "__temp_key__": 0,
                  "id": 5,
                  "repeatable_simple": [
                    {
                      "__temp_key__": 0,
                      "categories": [],
                      "id": 48,
                      "my_name": null,
                    },
                    {
                      "__temp_key__": 1,
                      "categories": [],
                      "id": 49,
                      "my_name": null,
                    },
                  ],
                },
              ],
              "ok": true,
            },
            "publishConfirmation": {
              "draftCount": 0,
              "show": false,
            },
            "shouldCheckErrors": false,
          }
        `);
      });

      it('should assign __temp_key__ to components when not in initialData', () => {
        const state = {
          ...initialState,
          formErrors: true,
          initialData: {},
          modifiedData: {},
          modifiedDZName: true,
          shouldCheckErrors: true,
        };
        const action = {
          type: 'INIT_FORM',
          initialValues: {
            ok: true,
            dynamic_relations: [
              {
                __component: 'basic.repeatable-repeatble-relation',
                id: 5,
                repeatable_simple: [
                  {
                    id: 48,
                    my_name: null,
                    categories: {
                      count: 0,
                    },
                  },
                  {
                    id: 49,
                    my_name: null,
                    categories: {
                      count: 0,
                    },
                  },
                ],
              },
              {
                __component: 'basic.repeatable-repeatble-relation',
                id: 6,
                repeatable_simple: [
                  {
                    id: 48,
                    my_name: null,
                    categories: {
                      count: 0,
                    },
                  },
                  {
                    id: 49,
                    my_name: null,
                    categories: {
                      count: 0,
                    },
                  },
                ],
              },
            ],
          },
          components: {
            'basic.repeatable-repeatble-relation': {
              attributes: {
                repeatable_simple: {
                  type: 'component',
                  component: 'basic.simple',
                  repeatable: true,
                },
              },
            },
            'basic.simple': {
              attributes: {
                my_name: {
                  type: 'string',
                },
                categories: {
                  type: 'relation',
                },
              },
            },
          },
          attributes: {
            ok: {
              type: 'boolean',
            },
            dynamic_relations: {
              type: 'dynamiczone',
              components: ['basic.repeatable-repeatble-relation'],
            },
          },
        };

        expect(reducer(state, action)).toMatchInlineSnapshot(`
          {
            "componentsDataStructure": {},
            "contentTypeDataStructure": {},
            "formErrors": {},
            "initialData": {
              "dynamic_relations": [
                {
                  "__component": "basic.repeatable-repeatble-relation",
                  "__temp_key__": 0,
                  "id": 5,
                  "repeatable_simple": [
                    {
                      "categories": [],
                      "id": 48,
                      "my_name": null,
                    },
                    {
                      "categories": [],
                      "id": 49,
                      "my_name": null,
                    },
                  ],
                },
                {
                  "__component": "basic.repeatable-repeatble-relation",
                  "__temp_key__": 1,
                  "id": 6,
                  "repeatable_simple": [
                    {
                      "categories": [],
                      "id": 48,
                      "my_name": null,
                    },
                    {
                      "categories": [],
                      "id": 49,
                      "my_name": null,
                    },
                  ],
                },
              ],
              "ok": true,
            },
            "modifiedDZName": null,
            "modifiedData": {
              "dynamic_relations": [
                {
                  "__component": "basic.repeatable-repeatble-relation",
                  "__temp_key__": 0,
                  "id": 5,
                  "repeatable_simple": [
                    {
                      "categories": [],
                      "id": 48,
                      "my_name": null,
                    },
                    {
                      "categories": [],
                      "id": 49,
                      "my_name": null,
                    },
                  ],
                },
                {
                  "__component": "basic.repeatable-repeatble-relation",
                  "__temp_key__": 1,
                  "id": 6,
                  "repeatable_simple": [
                    {
                      "categories": [],
                      "id": 48,
                      "my_name": null,
                    },
                    {
                      "categories": [],
                      "id": 49,
                      "my_name": null,
                    },
                  ],
                },
              ],
              "ok": true,
            },
            "publishConfirmation": {
              "draftCount": 0,
              "show": false,
            },
            "shouldCheckErrors": false,
          }
        `);
      });
    });

    it('should merge modifiedData with relation containing fields if the modifiedData exists', () => {
      const state = {
        ...initialState,
        formErrors: true,
        initialData: {},
        modifiedData: {
          relation: [
            {
              id: 1,
            },
          ],
          componentWithRelation: {
            relation: [
              {
                id: 1,
              },
              {
                id: 2,
              },
            ],
          },
        },
        modifiedDZName: true,
        shouldCheckErrors: true,
      };

      const action = {
        type: 'INIT_FORM',
        initialValues: {
          ok: true,
          relation: { count: 10 },
          componentWithRelation: {
            id: 1,
            relation: {
              count: 10,
            },
          },
        },
        components: {
          test: {
            attributes: {
              id: {
                type: 'number',
              },
              relation: {
                type: 'relation',
              },
            },
          },
        },
        attributes: {
          ok: {
            type: 'boolean',
          },
          relation: {
            type: 'relation',
          },
          componentWithRelation: {
            type: 'component',
            component: 'test',
          },
        },
      };

      const newState = reducer(state, action);

      expect(newState.modifiedData.relation[0]).toEqual({
        id: 1,
      });

      expect(newState.modifiedData.componentWithRelation).toEqual({
        __temp_key__: 0,
        id: 1,
        relation: expect.arrayContaining([{ id: expect.any(Number) }]),
      });

      expect(newState.modifiedData).toMatchInlineSnapshot(`
        {
          "componentWithRelation": {
            "__temp_key__": 0,
            "id": 1,
            "relation": [
              {
                "id": 1,
              },
              {
                "id": 2,
              },
            ],
          },
          "ok": true,
          "relation": [
            {
              "id": 1,
            },
          ],
        }
      `);
    });
  });

  describe('MOVE_COMPONENT_FIELD', () => {
    it('should move a component correctly', () => {
      const state = {
        ...initialState,
        modifiedData: {
          name: 'name',
          test: {
            component_field: [
              { name: 'first', __temp_key__: 0 },
              { name: 'second', __temp_key__: 2 },
              { name: 'third', __temp_key__: 5 },
              { name: 'fourth', __temp_key__: 1 },
            ],
          },
        },
      };

      const action = {
        type: 'MOVE_COMPONENT_FIELD',
        newIndex: 1,
        oldIndex: 3,
        keys: ['test', 'component_field'],
      };

      const expected = {
        ...initialState,
        modifiedData: {
          name: 'name',
          test: {
            component_field: [
              { name: 'first', __temp_key__: 0 },
              { name: 'fourth', __temp_key__: 1 },
              { name: 'second', __temp_key__: 2 },
              { name: 'third', __temp_key__: 5 },
            ],
          },
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('MOVE_COMPONENT_UP', () => {
    it('should not change the shouldCheckError state when the action does not specify so', () => {
      const state = {
        ...initialState,
        modifiedData: {
          dz: ['first', 'second', 'third'],
        },
      };

      const action = {
        type: 'MOVE_COMPONENT_UP',
        currentIndex: 1,
        dynamicZoneName: 'dz',
        shouldCheckErrors: false,
      };

      const expected = {
        ...initialState,
        modifiedData: {
          dz: ['second', 'first', 'third'],
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should not change the shouldCheckError state when the action does specify so', () => {
      const state = {
        ...initialState,
        modifiedData: {
          dz: ['first', 'second', 'third'],
        },
      };

      const action = {
        type: 'MOVE_COMPONENT_UP',
        currentIndex: 1,
        dynamicZoneName: 'dz',
        shouldCheckErrors: true,
      };

      const expected = {
        ...initialState,
        modifiedData: {
          dz: ['second', 'first', 'third'],
        },
        shouldCheckErrors: true,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('MOVE_COMPONENT_DOWN', () => {
    it('should not change the shouldCheckError state when the action does not specify so', () => {
      const state = {
        ...initialState,
        modifiedData: {
          dz: ['first', 'second', 'third'],
        },
      };

      const action = {
        type: 'MOVE_COMPONENT_DOWN',
        currentIndex: 1,
        dynamicZoneName: 'dz',
        shouldCheckErrors: false,
      };

      const expected = {
        ...initialState,
        modifiedData: {
          dz: ['first', 'third', 'second'],
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should not change the shouldCheckError state when the action does specify so', () => {
      const state = {
        ...initialState,
        modifiedData: {
          dz: ['first', 'second', 'third'],
        },
      };

      const action = {
        type: 'MOVE_COMPONENT_DOWN',
        currentIndex: 1,
        dynamicZoneName: 'dz',
        shouldCheckErrors: true,
      };

      const expected = {
        ...initialState,
        modifiedData: {
          dz: ['first', 'third', 'second'],
        },
        shouldCheckErrors: true,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('MOVE_FIELD', () => {
    it('should move a relation correctly', () => {
      const state = {
        ...initialState,
        modifiedData: {
          test: {
            relationA: ['one', 'two', 'three', 'four'],
            relationB: ['one', 'two', 'three', 'four'],
          },
        },
      };

      const action = {
        type: 'MOVE_FIELD',
        dragIndex: 1,
        keys: ['test', 'relationB'],
        overIndex: 3,
      };

      const expected = {
        ...initialState,
        modifiedData: {
          test: {
            relationA: ['one', 'two', 'three', 'four'],
            relationB: ['one', 'three', 'four', 'two'],
          },
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE', () => {
    it('should set the modifiedData correctly', () => {
      const state = {
        ...initialState,
        modifiedData: {},
      };

      const action = {
        keys: ['name'],
        shouldSetInitialValue: false,
        type: 'ON_CHANGE',
        value: 'soup',
      };

      const expected = {
        ...initialState,
        modifiedData: { name: 'soup' },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    // NOT sure this is needed
    it('should set the modifiedData correctly for a component', () => {
      const state = {
        ...initialState,
        modifiedData: {},
      };

      const action = {
        keys: ['compo', 'name'],
        shouldSetInitialValue: false,
        type: 'ON_CHANGE',
        value: 'soup',
      };

      const expected = {
        ...initialState,
        modifiedData: { compo: { name: 'soup' } },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should set the modifiedData and the initialData correctly for the uid type', () => {
      const state = {
        ...initialState,
        initialData: {},
        modifiedData: {},
      };

      const action = {
        keys: ['name'],
        shouldSetInitialValue: true,
        type: 'ON_CHANGE',
        value: 'soup',
      };

      const expected = {
        ...initialState,
        initialData: { name: 'soup' },
        modifiedData: { name: 'soup' },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('REMOVE_COMPONENT_FROM_DYNAMIC_ZONE', () => {
    it('should remove the component from the dz.modifiedData', () => {
      const state = {
        ...initialState,
        modifiedData: {
          dz: ['one', 'two', 'three'],
        },
        shouldCheckErrors: true,
      };

      const action = {
        type: 'REMOVE_COMPONENT_FROM_DYNAMIC_ZONE',
        dynamicZoneName: 'dz',
        index: 1,
        shouldCheckErrors: false,
      };

      const expected = {
        ...initialState,
        modifiedData: {
          dz: ['one', 'three'],
        },
        shouldCheckErrors: true,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should remove the component from the dz.modifiedData and change the shouldCheckError state when the action specifies so', () => {
      const state = {
        ...initialState,
        modifiedData: {
          dz: ['one', 'two', 'three'],
        },
        shouldCheckErrors: true,
      };

      const action = {
        type: 'REMOVE_COMPONENT_FROM_DYNAMIC_ZONE',
        dynamicZoneName: 'dz',
        index: 1,
        shouldCheckErrors: true,
      };

      const expected = {
        ...initialState,
        modifiedData: {
          dz: ['one', 'three'],
        },
        shouldCheckErrors: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('REMOVE_COMPONENT_FROM_FIELD', () => {
    it('should remove a component correctly', () => {
      const state = {
        ...initialState,
        modifiedData: {
          name: 'test',
          compo: {
            subCompo: { name: 'test' },
          },
        },
      };

      const action = {
        type: 'REMOVE_COMPONENT_FROM_FIELD',
        keys: ['compo', 'subCompo'],
      };

      const expected = {
        ...initialState,
        modifiedData: {
          name: 'test',
          compo: {
            subCompo: null,
          },
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('REMOVE_PASSWORD_FIELD', () => {
    it('should remove the field correctly', () => {
      const state = {
        ...initialState,
        modifiedData: {
          compo: {
            subCompo: { name: 'test', pwd: '123' },
          },
        },
      };

      const action = {
        type: 'REMOVE_PASSWORD_FIELD',
        keys: ['compo', 'subCompo', 'pwd'],
      };

      const expected = {
        ...initialState,
        modifiedData: {
          compo: {
            subCompo: { name: 'test' },
          },
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('REMOVE_REPEATABLE_FIELD', () => {
    it('should remove a repeatable field and not change the shouldCheckErrors state when the formErrors value is an empty Object', () => {
      const state = {
        ...initialState,
        formErrors: {},
        modifiedData: {
          compo: {
            subCompo: ['one', 'two', 'three'],
          },
        },
        shouldCheckErrors: false,
      };

      const action = {
        type: 'REMOVE_REPEATABLE_FIELD',
        keys: ['compo', 'subCompo', '1'],
      };

      const expected = {
        ...initialState,
        formErrors: {},
        modifiedData: {
          compo: {
            subCompo: ['one', 'three'],
          },
        },
        shouldCheckErrors: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should remove a repeatable field and change the shouldCheckErrors state when the formErrors value is not empty', () => {
      const state = {
        ...initialState,
        formErrors: {
          ok: true,
        },
        modifiedData: {
          compo: {
            subCompo: ['one', 'two', 'three'],
          },
        },
        shouldCheckErrors: false,
      };

      const action = {
        type: 'REMOVE_REPEATABLE_FIELD',
        keys: ['compo', 'subCompo', '1'],
      };

      const expected = {
        ...initialState,
        formErrors: { ok: true },
        modifiedData: {
          compo: {
            subCompo: ['one', 'three'],
          },
        },
        shouldCheckErrors: true,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('REORDER_RELATION', () => {
    it('should move a component correctly', () => {
      const state = {
        ...initialState,
        modifiedData: {
          name: 'name',
          field1: {
            field2: {
              relation: [
                { name: 'first', __temp_key__: 'a0' },
                { name: 'second', __temp_key__: 'a1' },
                { name: 'third', __temp_key__: 'a2' },
                { name: 'fourth', __temp_key__: 'a3' },
              ],
            },
          },
        },
      };

      const action = {
        type: 'REORDER_RELATION',
        newIndex: 1,
        oldIndex: 3,
        keys: ['field1', 'field2', 'relation'],
      };

      const expected = {
        ...initialState,
        modifiedData: {
          name: 'name',
          field1: {
            field2: {
              relation: [
                { name: 'first', __temp_key__: 'a0' },
                { name: 'fourth', __temp_key__: 'a0V' },
                { name: 'second', __temp_key__: 'a1' },
                { name: 'third', __temp_key__: 'a2' },
              ],
            },
          },
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should move many components many times and have the correct temp keys', () => {
      const state = {
        ...initialState,
        modifiedData: {
          relation: [
            { name: 'first', __temp_key__: 'a0' },
            { name: 'second', __temp_key__: 'a1' },
            { name: 'third', __temp_key__: 'a2' },
            { name: 'fourth', __temp_key__: 'a3' },
          ],
        },
      };

      const generateAction = (newIndex, oldIndex) => ({
        type: 'REORDER_RELATION',
        newIndex,
        oldIndex,
        keys: ['relation'],
      });

      const generateExpected = (relation = []) => ({
        ...initialState,
        modifiedData: {
          relation,
        },
      });

      const nextState1 = reducer(state, generateAction(1, 3));

      expect(nextState1).toEqual(
        generateExpected([
          { name: 'first', __temp_key__: 'a0' },
          { name: 'fourth', __temp_key__: 'a0V' },
          { name: 'second', __temp_key__: 'a1' },
          { name: 'third', __temp_key__: 'a2' },
        ])
      );

      const nextState2 = reducer(nextState1, generateAction(1, 2));

      expect(nextState2).toEqual(
        generateExpected([
          { name: 'first', __temp_key__: 'a0' },
          { name: 'second', __temp_key__: 'a0G' },
          { name: 'fourth', __temp_key__: 'a0V' },
          { name: 'third', __temp_key__: 'a2' },
        ])
      );

      const nextState3 = reducer(nextState2, generateAction(0, 3));

      expect(nextState3).toEqual(
        generateExpected([
          { name: 'third', __temp_key__: 'Zz' },
          { name: 'first', __temp_key__: 'a0' },
          { name: 'second', __temp_key__: 'a0G' },
          { name: 'fourth', __temp_key__: 'a0V' },
        ])
      );

      const nextState4 = reducer(nextState3, generateAction(3, 1));

      expect(nextState4).toEqual(
        generateExpected([
          { name: 'third', __temp_key__: 'Zz' },
          { name: 'second', __temp_key__: 'a0G' },
          { name: 'fourth', __temp_key__: 'a0V' },
          { name: 'first', __temp_key__: 'a1' },
        ])
      );

      const nextState5 = reducer(nextState4, generateAction(1, 2));

      expect(nextState5).toEqual(
        generateExpected([
          { name: 'third', __temp_key__: 'Zz' },
          { name: 'fourth', __temp_key__: 'a0' },
          { name: 'second', __temp_key__: 'a0G' },
          { name: 'first', __temp_key__: 'a1' },
        ])
      );
    });
  });

  describe('SET_DEFAULT_DATA_STRUCTURES', () => {
    it('should set the componentsDataStructure and the contentTypeDataStructure correctly', () => {
      const state = {
        ...initialState,
        componentsDataStructure: null,
        contentTypeDataStructure: null,
      };

      const action = {
        type: 'SET_DEFAULT_DATA_STRUCTURES',
        componentsDataStructure: { ok: true },
        contentTypeDataStructure: { ok: false },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: { ok: true },
        contentTypeDataStructure: { ok: false },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SET_FORM_ERRORS', () => {
    it('should set the formErrors correctly', () => {
      const state = {
        ...initialState,
        modifiedDZName: 'dz',
        formErrors: {},
      };

      const action = {
        type: 'SET_FORM_ERRORS',
        errors: { ok: true },
      };

      const expected = {
        ...initialState,
        modifiedDZName: null,
        formErrors: { ok: true },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SET_PUBLISH_CONFIRMATION', () => {
    it('should set the publish confirmation object', () => {
      const state = {
        ...initialState,
      };

      const action = {
        type: 'SET_PUBLISH_CONFIRMATION',
        publishConfirmation: {
          show: true,
          draftCount: 100,
        },
      };

      const expected = {
        ...initialState,
        publishConfirmation: { ...action.publishConfirmation },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('RESET_PUBLISH_CONFIRMATION', () => {
    it('should reset the publish confirmation object', () => {
      const state = {
        ...initialState,
        publishConfirmation: {
          show: true,
          draftCount: 100,
        },
      };

      const action = {
        type: 'RESET_PUBLISH_CONFIRMATION',
      };

      const expected = {
        ...initialState,
        publishConfirmation: {
          show: false,
          draftCount: state.publishConfirmation.draftCount,
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('TRIGGER_FORM_VALIDATION', () => {
    it('should not change the shouldCheckErrors when the formErrors state is an empty object', () => {
      const state = {
        ...initialState,
        formErrors: {},
        shouldCheckErrors: true,
      };

      const action = {
        type: 'TRIGGER_FORM_VALIDATION',
      };

      const expected = {
        ...initialState,
        formErrors: {},
        shouldCheckErrors: true,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should change the shouldCheckErrors when the formErrors state is not an empty object', () => {
      const state = {
        ...initialState,
        formErrors: { ok: true },
        shouldCheckErrors: true,
      };

      const action = {
        type: 'TRIGGER_FORM_VALIDATION',
      };

      const expected = {
        ...initialState,
        formErrors: { ok: true },
        shouldCheckErrors: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
