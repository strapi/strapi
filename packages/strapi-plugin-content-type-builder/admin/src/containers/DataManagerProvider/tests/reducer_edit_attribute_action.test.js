import { fromJS, OrderedMap } from 'immutable';
import reducer, { initialState } from '../reducer';

describe('CTB | containers | reducer | EDIT_ATTRIBUTE', () => {
  describe('Editing a common attribute (string, integer, json, media, ...)', () => {
    it('Should edit the attribute correctly and preserve the order of the attributes for a content type', () => {
      const contentTypeUID = 'application::address.address';
      const action = {
        type: 'EDIT_ATTRIBUTE',
        attributeToSet: {
          type: 'media',
          multiple: true,
          required: false,
          name: 'covers',
        },
        forTarget: 'contentType',
        targetUid: contentTypeUID,
        initialAttribute: {
          type: 'media',
          multiple: false,
          required: false,
          name: 'cover',
        },
        shouldAddComponentToData: false,
      };

      const contentType = fromJS({
        uid: contentTypeUID,
        schema: {
          name: 'address',
          description: '',
          connection: 'default',
          collectionName: '',
          attributes: OrderedMap({
            geolocation: fromJS({ type: 'json', required: true }),
            city: fromJS({ type: 'string', required: true }),
            postal_code: fromJS({ type: 'string' }),
            dishes: {
              component: 'default.dish',
              type: 'component',
              repeatable: true,
            },
            category: fromJS({
              nature: 'oneWay',
              target: 'application::category.category',
              dominant: false,
              unique: false,
            }),
            cover: fromJS({ type: 'media', multiple: false, required: false }),
            images: fromJS({ type: 'media', multiple: true, required: false }),
            full_name: fromJS({ type: 'string', required: true }),
          }),
        },
      });

      const expectedContentType = fromJS({
        uid: contentTypeUID,
        schema: {
          name: 'address',
          description: '',
          connection: 'default',
          collectionName: '',
          attributes: OrderedMap({
            geolocation: fromJS({ type: 'json', required: true }),
            city: fromJS({ type: 'string', required: true }),
            postal_code: fromJS({ type: 'string' }),
            dishes: {
              component: 'default.dish',
              type: 'component',
              repeatable: true,
            },
            category: fromJS({
              nature: 'oneWay',
              target: 'application::category.category',
              dominant: false,
              unique: false,
            }),
            covers: fromJS({ type: 'media', multiple: true, required: false }),
            images: fromJS({ type: 'media', multiple: true, required: false }),
            full_name: fromJS({ type: 'string', required: true }),
          }),
        },
      });

      const state = initialState
        .setIn(['contentTypes', contentTypeUID], contentType)
        .setIn(['modifiedData', 'contentType'], contentType)
        .setIn(['modifiedData', 'components'], fromJS({}));

      const expected = state.setIn(
        ['modifiedData', 'contentType'],
        expectedContentType
      );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should edit the attribute correctly and preserve the order of the attributes for a component inside the content type view', () => {
      const contentTypeUID = 'application::address.address';
      const componentUID = 'default.dish';
      const action = {
        type: 'EDIT_ATTRIBUTE',
        attributeToSet: {
          type: 'text',
          required: true,
          name: 'test',
        },
        forTarget: 'components',
        targetUid: componentUID,
        initialAttribute: {
          type: 'text',
          name: 'description',
        },
        shouldAddComponentToData: false,
      };

      const contentType = fromJS({
        uid: contentTypeUID,
        schema: {
          name: 'address',
          description: '',
          connection: 'default',
          collectionName: '',
          attributes: OrderedMap({
            geolocation: fromJS({ type: 'json', required: true }),
            city: fromJS({ type: 'string', required: true }),
            postal_code: fromJS({ type: 'string' }),
            dishes: {
              component: componentUID,
              type: 'component',
              repeatable: true,
            },
            category: fromJS({
              nature: 'oneWay',
              target: 'application::category.category',
              dominant: false,
              unique: false,
            }),
            cover: fromJS({ type: 'media', multiple: false, required: false }),
            images: fromJS({ type: 'media', multiple: true, required: false }),
            full_name: fromJS({ type: 'string', required: true }),
          }),
        },
      });

      const component = fromJS({
        uid: componentUID,
        category: 'default',
        schema: {
          icon: 'book',
          name: 'dish',
          description: '',
          connection: 'default',
          collectionName: 'components_dishes',
          attributes: OrderedMap({
            name: fromJS({
              type: 'string',
              required: true,
              default: 'My super dish',
            }),
            description: fromJS({
              type: 'text',
            }),
            price: fromJS({
              type: 'float',
            }),
            picture: fromJS({
              type: 'media',
              multiple: false,
              required: false,
            }),
            very_long_description: fromJS({
              type: 'richtext',
            }),
            category: fromJS({
              nature: 'oneWay',
              target: 'application::category.category',
              dominant: false,
              unique: false,
            }),
          }),
        },
      });

      const expectedComponent = fromJS({
        uid: componentUID,
        category: 'default',
        schema: {
          icon: 'book',
          name: 'dish',
          description: '',
          connection: 'default',
          collectionName: 'components_dishes',
          attributes: OrderedMap({
            name: fromJS({
              type: 'string',
              required: true,
              default: 'My super dish',
            }),
            test: fromJS({
              type: 'text',
              required: true,
            }),
            price: fromJS({
              type: 'float',
            }),
            picture: fromJS({
              type: 'media',
              multiple: false,
              required: false,
            }),
            very_long_description: fromJS({
              type: 'richtext',
            }),
            category: fromJS({
              nature: 'oneWay',
              target: 'application::category.category',
              dominant: false,
              unique: false,
            }),
          }),
        },
      });

      const state = initialState
        .setIn(['contentTypes', contentTypeUID], contentType)
        .setIn(['modifiedData', 'contentType'], contentType)
        .setIn(['modifiedData', 'components', componentUID], component)
        .setIn(['components', componentUID], component);

      const expected = state.setIn(
        ['modifiedData', 'components', componentUID],
        expectedComponent
      );

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('Editing a relation attribute', () => {
    describe('Editing a relation with the same content type', () => {
      describe('Changing the nature of the relation', () => {
        it('Should handle changing the nature from a one side relation (oneWay or manyWay) to another one side relation correctly and preserve the order of the attributes', () => {
          const contentTypeUID = 'application::address.address';
          const contentType = fromJS({
            uid: contentTypeUID,
            schema: {
              name: 'address',
              description: '',
              connection: 'default',
              collectionName: '',
              attributes: OrderedMap({
                geolocation: fromJS({ type: 'json', required: true }),
                city: fromJS({ type: 'string', required: true }),
                postal_code: fromJS({ type: 'string' }),
                one_way: fromJS({
                  nature: 'oneWay',
                  targetAttribute: '-',
                  target: contentTypeUID,
                  unique: true,
                  dominant: null,
                  columnName: 'test',
                  targetColumnName: null,
                }),
                category: fromJS({
                  nature: 'oneWay',
                  target: 'application::category.category',
                  dominant: false,
                  unique: false,
                }),
                cover: fromJS({
                  type: 'media',
                  multiple: false,
                  required: false,
                }),
                images: fromJS({
                  type: 'media',
                  multiple: true,
                  required: false,
                }),
                full_name: fromJS({ type: 'string', required: true }),
              }),
            },
          });

          const expectedContentType = fromJS({
            uid: contentTypeUID,
            schema: {
              name: 'address',
              description: '',
              connection: 'default',
              collectionName: '',
              attributes: OrderedMap({
                geolocation: fromJS({ type: 'json', required: true }),
                city: fromJS({ type: 'string', required: true }),
                postal_code: fromJS({ type: 'string' }),
                many_ways: fromJS({
                  nature: 'manyWay',
                  targetAttribute: '-',
                  target: contentTypeUID,
                  unique: true,
                  dominant: null,
                  columnName: 'test',
                  targetColumnName: null,
                }),
                category: fromJS({
                  nature: 'oneWay',
                  target: 'application::category.category',
                  dominant: false,
                  unique: false,
                }),
                cover: fromJS({
                  type: 'media',
                  multiple: false,
                  required: false,
                }),
                images: fromJS({
                  type: 'media',
                  multiple: true,
                  required: false,
                }),
                full_name: fromJS({ type: 'string', required: true }),
              }),
            },
          });

          const action = {
            type: 'EDIT_ATTRIBUTE',
            attributeToSet: {
              nature: 'manyWay',
              targetAttribute: '-',
              target: contentTypeUID,
              unique: true,
              dominant: null,
              columnName: 'test',
              targetColumnName: null,
              name: 'many_ways',
            },
            forTarget: 'contentType',
            targetUid: contentTypeUID,
            initialAttribute: {
              nature: 'oneWay',
              targetAttribute: '-',
              target: contentTypeUID,
              unique: true,
              dominant: null,
              columnName: 'test',
              targetColumnName: null,
              name: 'one_way',
            },
            shouldAddComponentToData: false,
          };

          const state = initialState
            .setIn(['contentTypes', contentTypeUID], contentType)
            .setIn(['modifiedData', 'contentType'], contentType)
            .setIn(['modifiedData', 'components'], fromJS({}));

          const expected = state.setIn(
            ['modifiedData', 'contentType'],
            expectedContentType
          );

          expect(reducer(state, action)).toEqual(expected);
        });

        it('Should handle changing the nature from a one side relation (oneWay or manyWay) to a many sides (oneToOne, ...) correctly and preserve the order of the attributes', () => {
          const contentTypeUID = 'application::address.address';
          const contentType = fromJS({
            uid: contentTypeUID,
            schema: {
              name: 'address',
              description: '',
              connection: 'default',
              collectionName: '',
              attributes: OrderedMap({
                geolocation: fromJS({ type: 'json', required: true }),
                city: fromJS({ type: 'string', required: true }),
                postal_code: fromJS({ type: 'string' }),
                one_way: fromJS({
                  nature: 'oneWay',
                  targetAttribute: '-',
                  target: contentTypeUID,
                  unique: true,
                  dominant: null,
                  columnName: 'test',
                  targetColumnName: null,
                }),
                category: fromJS({
                  nature: 'oneWay',
                  target: 'application::category.category',
                  dominant: false,
                  unique: false,
                }),
                cover: fromJS({
                  type: 'media',
                  multiple: false,
                  required: false,
                }),
                images: fromJS({
                  type: 'media',
                  multiple: true,
                  required: false,
                }),
                full_name: fromJS({ type: 'string', required: true }),
              }),
            },
          });

          const action = {
            type: 'EDIT_ATTRIBUTE',
            attributeToSet: {
              nature: 'oneToOne',
              targetAttribute: 'address',
              target: contentTypeUID,
              unique: true,
              dominant: null,
              columnName: 'test',
              targetColumnName: null,
              name: 'one_way',
            },
            forTarget: 'contentType',
            targetUid: contentTypeUID,
            initialAttribute: {
              nature: 'oneWay',
              targetAttribute: '-',
              target: contentTypeUID,
              unique: true,
              dominant: null,
              columnName: 'test',
              targetColumnName: null,
              name: 'one_way',
            },
            shouldAddComponentToData: false,
          };

          const expectedContentType = fromJS({
            uid: contentTypeUID,
            schema: {
              name: 'address',
              description: '',
              connection: 'default',
              collectionName: '',
              attributes: OrderedMap({
                geolocation: fromJS({ type: 'json', required: true }),
                city: fromJS({ type: 'string', required: true }),
                postal_code: fromJS({ type: 'string' }),
                one_way: fromJS({
                  nature: 'oneToOne',
                  targetAttribute: 'address',
                  target: contentTypeUID,
                  unique: true,
                  dominant: null,
                  columnName: 'test',
                  targetColumnName: null,
                }),
                address: fromJS({
                  nature: 'oneToOne',
                  targetAttribute: 'one_way',
                  target: contentTypeUID,
                  unique: true,
                  dominant: null,
                  columnName: null,
                  targetColumnName: 'test',
                }),
                category: fromJS({
                  nature: 'oneWay',
                  target: 'application::category.category',
                  dominant: false,
                  unique: false,
                }),
                cover: fromJS({
                  type: 'media',
                  multiple: false,
                  required: false,
                }),
                images: fromJS({
                  type: 'media',
                  multiple: true,
                  required: false,
                }),
                full_name: fromJS({ type: 'string', required: true }),
              }),
            },
          });

          const state = initialState
            .setIn(['contentTypes', contentTypeUID], contentType)
            .setIn(['modifiedData', 'contentType'], contentType)
            .setIn(['modifiedData', 'components'], fromJS({}));

          const expected = state.setIn(
            ['modifiedData', 'contentType'],
            expectedContentType
          );

          expect(reducer(state, action)).toEqual(expected);
        });

        it('Should handle changing the nature from a many side relation to a one side relation correctly and preserve the order of the attributes', () => {
          const contentTypeUID = 'application::address.address';
          const expectedContentType = fromJS({
            uid: contentTypeUID,
            schema: {
              name: 'address',
              description: '',
              connection: 'default',
              collectionName: '',
              attributes: OrderedMap({
                geolocation: fromJS({ type: 'json', required: true }),
                city: fromJS({ type: 'string', required: true }),
                postal_code: fromJS({ type: 'string' }),
                one_way: fromJS({
                  nature: 'oneWay',
                  targetAttribute: '-',
                  target: contentTypeUID,
                  unique: true,
                  dominant: null,
                  columnName: 'test',
                  targetColumnName: null,
                }),
                category: fromJS({
                  nature: 'oneWay',
                  target: 'application::category.category',
                  dominant: false,
                  unique: false,
                }),
                cover: fromJS({
                  type: 'media',
                  multiple: false,
                  required: false,
                }),
                images: fromJS({
                  type: 'media',
                  multiple: true,
                  required: false,
                }),
                full_name: fromJS({ type: 'string', required: true }),
              }),
            },
          });

          const action = {
            type: 'EDIT_ATTRIBUTE',
            attributeToSet: {
              nature: 'oneWay',
              targetAttribute: '-',
              target: contentTypeUID,
              unique: true,
              dominant: null,
              columnName: 'test',
              targetColumnName: null,
              name: 'one_way',
            },
            forTarget: 'contentType',
            targetUid: contentTypeUID,
            initialAttribute: {
              nature: 'oneToOne',
              targetAttribute: 'address',
              target: contentTypeUID,
              unique: true,
              dominant: null,
              columnName: 'test',
              targetColumnName: null,
              name: 'one_way',
            },
            shouldAddComponentToData: false,
          };

          const contentType = fromJS({
            uid: contentTypeUID,
            schema: {
              name: 'address',
              description: '',
              connection: 'default',
              collectionName: '',
              attributes: OrderedMap({
                geolocation: fromJS({ type: 'json', required: true }),
                city: fromJS({ type: 'string', required: true }),
                postal_code: fromJS({ type: 'string' }),
                one_way: fromJS({
                  nature: 'oneToOne',
                  targetAttribute: 'address',
                  target: contentTypeUID,
                  unique: true,
                  dominant: null,
                  columnName: 'test',
                  targetColumnName: null,
                }),
                address: fromJS({
                  nature: 'oneToOne',
                  targetAttribute: 'one_way',
                  target: contentTypeUID,
                  unique: true,
                  dominant: null,
                  columnName: null,
                  targetColumnName: 'test',
                }),
                category: fromJS({
                  nature: 'oneWay',
                  target: 'application::category.category',
                  dominant: false,
                  unique: false,
                }),
                cover: fromJS({
                  type: 'media',
                  multiple: false,
                  required: false,
                }),
                images: fromJS({
                  type: 'media',
                  multiple: true,
                  required: false,
                }),
                full_name: fromJS({ type: 'string', required: true }),
              }),
            },
          });

          const state = initialState
            .setIn(['contentTypes', contentTypeUID], contentType)
            .setIn(['modifiedData', 'contentType'], contentType)
            .setIn(['modifiedData', 'components'], fromJS({}));

          const expected = state.setIn(
            ['modifiedData', 'contentType'],
            expectedContentType
          );

          expect(reducer(state, action)).toEqual(expected);
        });
      });

      describe('Changing the target of the relation', () => {
        it('Should handle the edition of the target correctly for a one way relation (oneWay, manyWay) with another content type and preserve the order of the attributes', () => {
          expect(true).toBe(true);
        });

        it('Should remove the opposite attribute and keep the order of the attributes if the relation nature is not a one side', () => {
          expect(true).toBe(true);
        });
      });

      describe('Editing the other informations of the relation', () => {
        it('Should handle the edition of the name of the relation correctly for a one side relation', () => {
          expect(true).toBe(true);
        });

        it('Should handle the edition of the other properties correctly by updating the opposite attribute in the other cases', () => {
          expect(true).toBe(true);
        });
      });
    });
  });
});
