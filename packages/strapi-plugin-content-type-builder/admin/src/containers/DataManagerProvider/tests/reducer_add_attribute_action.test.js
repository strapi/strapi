import { fromJS } from 'immutable';
import { get } from 'lodash';
import reducer, { initialState } from '../reducer';
import testData from './data';

describe('CTB | containers | DataManagerProvider | reducer | ADD_ATTRIBUTE', () => {
  describe('Adding a common field that is not a relation', () => {
    it('Should add a text field to a content type correctly', () => {
      const state = initialState.setIn(
        ['modifiedData', 'contentType'],
        fromJS(get(testData, ['contentTypes', 'application::address.address']))
      );
      const action = {
        type: 'ADD_ATTRIBUTE',

        attributeToSet: {
          type: 'string',
          name: 'name',
          default: 'something',
          private: true,
          required: true,
          unique: true,
          maxLength: 3,
          minLength: 1,
        },
        forTarget: 'contentType',
        targetUid: 'application::address.address',
        initialAttribute: {},
        shouldAddComponentToData: false,
      };

      const expected = state.setIn(
        ['modifiedData', 'contentType', 'schema', 'attributes', 'name'],
        fromJS({
          type: 'string',
          default: 'something',
          private: true,
          required: true,
          unique: true,
          maxLength: 3,
          minLength: 1,
        })
      );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should add a integer field to a component that is an attribute of a content type', () => {
      const compoUID = 'default.dish';
      const compoSchema = fromJS(get(testData, ['components', compoUID]));
      const state = initialState
        .setIn(
          ['modifiedData', 'contentType'],
          fromJS(
            get(testData, ['contentTypes', 'application::address.address'])
          ).setIn(
            ['schema', 'attributes', 'compo_field'],
            fromJS({
              type: 'component',
              component: compoUID,
            })
          )
        )
        .setIn(['modifiedData', 'components', compoUID], compoSchema)
        .setIn(['components', compoUID], compoSchema);

      const action = {
        type: 'ADD_ATTRIBUTE',
        attributeToSet: {
          name: 'test',
          type: 'integer',
          default: 2,
          private: true,
          required: true,
          min: null,
        },
        forTarget: 'components',
        targetUid: 'default.dish',
        initialAttribute: {},
        shouldAddComponentToData: false,
      };

      const expected = state.setIn(
        [
          'modifiedData',
          'components',
          compoUID,
          'schema',
          'attributes',
          'test',
        ],
        fromJS({
          type: 'integer',
          default: 2,
          private: true,
          required: true,
          min: null,
        })
      );

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('Adding a component field attribute', () => {
    it('Should create the component attribute and add the component to the modifiedData.components if the component is not in the object', () => {
      const contentTypeUID = 'application::address.address';
      const contentType = get(testData, ['contentTypes', contentTypeUID]);
      const componentToAddUID = 'default.dish';

      const state = initialState
        .set('components', fromJS(testData.components))
        .set('initialComponents', fromJS(testData.components))
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(['modifiedData', 'contentType'], fromJS(contentType))
        .setIn(['modifiedData', 'components'], fromJS({}));

      const action = {
        type: 'ADD_ATTRIBUTE',
        attributeToSet: {
          type: 'component',
          repeatable: true,
          name: 'compoField',
          component: componentToAddUID,
          required: true,
          max: 2,
          min: 1,
        },
        forTarget: 'contentType',
        targetUid: 'application::address.address',
        initialAttribute: {},
        shouldAddComponentToData: true,
      };

      const expected = state
        .setIn(
          ['modifiedData', 'components', componentToAddUID],
          fromJS(testData.components[componentToAddUID])
        )
        .setIn(
          ['modifiedData', 'contentType', 'schema', 'attributes', 'compoField'],
          fromJS({
            type: 'component',
            repeatable: true,

            component: componentToAddUID,
            required: true,
            max: 2,
            min: 1,
          })
        );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should create the component attribute and add the component to the modifiedData.components and its nested components if none of the added components are in the object', () => {
      const contentTypeUID = 'application::address.address';
      const contentType = get(testData, ['contentTypes', contentTypeUID]);
      const componentToAddUID = 'default.closingperiod';

      const state = initialState
        .set('components', fromJS(testData.components))
        .set('initialComponents', fromJS(testData.components))
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(['modifiedData', 'contentType'], fromJS(contentType))
        .setIn(['modifiedData', 'components'], fromJS({}));

      const action = {
        type: 'ADD_ATTRIBUTE',
        attributeToSet: {
          type: 'component',
          repeatable: true,
          name: 'compoField',
          component: componentToAddUID,
          required: true,
          max: 2,
          min: 1,
        },
        forTarget: 'contentType',
        targetUid: 'application::address.address',
        initialAttribute: {},
        shouldAddComponentToData: true,
      };

      const expected = state
        .setIn(
          ['modifiedData', 'components', componentToAddUID],
          fromJS(testData.components[componentToAddUID])
        )
        .setIn(
          ['modifiedData', 'components', 'default.dish'],
          fromJS(testData.components['default.dish'])
        )
        .setIn(
          ['modifiedData', 'contentType', 'schema', 'attributes', 'compoField'],
          fromJS({
            type: 'component',
            repeatable: true,
            component: componentToAddUID,
            required: true,
            max: 2,
            min: 1,
          })
        );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should create the component attribute and add the component to the modifiedData.components and only add the nested components that are not in the modifiedData.components object to keep previous the modifications', () => {
      const contentTypeUID = 'application::address.address';
      const contentType = get(testData, ['contentTypes', contentTypeUID]);
      const componentToAddUID = 'default.closingperiod';

      const state = initialState
        .set('components', fromJS(testData.components))
        .set('initialComponents', fromJS(testData.components))
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(['modifiedData', 'contentType'], fromJS(contentType))
        .setIn(
          ['modifiedData', 'components', 'default.dish'],
          fromJS(testData.components['default.dish'])
        );

      const action = {
        type: 'ADD_ATTRIBUTE',
        attributeToSet: {
          type: 'component',
          repeatable: true,
          name: 'compoField',
          component: componentToAddUID,
          required: true,
          max: 2,
          min: 1,
        },
        forTarget: 'contentType',
        targetUid: contentTypeUID,
        initialAttribute: {},
        shouldAddComponentToData: true,
      };

      const expected = state
        .setIn(
          ['modifiedData', 'components', componentToAddUID],
          fromJS(testData.components[componentToAddUID])
        )

        .setIn(
          ['modifiedData', 'contentType', 'schema', 'attributes', 'compoField'],
          fromJS({
            type: 'component',
            repeatable: true,
            component: componentToAddUID,
            required: true,
            max: 2,
            min: 1,
          })
        );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should create the component correctly in case of creating the component on the fly', () => {
      const componentToCreateUID = 'default.new-compo';
      const componentToCreate = {
        uid: componentToCreateUID,
        isTemporary: true,
        category: 'default',
        schema: {
          name: 'newCompo',
          icon: 'ad',
          attributes: {},
        },
      };
      const contentTypeUID = 'application::address.address';
      const action = {
        type: 'ADD_ATTRIBUTE',
        attributeToSet: {
          name: 'newCompo',
          type: 'component',
          repeatable: false,
          component: componentToCreateUID,
        },
        forTarget: 'contentType',
        targetUid: contentTypeUID,
        initialAttribute: undefined,
        shouldAddComponentToData: false,
      };

      const state = initialState
        .setIn(['components', componentToCreateUID], fromJS(componentToCreate))
        .setIn(
          ['modifiedData', 'components', componentToCreateUID],
          fromJS(componentToCreate)
        )
        .setIn(
          ['modifiedData', 'contentType'],
          fromJS(testData.contentTypes[contentTypeUID])
        );

      const expected = state.setIn(
        ['modifiedData', 'contentType', 'schema', 'attributes', 'newCompo'],
        fromJS({
          type: 'component',
          repeatable: false,
          component: componentToCreateUID,
        })
      );

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('Adding a dynamic zone', () => {
    it('Should create the dynamiczone attribute correctly', () => {
      const contentTypeUID = 'application::address.address';
      const action = {
        type: 'ADD_ATTRIBUTE',
        attributeToSet: {
          type: 'dynamiczone',
          components: [],
          name: 'dz',
        },
        forTarget: 'contentType',
        targetUid: contentTypeUID,
        initialAttribute: {},
        shouldAddComponentToData: false,
      };
      const state = initialState.setIn(
        ['modifiedData', 'contentType'],
        fromJS(testData.contentTypes[contentTypeUID])
      );

      const expected = state.setIn(
        ['modifiedData', 'contentType', 'schema', 'attributes', 'dz'],
        fromJS({
          type: 'dynamiczone',
          components: [],
        })
      );

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('Adding a relation with another content type', () => {
    it('Should add the relation attribute correctly for a content type', () => {
      const contentTypeUID = 'application::address.address';
      const targetContentTypeUID = 'application::category.category';
      const action = {
        type: 'ADD_ATTRIBUTE',
        attributeToSet: {
          name: 'categories',
          nature: 'oneToMany',
          targetAttribute: 'address',
          target: targetContentTypeUID,
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        },
        forTarget: 'contentType',
        targetUid: contentTypeUID,
        initialAttribute: {},
        shouldAddComponentToData: false,
      };

      const state = initialState
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(
          ['modifiedData', 'contentType'],
          fromJS(testData.contentTypes[contentTypeUID])
        )
        .setIn(['modifiedData', 'components'], fromJS({}));

      const expected = state.setIn(
        ['modifiedData', 'contentType', 'schema', 'attributes', 'categories'],
        fromJS({
          nature: 'oneToMany',
          targetAttribute: 'address',
          target: targetContentTypeUID,
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        })
      );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should add the relation attribute correctly for a component', () => {
      const componentUID = 'default.dish';
      const targetContentTypeUID = 'application::category.category';
      const action = {
        type: 'ADD_ATTRIBUTE',
        attributeToSet: {
          name: 'address',
          nature: 'oneWay',
          targetAttribute: '-',
          target: targetContentTypeUID,
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        },
        forTarget: 'component',
        targetUid: componentUID,
        initialAttribute: {},
        shouldAddComponentToData: false,
      };

      const state = initialState
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('components', fromJS(testData.components))
        .set('initialComponents', fromJS(testData.components))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(
          ['modifiedData', 'component'],
          fromJS(testData.components[componentUID])
        )
        .setIn(['modifiedData', 'components'], fromJS({}));

      const expected = state.setIn(
        ['modifiedData', 'component', 'schema', 'attributes', 'address'],
        fromJS({
          nature: 'oneWay',
          targetAttribute: '-',
          target: targetContentTypeUID,
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        })
      );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should add the relation attribute correctly for a component from the modifiedData.components object', () => {
      const componentUID = 'default.dish';
      const targetContentTypeUID = 'application::category.category';
      const action = {
        type: 'ADD_ATTRIBUTE',
        attributeToSet: {
          name: 'address',
          nature: 'oneWay',
          targetAttribute: '-',
          target: targetContentTypeUID,
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        },
        forTarget: 'components',
        targetUid: componentUID,
        initialAttribute: {},
        shouldAddComponentToData: false,
      };

      const state = initialState
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('components', fromJS(testData.components))
        .set('initialComponents', fromJS(testData.components))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(
          ['modifiedData', 'contentType'],
          fromJS(testData.contentTypes[targetContentTypeUID])
        )
        .setIn(
          ['modifiedData', 'components', componentUID],
          fromJS(testData.components[componentUID])
        )
        .setIn(['modifiedData', 'components'], fromJS({}));

      const expected = state.setIn(
        [
          'modifiedData',
          'components',
          componentUID,
          'schema',
          'attributes',
          'address',
        ],
        fromJS({
          nature: 'oneWay',
          targetAttribute: '-',
          target: targetContentTypeUID,
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        })
      );

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('Adding a relation with the same content type', () => {
    it('Should not create an opposite attribute if the relation is oneWay', () => {
      const contentTypeUID = 'application::address.address';
      const action = {
        type: 'ADD_ATTRIBUTE',
        forTarget: 'contentType',
        targetUid: contentTypeUID,
        attributeToSet: {
          name: 'address',
          nature: 'oneWay',
          targetAttribute: '-',
          target: contentTypeUID,
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        },
        shouldAddComponentToData: false,
      };
      const state = initialState
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('components', fromJS(testData.components))
        .set('initialComponents', fromJS(testData.components))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(
          ['modifiedData', 'contentType'],
          fromJS(testData.contentTypes[contentTypeUID])
        );
      const expected = state.setIn(
        ['modifiedData', 'contentType', 'schema', 'attributes', 'address'],
        fromJS({
          nature: 'oneWay',
          targetAttribute: '-',
          target: contentTypeUID,
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        })
      );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should not create an opposite attribute if the relation is manyWay', () => {
      const contentTypeUID = 'application::address.address';
      const action = {
        type: 'ADD_ATTRIBUTE',
        forTarget: 'contentType',
        targetUid: contentTypeUID,
        attributeToSet: {
          name: 'address',
          nature: 'manyWay',
          targetAttribute: '-',
          target: contentTypeUID,
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        },
        shouldAddComponentToData: false,
      };
      const state = initialState
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('components', fromJS(testData.components))
        .set('initialComponents', fromJS(testData.components))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(
          ['modifiedData', 'contentType'],
          fromJS(testData.contentTypes[contentTypeUID])
        );
      const expected = state.setIn(
        ['modifiedData', 'contentType', 'schema', 'attributes', 'address'],
        fromJS({
          nature: 'manyWay',
          targetAttribute: '-',
          target: contentTypeUID,
          unique: false,
          dominant: null,
          columnName: null,
          targetColumnName: null,
        })
      );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should handle the oneToOne relation correctly and create the opposite attribute', () => {
      const contentTypeUID = 'application::address.address';
      const name = 'address_left_side';
      const targetAttribute = 'address_right_side';
      const columnName = 'left_side';
      const targetColumnName = 'right_side';
      const attribute = {
        nature: 'oneToOne',
        targetAttribute,
        target: contentTypeUID,
        unique: false,
        dominant: null,
        columnName,
        targetColumnName,
      };
      const action = {
        type: 'ADD_ATTRIBUTE',
        forTarget: 'contentType',
        targetUid: contentTypeUID,
        attributeToSet: {
          name,
          ...attribute,
        },
        shouldAddComponentToData: false,
      };
      const oppositeAttribute = {
        nature: 'oneToOne',
        target: contentTypeUID,
        unique: false,
        targetAttribute: name,
        dominant: null,
        columnName: targetColumnName,
        targetColumnName: columnName,
      };
      const state = initialState
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('components', fromJS(testData.components))
        .set('initialComponents', fromJS(testData.components))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(
          ['modifiedData', 'contentType'],
          fromJS(testData.contentTypes[contentTypeUID])
        );

      const expected = state
        .setIn(
          ['modifiedData', 'contentType', 'schema', 'attributes', name],
          fromJS(attribute)
        )
        .setIn(
          [
            'modifiedData',
            'contentType',
            'schema',
            'attributes',
            targetAttribute,
          ],
          fromJS(oppositeAttribute)
        );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should handle the oneToMany relation correctly and create the opposite attribute', () => {
      const contentTypeUID = 'application::address.address';
      const name = 'address_left_side';
      const targetAttribute = 'address_right_side';
      const columnName = 'left_side';
      const targetColumnName = 'right_side';
      const attribute = {
        nature: 'oneToMany',
        targetAttribute,
        target: contentTypeUID,
        unique: false,
        dominant: null,
        columnName,
        targetColumnName,
      };
      const action = {
        type: 'ADD_ATTRIBUTE',
        forTarget: 'contentType',
        targetUid: contentTypeUID,
        attributeToSet: {
          name,
          ...attribute,
        },
        shouldAddComponentToData: false,
      };
      const oppositeAttribute = {
        nature: 'manyToOne',
        target: contentTypeUID,
        unique: false,
        targetAttribute: name,
        dominant: null,
        columnName: targetColumnName,
        targetColumnName: columnName,
      };
      const state = initialState
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('components', fromJS(testData.components))
        .set('initialComponents', fromJS(testData.components))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(
          ['modifiedData', 'contentType'],
          fromJS(testData.contentTypes[contentTypeUID])
        );

      const expected = state
        .setIn(
          ['modifiedData', 'contentType', 'schema', 'attributes', name],
          fromJS(attribute)
        )
        .setIn(
          [
            'modifiedData',
            'contentType',
            'schema',
            'attributes',
            targetAttribute,
          ],
          fromJS(oppositeAttribute)
        );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should handle the manyToOne relation correctly and create the opposite attribute', () => {
      const contentTypeUID = 'application::address.address';
      const name = 'address_left_side';
      const targetAttribute = 'address_right_side';
      const columnName = 'left_side';
      const targetColumnName = 'right_side';
      const attribute = {
        nature: 'manyToOne',
        targetAttribute,
        target: contentTypeUID,
        unique: false,
        dominant: null,
        columnName,
        targetColumnName,
      };
      const action = {
        type: 'ADD_ATTRIBUTE',
        forTarget: 'contentType',
        targetUid: contentTypeUID,
        attributeToSet: {
          name,
          ...attribute,
        },
        shouldAddComponentToData: false,
      };
      const oppositeAttribute = {
        nature: 'oneToMany',
        target: contentTypeUID,
        unique: false,
        targetAttribute: name,
        dominant: null,
        columnName: targetColumnName,
        targetColumnName: columnName,
      };
      const state = initialState
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('components', fromJS(testData.components))
        .set('initialComponents', fromJS(testData.components))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(
          ['modifiedData', 'contentType'],
          fromJS(testData.contentTypes[contentTypeUID])
        );

      const expected = state
        .setIn(
          ['modifiedData', 'contentType', 'schema', 'attributes', name],
          fromJS(attribute)
        )
        .setIn(
          [
            'modifiedData',
            'contentType',
            'schema',
            'attributes',
            targetAttribute,
          ],
          fromJS(oppositeAttribute)
        );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should handle the manyToMany relation correctly and create the opposite attribute', () => {
      const contentTypeUID = 'application::address.address';
      const name = 'address_left_side';
      const targetAttribute = 'address_right_side';
      const columnName = 'left_side';
      const targetColumnName = 'right_side';
      const attribute = {
        nature: 'manyToMany',
        targetAttribute,
        target: contentTypeUID,
        unique: false,
        dominant: true,
        columnName,
        targetColumnName,
      };
      const action = {
        type: 'ADD_ATTRIBUTE',
        forTarget: 'contentType',
        targetUid: contentTypeUID,
        attributeToSet: {
          name,
          ...attribute,
        },
        shouldAddComponentToData: false,
      };
      const oppositeAttribute = {
        nature: 'manyToMany',
        target: contentTypeUID,
        unique: false,
        targetAttribute: name,
        dominant: false,
        columnName: targetColumnName,
        targetColumnName: columnName,
      };
      const state = initialState
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('components', fromJS(testData.components))
        .set('initialComponents', fromJS(testData.components))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(
          ['modifiedData', 'contentType'],
          fromJS(testData.contentTypes[contentTypeUID])
        );

      const expected = state
        .setIn(
          ['modifiedData', 'contentType', 'schema', 'attributes', name],
          fromJS(attribute)
        )
        .setIn(
          [
            'modifiedData',
            'contentType',
            'schema',
            'attributes',
            targetAttribute,
          ],
          fromJS(oppositeAttribute)
        );

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
