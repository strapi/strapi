import { fromJS } from 'immutable';
import reducer, { initialState } from '../reducer';

describe('CTB | containers | FormModal | reducer | actions', () => {
  describe('ADD_COMPONENTS_TO_DYNAMIC_ZONE', () => {
    it('Should add the components correctly', () => {
      const action = {
        type: 'ADD_COMPONENTS_TO_DYNAMIC_ZONE',
        components: ['default.test', 'default.test2', 'default.test3'],
        shouldAddComponents: true,
        name: 'components',
      };

      const state = initialState.setIn(
        ['modifiedData'],
        fromJS({
          type: 'dynamiczone',
          name: 'dz',
          components: ['default.test'],
        })
      );
      const expected = state.setIn(
        ['modifiedData'],
        fromJS({
          type: 'dynamiczone',
          name: 'dz',
          components: ['default.test', 'default.test2', 'default.test3'],
        })
      );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should remove the components correctly', () => {
      const action = {
        type: 'ADD_COMPONENTS_TO_DYNAMIC_ZONE',
        components: ['default.test2', 'default.test3'],
        shouldAddComponents: false,
        name: 'components',
      };

      const state = initialState.setIn(
        ['modifiedData'],
        fromJS({
          type: 'dynamiczone',
          name: 'dz',
          components: ['default.test', 'default.test2', 'default.test3'],
        })
      );
      const expected = state.setIn(
        ['modifiedData'],
        fromJS({
          type: 'dynamiczone',
          name: 'dz',
          components: ['default.test'],
        })
      );

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE', () => {
    it('Should update the modifiedData object correctly if it is not relation', () => {
      const action = {
        type: 'ON_CHANGE',
        keys: ['name'],
        value: 'test',
      };
      const state = initialState.setIn(['modifiedData', 'type'], 'string');
      const expected = state.setIn(['modifiedData', 'name'], 'test');

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should handle the nature change correctly from oneWay to manyToMany', () => {
      const state = initialState.setIn(
        ['modifiedData'],
        fromJS({
          name: 'category test',
          nature: 'oneWay',
          targetAttribute: '-',
          target: 'application::category.category',
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        })
      );
      const action = {
        type: 'ON_CHANGE',
        keys: ['nature'],
        value: 'manyToMany',
        targetContentType: 'application::category.category',
        oneThatIsCreatingARelationWithAnother: 'address',
      };
      const expected = state
        .setIn(['modifiedData', 'nature'], 'manyToMany')
        .setIn(['modifiedData', 'dominant'], true)
        .setIn(['modifiedData', 'name'], 'category_tests')
        .setIn(['modifiedData', 'targetAttribute'], 'addresses');

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should handle the nature change correctly from manyToMany to oneWay', () => {
      const state = initialState.setIn(
        ['modifiedData'],
        fromJS({
          name: 'category_tests',
          nature: 'manyToMany',
          targetAttribute: 'addresses',
          target: 'application::category.category',
          unique: false,
          dominant: true,
          columnName: null,
          targetColumnName: 'test',
        })
      );
      const action = {
        type: 'ON_CHANGE',
        keys: ['nature'],
        value: 'oneWay',
        targetContentType: 'application::category.category',
        oneThatIsCreatingARelationWithAnother: 'address',
      };
      const expected = state
        .setIn(['modifiedData', 'nature'], 'oneWay')
        .setIn(['modifiedData', 'dominant'], null)
        .setIn(['modifiedData', 'name'], 'category_test')
        .setIn(['modifiedData', 'targetAttribute'], '-')
        .setIn(['modifiedData', 'targetColumnName'], null);

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should handle the nature change correctly from oneToOne to oneToMany', () => {
      const state = initialState.setIn(
        ['modifiedData'],
        fromJS({
          name: 'category_test',
          nature: 'oneToOne',
          targetAttribute: 'address',
          target: 'application::category.category',
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: 'test',
        })
      );
      const action = {
        type: 'ON_CHANGE',
        keys: ['nature'],
        value: 'oneToMany',
        targetContentType: 'application::category.category',
        oneThatIsCreatingARelationWithAnother: 'address',
      };
      const expected = state
        .setIn(['modifiedData', 'nature'], 'oneToMany')
        .setIn(['modifiedData', 'name'], 'category_tests');

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should handle the target change correctly for a one side relation (oneWay, manyWay)', () => {
      const state = initialState.setIn(
        ['modifiedData'],
        fromJS({
          name: 'category test',
          nature: 'oneWay',
          targetAttribute: '-',
          target: 'application::category.category',
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        })
      );
      const action = {
        type: 'ON_CHANGE',
        keys: ['target'],
        value: 'application::address.address',
        oneThatIsCreatingARelationWithAnother: 'address',
        selectedContentTypeFriendlyName: 'address',
      };
      const expected = state
        .setIn(['modifiedData', 'target'], 'application::address.address')
        .setIn(['modifiedData', 'name'], 'address');

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should handle the target change correctly for the manyToMany relation', () => {
      const state = initialState.setIn(
        ['modifiedData'],
        fromJS({
          name: 'categories',
          nature: 'manyToMany',
          targetAttribute: 'addresses',
          target: 'application::category.category',
          unique: false,
          dominant: true,
          columnName: null,
          targetColumnName: null,
        })
      );
      const action = {
        type: 'ON_CHANGE',
        keys: ['target'],
        value: 'application::country.country',
        oneThatIsCreatingARelationWithAnother: 'address',
        selectedContentTypeFriendlyName: 'country',
      };
      const expected = state
        .setIn(['modifiedData', 'target'], 'application::country.country')
        .setIn(['modifiedData', 'name'], 'countries');

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should remove the default value if the type of date input type has been changed', () => {
      const state = initialState.setIn(
        ['modifiedData'],
        fromJS({
          name: 'short_movie_time',
          type: 'time',
          default: '00:30:00',
        })
      );
      const action = {
        type: 'ON_CHANGE',
        keys: ['type'],
        value: 'datetime',
      };
      const expected = state
        .setIn(['modifiedData', 'name'], 'short_movie_time')
        .setIn(['modifiedData', 'type'], 'datetime')
        .removeIn(['modifiedData', 'default']);

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should not remove the default value if the type of another input type has been changed', () => {
      const state = initialState.setIn(
        ['modifiedData'],
        fromJS({
          name: 'number_of_movies',
          type: 'integer',
          default: '0',
        })
      );
      const action = {
        type: 'ON_CHANGE',
        keys: ['type'],
        value: 'biginteger',
      };
      const expected = state
        .setIn(['modifiedData', 'name'], 'number_of_movies')
        .setIn(['modifiedData', 'type'], 'biginteger');

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_ALLOWED_TYPE', () => {
    it('Should add the missing types', () => {
      const state = initialState.setIn(
        ['modifiedData', 'allowedTypes'],
        fromJS(['images', 'videos'])
      );
      const action = {
        name: 'all',
        value: true,
        type: 'ON_CHANGE_ALLOWED_TYPE',
      };
      const expected = state.setIn(
        ['modifiedData', 'allowedTypes'],
        fromJS(['images', 'videos', 'files'])
      );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should remove the missing types', () => {
      const state = initialState.setIn(
        ['modifiedData', 'allowedTypes'],
        fromJS(['images', 'videos', 'files'])
      );
      const action = {
        name: 'all',
        value: false,
        type: 'ON_CHANGE_ALLOWED_TYPE',
      };
      const expected = state.setIn(['modifiedData', 'allowedTypes'], null);

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Shoul add the missing type', () => {
      const state = initialState.setIn(
        ['modifiedData', 'allowedTypes'],
        fromJS(['videos', 'files'])
      );
      const action = {
        name: 'images',
        value: null,
        type: 'ON_CHANGE_ALLOWED_TYPE',
      };
      const expected = state.setIn(
        ['modifiedData', 'allowedTypes'],
        fromJS(['videos', 'files', 'images'])
      );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should remove the type', () => {
      const state = initialState.setIn(
        ['modifiedData', 'allowedTypes'],
        fromJS(['videos', 'images', 'files'])
      );
      const action = {
        name: 'images',
        value: null,
        type: 'ON_CHANGE_ALLOWED_TYPE',
      };
      const expected = state.setIn(['modifiedData', 'allowedTypes'], fromJS(['videos', 'files']));

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should remove set the allowedTypes to null if removing the last type', () => {
      const state = initialState.setIn(['modifiedData', 'allowedTypes'], fromJS(['videos']));
      const action = {
        name: 'videos',
        value: null,
        type: 'ON_CHANGE_ALLOWED_TYPE',
      };
      const expected = state.setIn(['modifiedData', 'allowedTypes'], null);

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('RESET_PROPS', () => {
    it('Should return the initialState', () => {
      const state = initialState.setIn(['modifiedData'], 'test');
      const action = { type: 'RESET_PROPS' };

      expect(reducer(state, action)).toEqual(initialState);
    });
  });

  describe('RESET_PROPS_AND_SET_FORM_FOR_ADDING_AN_EXISTING_COMPO', () => {
    it('Should reset the state and update the modifiedData object with the component field basic schema', () => {
      const action = {
        type: 'RESET_PROPS_AND_SET_FORM_FOR_ADDING_AN_EXISTING_COMPO',
      };
      const state = initialState.setIn(['modifiedData'], 'test');
      const expected = state.setIn(
        ['modifiedData'],
        fromJS({ type: 'component', repeatable: true })
      );

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('RESET_PROPS_AND_SAVE_CURRENT_DATA', () => {
    it('Should reset the state and update the modifiedData and componentToCreate objects correctly', () => {
      const action = { type: 'RESET_PROPS_AND_SAVE_CURRENT_DATA' };

      const state = initialState.setIn(
        ['modifiedData'],
        fromJS({
          type: 'component',
          createComponent: true,
          componentToCreate: {
            type: 'component',
            name: 'compo',
            icon: 'air-freshener',
            category: 'default',
          },
        })
      );

      const expected = initialState
        .set(
          'componentToCreate',
          fromJS({
            type: 'component',
            name: 'compo',
            icon: 'air-freshener',
            category: 'default',
          })
        )
        .set(
          'modifiedData',
          fromJS({
            name: 'compo',
            type: 'component',
            repeatable: false,
            component: 'default.compo',
          })
        )
        .set('isCreatingComponentWhileAddingAField', true);

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('RESET_PROPS_AND_SET_THE_FORM_FOR_ADDING_A_COMPO_TO_A_DZ', () => {
    it('Should reset the state and prepare the form for adding or creating a component to a dynamic zone', () => {
      const action = {
        type: 'RESET_PROPS_AND_SET_THE_FORM_FOR_ADDING_A_COMPO_TO_A_DZ',
      };

      const state = initialState.set('initialData', 'test').set(
        'modifiedData',
        fromJS({
          type: 'dynamiczone',
          components: [],
          name: 'dz',
        })
      );
      const expected = initialState.set(
        'modifiedData',
        fromJS({
          type: 'dynamiczone',
          components: [],
          name: 'dz',
          createComponent: true,
          componentToCreate: fromJS({ type: 'component' }),
        })
      );

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SET_DATA_TO_EDIT', () => {
    it('Should set the state correctly', () => {
      const action = {
        type: 'SET_DATA_TO_EDIT',
        data: {
          test: true,
        },
      };
      const expected = initialState
        .set('modifiedData', fromJS(action.data))
        .set('initialData', fromJS(action.data));

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('SET_ATTRIBUTE_DATA_SCHEMA', () => {
    it('Should handle the edition correcty', () => {
      const expected = initialState
        .setIn(['modifiedData'], fromJS({ test: true }))
        .setIn(['initialData'], fromJS({ test: true }));
      const action = {
        type: 'SET_ATTRIBUTE_DATA_SCHEMA',
        isEditing: true,
        modifiedDataToSetForEditing: {
          test: true,
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('Should set the state correctly for a component in step 1', () => {
      const action = {
        type: 'SET_ATTRIBUTE_DATA_SCHEMA',
        attributeType: 'component',
        nameToSetForRelation: 'address',
        targetUid: 'application::address.address',
        isEditing: false,
        modifiedDataToSetForEditing: { name: null },
        step: '1',
      };
      const expected = initialState.setIn(
        ['modifiedData'],
        fromJS({
          type: 'component',
          createComponent: true,
          componentToCreate: { type: 'component' },
        })
      );

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('Should set the state correctly for a component in step 2', () => {
      const action = {
        type: 'SET_ATTRIBUTE_DATA_SCHEMA',
        attributeType: 'component',
        nameToSetForRelation: 'address',
        targetUid: 'application::address.address',
        isEditing: false,
        modifiedDataToSetForEditing: { name: null },
        step: '2',
      };
      const expected = initialState.setIn(
        ['modifiedData'],
        fromJS({
          type: 'component',
          repeatable: true,
        })
      );

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('Should set the state correctly for a dynamiczone', () => {
      const action = {
        type: 'SET_ATTRIBUTE_DATA_SCHEMA',
        attributeType: 'dynamiczone',
        nameToSetForRelation: 'address',
        targetUid: 'application::address.address',
        isEditing: false,
        modifiedDataToSetForEditing: { name: null },
        step: '2',
      };
      const expected = initialState.setIn(
        ['modifiedData'],
        fromJS({
          type: 'dynamiczone',
          components: [],
        })
      );

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('Should set the state correctly for a text', () => {
      const action = {
        type: 'SET_ATTRIBUTE_DATA_SCHEMA',
        attributeType: 'text',
        nameToSetForRelation: 'address',
        targetUid: 'application::address.address',
        isEditing: false,
        modifiedDataToSetForEditing: { name: null },
        step: null,
      };
      const expected = initialState.setIn(
        ['modifiedData'],
        fromJS({
          type: 'string',
        })
      );

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('Should set the state correctly for a number', () => {
      const action = {
        type: 'SET_ATTRIBUTE_DATA_SCHEMA',
        attributeType: 'number',
        nameToSetForRelation: 'address',
        targetUid: 'application::address.address',
        isEditing: false,
        modifiedDataToSetForEditing: { name: null },
        step: null,
      };
      const expected = initialState.setIn(['modifiedData'], fromJS({}));

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('Should set the state correctly for a date', () => {
      const action = {
        type: 'SET_ATTRIBUTE_DATA_SCHEMA',
        attributeType: 'date',
        nameToSetForRelation: 'address',
        targetUid: 'application::address.address',
        isEditing: false,
        modifiedDataToSetForEditing: { name: null },
        step: null,
      };
      const expected = initialState.setIn(['modifiedData'], fromJS({}));

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('Should set the state correctly for a media', () => {
      const action = {
        type: 'SET_ATTRIBUTE_DATA_SCHEMA',
        attributeType: 'media',
        nameToSetForRelation: 'address',
        targetUid: 'application::address.address',
        isEditing: false,
        modifiedDataToSetForEditing: { name: null },
        step: null,
      };
      const expected = initialState.setIn(
        ['modifiedData'],
        fromJS({ type: 'media', multiple: true, allowedTypes: ['images', 'files', 'videos'] })
      );

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('Should set the state correctly for an enumeration', () => {
      const action = {
        type: 'SET_ATTRIBUTE_DATA_SCHEMA',
        attributeType: 'enumeration',
        nameToSetForRelation: 'address',
        targetUid: 'application::address.address',
        isEditing: false,
        modifiedDataToSetForEditing: { name: null },
        step: null,
      };
      const expected = initialState.setIn(
        ['modifiedData'],
        fromJS({ type: 'enumeration', enum: [] })
      );

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('Should set the state correctly for a relation', () => {
      const action = {
        type: 'SET_ATTRIBUTE_DATA_SCHEMA',
        attributeType: 'relation',
        nameToSetForRelation: 'address test',
        targetUid: 'application::address.address',
        isEditing: false,
        modifiedDataToSetForEditing: { name: null, targetAttribute: '-' },
        step: null,
      };
      const expected = initialState.set(
        'modifiedData',
        fromJS({
          name: 'address_test',
          nature: 'oneWay',
          targetAttribute: '-',
          target: 'application::address.address',
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        })
      );

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('Should set the state correctly for the other cases', () => {
      const action = {
        type: 'SET_ATTRIBUTE_DATA_SCHEMA',
        attributeType: 'json',
        nameToSetForRelation: 'address',
        targetUid: 'application::address.address',
        isEditing: false,
        modifiedDataToSetForEditing: { name: null },
        step: null,
      };
      const expected = initialState.setIn(
        ['modifiedData'],
        fromJS({ type: 'json', default: null })
      );

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('SET_DYNAMIC_ZONE_DATA_SCHEMA', () => {
    it('Should set the dynamic zone schema correctly', () => {
      const action = {
        type: 'SET_DYNAMIC_ZONE_DATA_SCHEMA',
        attributeToEdit: {
          type: 'dynamiczone',
          components: [],
          name: 'dz',
          createComponent: false,
          componentToCreate: { type: 'component' },
        },
      };
      const expected = initialState
        .setIn(['modifiedData'], fromJS(action.attributeToEdit))
        .setIn(['initialData'], fromJS(action.attributeToEdit));

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('SET_ERRORS', () => {
    it('Should set the formErrors object correctly', () => {
      const action = {
        type: 'SET_ERRORS',
        errors: {
          test: 'this is required',
        },
      };
      const expected = initialState.set('formErrors', fromJS(action.errors));

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('Default', () => {
    it('Should return the initialState', () => {
      const action = { type: 'DUMMY' };

      expect(reducer(initialState, action)).toEqual(initialState);
    });
  });
});
