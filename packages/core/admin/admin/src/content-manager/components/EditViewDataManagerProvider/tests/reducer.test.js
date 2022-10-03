import reducer, { initialState } from '../reducer';

describe('CONTENT MANAGER | COMPONENTS | EditViewDataManagerProvider | reducer', () => {
  describe('ADD_NON_REPEATABLE_COMPONENT_TO_FIELD', () => {
    it('should add component correctly in the modifiedData', () => {
      const state = {
        ...initialState,
        componentsDataStructure: {
          'blog.compo': { name: 'test' },
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
          'blog.compo': { name: 'test' },
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
        componentUid: 'blog.compo',
        keys: ['component_field', 'sub_component'],
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ADD_REPEATABLE_COMPONENT_TO_FIELD', () => {
    it('should add a repeatable field with the correct __temp_key__ to the modifiedData when the leaf is an empty Array', () => {
      const state = {
        ...initialState,
        componentsDataStructure: {
          'blog.compo': { name: 'test' },
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
          'blog.compo': { name: 'test' },
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
        componentUid: 'blog.compo',
        keys: ['component_field'],
        shouldCheckErrors: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add a repeatable field with the correct __temp_key__ to the modifiedData when the leaf is not an empty Array', () => {
      const state = {
        ...initialState,
        componentsDataStructure: {
          'blog.compo': { name: 'test' },
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
          'blog.compo': { name: 'test' },
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
        componentUid: 'blog.compo',
        keys: ['component_field'],
        shouldCheckErrors: true,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add a repeatable field to the modifiedData when the leaf is not defined', () => {
      const state = {
        ...initialState,
        componentsDataStructure: {
          'blog.compo': { name: 'test' },
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
          'blog.compo': { name: 'test' },
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
        componentUid: 'blog.compo',
        keys: ['component_field'],
        shouldCheckErrors: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ADD_COMPONENT_TO_DYNAMIC_ZONE', () => {
    it('should add a component in a DZ to the modifiedData when the DZ is not defined', () => {
      const state = {
        ...initialState,
        componentsDataStructure: {
          'blog.compo': { name: 'test' },
          'default.test': { ok: true },
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
          'blog.compo': { name: 'test' },
          'default.test': { ok: true },
        },
        initialData: {
          name: 'name',
        },
        modifiedData: {
          name: 'name',
          dz: [{ ok: true, __component: 'default.test' }],
        },
        modifiedDZName: 'dz',
      };

      const action = {
        type: 'ADD_COMPONENT_TO_DYNAMIC_ZONE',
        componentUid: 'default.test',
        keys: ['dz'],
        shouldCheckErrors: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add a component to a DZ to the modifiedData when the DZ is defined', () => {
      const state = {
        ...initialState,
        componentsDataStructure: {
          'blog.compo': { name: 'test' },
          'default.test': { ok: true },
        },
        initialData: {
          name: 'name',
          dz: [{ name: 'test', __component: 'blog.compo' }],
        },
        modifiedData: {
          name: 'name',
          dz: [{ name: 'test', __component: 'blog.compo' }],
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {
          'blog.compo': { name: 'test' },
          'default.test': { ok: true },
        },
        initialData: {
          name: 'name',
          dz: [{ name: 'test', __component: 'blog.compo' }],
        },
        modifiedData: {
          name: 'name',
          dz: [
            { name: 'test', __component: 'blog.compo' },
            { ok: true, __component: 'default.test' },
          ],
        },
        modifiedDZName: 'dz',
        shouldCheckErrors: true,
      };

      const action = {
        type: 'ADD_COMPONENT_TO_DYNAMIC_ZONE',
        componentUid: 'default.test',
        keys: ['dz'],
        shouldCheckErrors: true,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('CONNECT_RELATION', () => {
    it('should create connect array in modifiedData', () => {
      const state = {
        ...initialState,

        initialData: {},
        modifiedData: {
          relation: {},
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {},
        initialData: {},
        modifiedData: {
          relation: {
            connect: [{ id: 1 }],
          },
        },
      };

      const action = {
        type: 'CONNECT_RELATION',
        keys: ['relation'],
        value: { id: 1 },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add a relation in the modifiedData', () => {
      const state = {
        ...initialState,

        initialData: {},
        modifiedData: {
          relation: {
            connect: [],
            disconnect: [],
          },
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {},
        initialData: {},
        modifiedData: {
          relation: {
            connect: [{ id: 1 }],
            disconnect: [],
          },
        },
      };

      const action = {
        type: 'CONNECT_RELATION',
        keys: ['relation'],
        value: { id: 1 },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should remove the relation from disconnect and add the relation to connect', () => {
      const state = {
        ...initialState,

        initialData: {},
        modifiedData: {
          relation: {
            connect: [],
            disconnect: [{ id: 1 }],
          },
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {},
        initialData: {},
        modifiedData: {
          relation: {
            connect: [{ id: 1 }],
            disconnect: [],
          },
        },
      };

      const action = {
        type: 'CONNECT_RELATION',
        keys: ['relation'],
        value: { id: 1 },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should overwrite existing data, when replace is set to true', () => {
      const state = {
        ...initialState,

        initialData: {},
        modifiedData: {
          relation: {
            connect: [],
            disconnect: [],
          },
        },
      };

      const action = {
        type: 'CONNECT_RELATION',
        keys: ['relation'],
        value: { id: 1 },
      };

      let nextState = reducer(state, action);

      expect(nextState).toEqual({
        ...initialState,
        componentsDataStructure: {},
        initialData: {},
        modifiedData: {
          relation: {
            connect: [{ id: 1 }],
            disconnect: [],
          },
        },
      });

      nextState = reducer(nextState, {
        type: 'CONNECT_RELATION',
        keys: ['relation'],
        value: { id: 2 },
        replace: true,
      });

      expect(nextState).toEqual({
        ...initialState,
        componentsDataStructure: {},
        initialData: {},
        modifiedData: {
          relation: {
            connect: [{ id: 2 }],
            disconnect: [],
          },
        },
      });
    });
  });

  describe('LOAD_RELATION', () => {
    it.skip('should add loaded relations to initalData', () => {
      const state = {
        ...initialState,
        initialData: {},
      };

      let nextState = reducer(state, {
        type: 'LOAD_RELATION',
        keys: ['relation'],
        value: [{ id: 1 }],
      });

      expect(nextState).toStrictEqual({
        ...initialState,
        initialData: {
          relation: {
            results: [{ id: 1 }],
          },
        },
        modifiedData: {
          relation: {
            connect: [],
            disconnect: [],
          },
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
          relation: { results: [{ id: 2 }, { id: 1 }] },
        },
        modifiedData: {
          relation: {
            connect: [],
            disconnect: [],
          },
        },
      });
    });
  });

  describe('DISCONNECT_RELATION', () => {
    it('should create disconnect array in modifiedData', () => {
      const state = {
        ...initialState,

        initialData: {},
        modifiedData: {
          relation: {},
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {},
        initialData: {},
        modifiedData: {
          relation: {
            disconnect: [{ id: 1 }],
          },
        },
      };

      const action = {
        type: 'DISCONNECT_RELATION',
        keys: ['relation'],
        value: { id: 1 },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should remove a relation from modifiedData', () => {
      const state = {
        ...initialState,

        initialData: {},
        modifiedData: {
          relation: {
            connect: [],
            disconnect: [],
          },
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {},
        initialData: {},
        modifiedData: {
          relation: {
            connect: [],
            disconnect: [{ id: 1 }],
          },
        },
      };

      const action = {
        type: 'DISCONNECT_RELATION',
        keys: ['relation'],
        value: { id: 1 },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should remove the relation from connect and add it to connect', () => {
      const state = {
        ...initialState,

        initialData: {},
        modifiedData: {
          relation: {
            connect: [{ id: 1 }],
            disconnect: [],
          },
        },
      };

      const expected = {
        ...initialState,
        componentsDataStructure: {},
        initialData: {},
        modifiedData: {
          relation: {
            connect: [],
            disconnect: [{ id: 1 }],
          },
        },
      };

      const action = {
        type: 'DISCONNECT_RELATION',
        keys: ['relation'],
        value: { id: 1 },
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

    it('should take relational fields into account, when setting the state', () => {
      const state = {
        ...initialState,
        formErrors: true,
        initialData: {
          relation: {
            something: true,
          },
        },
        modifiedData: true,
        modifiedDZName: true,
        shouldCheckErrors: true,
      };
      const expected = {
        ...initialState,
        formErrors: {},
        initialData: { ok: true, relation: { something: true, count: 10 } },
        modifiedData: { ok: true, relation: { count: 10 } },
        modifiedDZName: null,
        shouldCheckErrors: false,
      };

      const action = {
        type: 'INIT_FORM',
        initialValues: { ok: true, relation: { count: 10 } },
        relationalFields: ['relation'],
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should reset connect/ disconnect for relational fields', () => {
      const state = {
        ...initialState,
        formErrors: true,
        initialData: {},
        modifiedData: {
          relation: {
            connect: [{ id: 1 }],
            disconnect: [{ id: 2 }],
          },
        },
        modifiedDZName: true,
        shouldCheckErrors: true,
      };
      const expected = {
        ...initialState,
        formErrors: {},
        initialData: { ok: true, relation: { count: 10 } },
        modifiedData: { ok: true, relation: { count: 10 } },
        modifiedDZName: null,
        shouldCheckErrors: false,
      };

      const action = {
        type: 'INIT_FORM',
        initialValues: { ok: true, relation: { count: 10 } },
        relationalFields: ['relation'],
      };

      expect(reducer(state, action)).toEqual(expected);
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
