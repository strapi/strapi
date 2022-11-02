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
        'basic.repetable-repeatble-relation': {
          uid: 'basic.repetable-repeatble-relation',
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
        componentLayoutData: components['basic.repetable-repeatble-relation'],
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
        'basic.repetable-repeatble-relation': {
          uid: 'basic.repetable-repeatble-relation',
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
          uid: 'basic.repetable-repeatble-relation',
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
          dz: [{ name: 'test', __component: 'blog.simple' }],
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
          dz: [{ name: 'test', __component: 'blog.simple' }],
        },
        modifiedData: {
          name: 'name',
          dz: [{ name: 'test', __component: 'blog.simple' }],
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {
          'blog.simple': { name: 'test' },
        },
        initialData: {
          name: 'name',
          dz: [{ name: 'test', __component: 'blog.simple' }],
        },
        modifiedData: {
          name: 'name',
          dz: [
            { name: 'test', __component: 'blog.simple' },
            { name: 'test', __component: 'blog.simple' },
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
          dz: [{ relation: [], __component: 'blog.relation' }],
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
          relation: [{ id: 1 }],
        },
      };

      const action = {
        type: 'CONNECT_RELATION',
        keys: ['relation'],
        value: { id: 1 },
      };

      expect(reducer(state, action)).toEqual(expected);
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

      let nextState = reducer(state, {
        type: 'LOAD_RELATION',
        keys: ['relation'],
        value: [{ id: 1 }],
      });

      expect(nextState).toStrictEqual({
        ...initialState,
        initialData: {
          relation: [{ id: 1 }],
        },
        modifiedData: {
          relation: [{ id: 1 }],
        },
      });

      expect(
        reducer(nextState, {
          type: 'LOAD_RELATION',
          keys: ['relation'],
          value: [{ id: 2 }],
        })
      ).toStrictEqual({
        ...initialState,
        initialData: {
          relation: [{ id: 2 }, { id: 1 }],
        },
        modifiedData: {
          relation: [{ id: 2 }, { id: 1 }],
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

      let nextState = reducer(state, {
        type: 'LOAD_RELATION',
        keys: ['relation'],
        value: [{ id: 1 }],
      });

      expect(nextState).toStrictEqual({
        ...initialState,
        initialData: {
          relation: [{ id: 1 }],
        },
        modifiedData: {
          relation: [{ id: 1 }],
        },
      });

      expect(
        reducer(nextState, {
          type: 'LOAD_RELATION',
          keys: ['relation'],
          value: [{ id: 1 }],
        })
      ).toStrictEqual({
        ...initialState,
        initialData: {
          relation: [{ id: 1 }],
        },
        modifiedData: {
          relation: [{ id: 1 }],
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
        const expected = {
          ...initialState,
          formErrors: {},
          initialData: { ok: true, relation: [] },
          modifiedData: { ok: true, relation: [] },
          modifiedDZName: null,
          shouldCheckErrors: false,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues: { ok: true, relation: { count: 10 } },
          relationalFieldPaths: ['relation'],
        };

        expect(reducer(state, action)).toEqual(expected);
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
        const expected = {
          ...initialState,
          formErrors: {},
          initialData: {
            ok: true,
            relation: [],
            component: {
              relation: [],
            },
          },
          modifiedData: {
            ok: true,
            relation: [],
            component: {
              relation: [],
            },
          },
          modifiedDZName: null,
          shouldCheckErrors: false,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues: {
            ok: true,
            relation: { count: 10 },
            component: { relation: { count: 10 } },
          },
          relationalFieldPaths: ['relation', 'component.relation'],
          componentPaths: ['component'],
        };

        expect(reducer(state, action)).toEqual(expected);
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
        const expected = {
          ...initialState,
          formErrors: {},
          initialData: {
            ok: true,
            relation: [],
            component: {
              field1: {
                field2: [],
              },
            },
          },
          modifiedData: {
            ok: true,
            relation: [],
            component: {
              field1: {
                field2: [],
              },
            },
          },
          modifiedDZName: null,
          shouldCheckErrors: false,
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
          relationalFieldPaths: ['relation', 'component.field1.field2'],
          componentPaths: ['component', 'component.field1'],
        };

        expect(reducer(state, action)).toEqual(expected);
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

        const expected = {
          ...initialState,
          formErrors: {},
          initialData: {
            categories: 'my_category',
            repeatable_single_component_relation: [
              {
                id: 15,
                my_name: null,
                categories: [],
                __temp_key__: 0,
              },
            ],
          },
          modifiedData: {
            categories: 'my_category',
            repeatable_single_component_relation: [
              {
                id: 15,
                my_name: null,
                categories: [],
                __temp_key__: 0,
              },
            ],
          },
          modifiedDZName: null,
          shouldCheckErrors: false,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues,
          relationalFieldPaths: ['repeatable_single_component_relation.categories'],
          repeatableComponentPaths: ['repeatable_single_component_relation'],
        };

        expect(reducer(state, action)).toEqual(expected);
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

        const expected = {
          ...initialState,
          formErrors: {},
          initialData: {
            categories: 'my_category',
            repeatable_nested_component_relation: [
              {
                id: 2,
                simple: {
                  id: 16,
                  my_name: null,
                  categories: [],
                },
                __temp_key__: 0,
              },
            ],
          },
          modifiedData: {
            categories: 'my_category',
            repeatable_nested_component_relation: [
              {
                id: 2,
                simple: {
                  id: 16,
                  my_name: null,
                  categories: [],
                },
                __temp_key__: 0,
              },
            ],
          },
          modifiedDZName: null,
          shouldCheckErrors: false,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues,
          relationalFieldPaths: ['repeatable_nested_component_relation.simple.categories'],
          repeatableComponentPaths: ['repeatable_nested_component_relation'],
        };

        expect(reducer(state, action)).toEqual(expected);
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

        const expected = {
          ...initialState,
          formErrors: {},
          initialData: {
            categories: 'my_category',
            repeatable_repeatable_nested_component: [
              {
                id: 1,
                repeatable_simple: [
                  {
                    id: 17,
                    my_name: null,
                    categories: [],
                    __temp_key__: 0,
                  },
                ],
                __temp_key__: 0,
              },
            ],
          },
          modifiedData: {
            categories: 'my_category',
            repeatable_repeatable_nested_component: [
              {
                id: 1,
                repeatable_simple: [
                  {
                    id: 17,
                    my_name: null,
                    categories: [],
                    __temp_key__: 0,
                  },
                ],
                __temp_key__: 0,
              },
            ],
          },
          modifiedDZName: null,
          shouldCheckErrors: false,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues,
          relationalFieldPaths: [
            'repeatable_repeatable_nested_component.repeatable_simple.categories',
          ],
          repeatableComponentPaths: ['repeatable_repeatable_nested_component'],
        };

        expect(reducer(state, action)).toEqual(expected);
      });

      it('should create an array for a relational field inside a repeatable component which is inside a regular component', () => {
        const initialValues = {
          categories: 'my_category',
          component: {
            id: 2,
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

        const expected = {
          ...initialState,
          formErrors: {},
          initialData: {
            categories: 'my_category',
            component: {
              id: 2,
              repeatable_simple: [
                {
                  id: 18,
                  my_name: null,
                  categories: [],
                  __temp_key__: 0,
                },
              ],
            },
          },
          modifiedData: {
            categories: 'my_category',
            component: {
              id: 2,
              repeatable_simple: [
                {
                  id: 18,
                  my_name: null,
                  categories: [],
                  __temp_key__: 0,
                },
              ],
            },
          },
          modifiedDZName: null,
          shouldCheckErrors: false,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues,
          relationalFieldPaths: ['component.repeatable_simple.categories'],
          repeatableComponentPaths: ['component.repeatable_simple'],
          componentPaths: ['component'],
        };

        expect(reducer(state, action)).toEqual(expected);
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

        const expected = {
          ...initialState,
          formErrors: {},
          initialData: {
            ok: true,
            dynamic_relations: [
              {
                __component: 'basic.simple',
                id: 36,
                my_name: null,
                categories: [],
              },
            ],
          },
          modifiedData: {
            ok: true,
            dynamic_relations: [
              {
                __component: 'basic.simple',
                id: 36,
                my_name: null,
                categories: [],
              },
            ],
          },
          modifiedDZName: null,
          shouldCheckErrors: false,
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
          relationalFieldPaths: ['dynamic_relations.basic.simple.categories'],
          dynamicZonePaths: ['dynamic_relations'],
        };

        expect(reducer(state, action)).toEqual(expected);
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

        const expected = {
          ...initialState,
          formErrors: {},
          initialData: {
            ok: true,
            dynamic_relations: [
              {
                __component: 'basic.nested-simple',
                id: 7,
                simple: {
                  id: 47,
                  my_name: null,
                  categories: [],
                },
              },
            ],
          },
          modifiedData: {
            ok: true,
            dynamic_relations: [
              {
                __component: 'basic.nested-simple',
                id: 7,
                simple: {
                  id: 47,
                  my_name: null,
                  categories: [],
                },
              },
            ],
          },
          modifiedDZName: null,
          shouldCheckErrors: false,
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
          relationalFieldPaths: ['dynamic_relations.basic.nested-simple.simple.categories'],
          dynamicZonePaths: ['dynamic_relations'],
        };

        expect(reducer(state, action)).toEqual(expected);
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

        const expected = {
          ...initialState,
          formErrors: {},
          initialData: {
            ok: true,
            dynamic_relations: [
              {
                __component: 'basic.repetable-repeatble-relation',
                id: 5,
                repeatable_simple: [
                  {
                    id: 48,
                    my_name: null,
                    categories: [],
                    __temp_key__: 0,
                  },
                  {
                    id: 49,
                    my_name: null,
                    categories: [],
                    __temp_key__: 1,
                  },
                ],
              },
            ],
          },
          modifiedData: {
            ok: true,
            dynamic_relations: [
              {
                __component: 'basic.repetable-repeatble-relation',
                id: 5,
                repeatable_simple: [
                  {
                    id: 48,
                    my_name: null,
                    categories: [],
                    __temp_key__: 0,
                  },
                  {
                    id: 49,
                    my_name: null,
                    categories: [],
                    __temp_key__: 1,
                  },
                ],
              },
            ],
          },
          modifiedDZName: null,
          shouldCheckErrors: false,
        };

        const action = {
          type: 'INIT_FORM',
          initialValues: {
            ok: true,
            dynamic_relations: [
              {
                __component: 'basic.repetable-repeatble-relation',
                id: 5,
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
          relationalFieldPaths: [
            'dynamic_relations.basic.repetable-repeatble-relation.repeatable_simple.categories',
          ],
          dynamicZonePaths: ['dynamic_relations'],
        };

        expect(reducer(state, action)).toEqual(expected);
      });
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
        dragIndex: 3,
        hoverIndex: 1,
        pathToComponent: ['test', 'component_field'],
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
