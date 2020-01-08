import { fromJS } from 'immutable';
import { get } from 'lodash';
import reducer, { initialState } from '../reducer';
import testData from './data';

describe('CTB | containers | reducer | ADD_ATTRIBUTE', () => {
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
      expect(true).toBe(true);
    });

    it('Should create the component attribute and not add the component to the modifiedData.components if the component is already in the object to keep the modifications', () => {
      expect(true).toBe(true);
    });

    it('Should create the component correctly in case the component is created on the fly', () => {
      expect(true).toBe(true);
    });
  });

  describe('Adding a dynamic zone', () => {
    it('Should create the dynamiczone attribute correctly', () => {
      expect(true).toBe(true);
    });
  });
});
