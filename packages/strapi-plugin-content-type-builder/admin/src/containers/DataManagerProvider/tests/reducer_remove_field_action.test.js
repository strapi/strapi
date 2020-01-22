import { fromJS } from 'immutable';
import reducer, { initialState } from '../reducer';
import testData from './data';

describe('CTB | containers | DataManagerProvider | reducer | REMOVE_FIELD', () => {
  describe('Removing a field that is not a relation', () => {
    it('Should remove the attribute correctly from the content type', () => {
      const contentTypeUID = 'application::address.address';
      const attributeToRemoveName = 'city';
      const action = {
        type: 'REMOVE_FIELD',
        mainDataKey: 'contentType',
        attributeToRemoveName,
        componentUid: '',
      };

      const state = initialState
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(
          ['modifiedData', 'contentType'],
          fromJS(testData.contentTypes[contentTypeUID])
        )
        .setIn(['modifiedData', 'components'], fromJS({}));

      const expected = state.removeIn([
        'modifiedData',
        'contentType',
        'schema',
        'attributes',
        attributeToRemoveName,
      ]);

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('Removing a relation attribute with another content type', () => {
    it('Should remove the attribute correctly if the relation is made with another content type', () => {
      const contentTypeUID = 'application::menusection.menusection';
      const attributeToRemoveName = 'menu';
      const action = {
        type: 'REMOVE_FIELD',
        mainDataKey: 'contentType',
        attributeToRemoveName,
        componentUid: '',
      };

      const state = initialState
        .set('contentTypes', fromJS(testData.contentTypes))
        .set('initialContentTypes', fromJS(testData.contentTypes))
        .setIn(
          ['modifiedData', 'contentType'],
          fromJS(testData.contentTypes[contentTypeUID])
        )
        .setIn(['modifiedData', 'components'], fromJS({}));

      const expected = state.removeIn([
        'modifiedData',
        'contentType',
        'schema',
        'attributes',
        attributeToRemoveName,
      ]);

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('Removing a relation attribute with the same content type', () => {
    it('Should handle the removal of the one side (oneWay or manyWay) nature correctly', () => {
      const contentTypeUID = 'application::dummy.dummy';
      const action = {
        type: 'REMOVE_FIELD',
        mainDataKey: 'contentType',
        attributeToRemoveName: 'one_way_attr',
        componentUid: '',
      };
      const contentType = {
        uid: contentTypeUID,
        schema: {
          name: 'dummy',
          attributes: {
            name: { type: 'string' },
            one_way_attr: {
              nature: 'oneWay',
              targetAttribute: '-',
              target: contentTypeUID,
              unique: false,
              dominant: null,
              columnName: null,
              targetColumnName: null,
            },
            many_way_attrs: {
              nature: 'manyWay',
              targetAttribute: '-',
              target: contentTypeUID,
              unique: false,
              dominant: null,
              columnName: null,
              targetColumnName: null,
            },
            one_to_many_left: {
              nature: 'oneToMany',
              targetAttribute: 'one_to_many_right',
              target: contentTypeUID,
              unique: false,
              dominant: null,
              columnName: null,
              targetColumnName: null,
            },
            one_to_many_right: {
              nature: 'manyToOne',
              target: 'application::dummy.dummy',
              unique: false,
              dominant: null,
              targetAttribute: 'one_to_many_left',
              columnName: null,
              targetColumnName: null,
            },
          },
        },
      };

      const expectedContentType = {
        uid: contentTypeUID,
        schema: {
          name: 'dummy',
          attributes: {
            name: { type: 'string' },
            many_way_attrs: {
              nature: 'manyWay',
              targetAttribute: '-',
              target: contentTypeUID,
              unique: false,
              dominant: null,
              columnName: null,
              targetColumnName: null,
            },
            one_to_many_left: {
              nature: 'oneToMany',
              targetAttribute: 'one_to_many_right',
              target: contentTypeUID,
              unique: false,
              dominant: null,
              columnName: null,
              targetColumnName: null,
            },
            one_to_many_right: {
              nature: 'manyToOne',
              target: 'application::dummy.dummy',
              unique: false,
              dominant: null,
              targetAttribute: 'one_to_many_left',
              columnName: null,
              targetColumnName: null,
            },
          },
        },
      };

      const state = initialState
        .setIn(['contentTypes', contentTypeUID], fromJS(contentType))
        .setIn(['modifiedData', 'contentType'], fromJS(contentType));

      const expected = state.setIn(
        ['modifiedData', 'contentType'],
        fromJS(expectedContentType)
      );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should handle the removal of the two sides (oneToOne, oneToMany, manyToOne, manyToMany) nature correctly', () => {
      const contentTypeUID = 'application::dummy.dummy';
      const action = {
        type: 'REMOVE_FIELD',
        mainDataKey: 'contentType',
        attributeToRemoveName: 'one_to_many_left',
        componentUid: '',
      };
      const contentType = {
        uid: contentTypeUID,
        schema: {
          name: 'dummy',
          attributes: {
            name: { type: 'string' },
            one_way_attr: {
              nature: 'oneWay',
              targetAttribute: '-',
              target: contentTypeUID,
              unique: false,
              dominant: null,
              columnName: null,
              targetColumnName: null,
            },
            many_way_attrs: {
              nature: 'manyWay',
              targetAttribute: '-',
              target: contentTypeUID,
              unique: false,
              dominant: null,
              columnName: null,
              targetColumnName: null,
            },
            one_to_many_left: {
              nature: 'oneToMany',
              targetAttribute: 'one_to_many_right',
              target: contentTypeUID,
              unique: false,
              dominant: null,
              columnName: null,
              targetColumnName: null,
            },
            one_to_many_right: {
              nature: 'manyToOne',
              target: 'application::dummy.dummy',
              unique: false,
              dominant: null,
              targetAttribute: 'one_to_many_left',
              columnName: null,
              targetColumnName: null,
            },
          },
        },
      };

      const expectedContentType = {
        uid: contentTypeUID,
        schema: {
          name: 'dummy',
          attributes: {
            name: { type: 'string' },
            one_way_attr: {
              nature: 'oneWay',
              targetAttribute: '-',
              target: contentTypeUID,
              unique: false,
              dominant: null,
              columnName: null,
              targetColumnName: null,
            },
            many_way_attrs: {
              nature: 'manyWay',
              targetAttribute: '-',
              target: contentTypeUID,
              unique: false,
              dominant: null,
              columnName: null,
              targetColumnName: null,
            },
          },
        },
      };

      const state = initialState
        .setIn(['contentTypes', contentTypeUID], fromJS(contentType))
        .setIn(['modifiedData', 'contentType'], fromJS(contentType));

      const expected = state.setIn(
        ['modifiedData', 'contentType'],
        fromJS(expectedContentType)
      );

      expect(reducer(state, action)).toEqual(expected);
      expect(
        reducer(state, {
          ...action,
          attributeToRemoveName: 'one_to_many_right',
        })
      ).toEqual(expected);
    });
  });
});
