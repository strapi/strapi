// import { fromJS, OrderedMap } from 'immutable';
// import reducer, { initialState } from '../reducer';
// import { EDIT_ATTRIBUTE } from '../constants';

describe('CTB | components | DataManagerProvider | reducer | EDIT_ATTRIBUTE', () => {
  it('should have unit tests', () => {
    expect(true).toBe(true);
  });

  // describe('Editing a common attribute (string, integer, json, media, ...)', () => {
  //   it('Should edit the attribute correctly and preserve the order of the attributes for a content type', () => {
  //     const contentTypeUID = 'application::address.address';
  //     const action = {
  //       type: EDIT_ATTRIBUTE,
  //       attributeToSet: {
  //         type: 'media',
  //         multiple: true,
  //         required: false,
  //         name: 'covers',
  //       },
  //       forTarget: 'contentType',
  //       targetUid: contentTypeUID,
  //       initialAttribute: {
  //         type: 'media',
  //         multiple: false,
  //         required: false,
  //         name: 'cover',
  //       },
  //       shouldAddComponentToData: false,
  //     };
  //     const contentType = fromJS({
  //       uid: contentTypeUID,
  //       schema: {
  //         name: 'address',
  //         description: '',
  //         connection: 'default',
  //         collectionName: '',
  //         attributes: OrderedMap({
  //           geolocation: fromJS({ type: 'json', required: true }),
  //           city: fromJS({ type: 'string', required: true }),
  //           postal_code: fromJS({ type: 'string' }),
  //           dishes: {
  //             component: 'default.dish',
  //             type: 'component',
  //             repeatable: true,
  //           },
  //           category: fromJS({
  //             relation: 'oneToOne',
  //             target: 'application::category.category',
  //             type: 'relation',
  //           }),
  //           cover: fromJS({ type: 'media', multiple: false, required: false }),
  //           images: fromJS({ type: 'media', multiple: true, required: false }),
  //           full_name: fromJS({ type: 'string', required: true }),
  //         }),
  //       },
  //     });
  //     const expectedContentType = fromJS({
  //       uid: contentTypeUID,
  //       schema: {
  //         name: 'address',
  //         description: '',
  //         connection: 'default',
  //         collectionName: '',
  //         attributes: OrderedMap({
  //           geolocation: fromJS({ type: 'json', required: true }),
  //           city: fromJS({ type: 'string', required: true }),
  //           postal_code: fromJS({ type: 'string' }),
  //           dishes: {
  //             component: 'default.dish',
  //             type: 'component',
  //             repeatable: true,
  //           },
  //           category: fromJS({
  //             relation: 'oneToOne',
  //             target: 'application::category.category',
  //             type: 'relation',
  //           }),
  //           covers: fromJS({ type: 'media', multiple: true, required: false }),
  //           images: fromJS({ type: 'media', multiple: true, required: false }),
  //           full_name: fromJS({ type: 'string', required: true }),
  //         }),
  //       },
  //     });
  //     const state = initialState
  //       .setIn(['contentTypes', contentTypeUID], contentType)
  //       .setIn(['modifiedData', 'contentType'], contentType)
  //       .setIn(['modifiedData', 'components'], fromJS({}));
  //     const expected = state.setIn(['modifiedData', 'contentType'], expectedContentType);
  //     expect(reducer(state, action)).toEqual(expected);
  //   });
  //   it('Should edit the attribute correctly and preserve the order of the attributes for a component inside the content type view', () => {
  //     const contentTypeUID = 'application::address.address';
  //     const componentUID = 'default.dish';
  //     const action = {
  //       type: EDIT_ATTRIBUTE,
  //       attributeToSet: {
  //         type: 'text',
  //         required: true,
  //         name: 'test',
  //       },
  //       forTarget: 'components',
  //       targetUid: componentUID,
  //       initialAttribute: {
  //         type: 'text',
  //         name: 'description',
  //       },
  //       shouldAddComponentToData: false,
  //     };
  //     const contentType = fromJS({
  //       uid: contentTypeUID,
  //       schema: {
  //         name: 'address',
  //         description: '',
  //         connection: 'default',
  //         collectionName: '',
  //         attributes: OrderedMap({
  //           geolocation: fromJS({ type: 'json', required: true }),
  //           city: fromJS({ type: 'string', required: true }),
  //           postal_code: fromJS({ type: 'string' }),
  //           dishes: {
  //             component: componentUID,
  //             type: 'component',
  //             repeatable: true,
  //           },
  //           category: fromJS({
  //             relation: 'oneToOne',
  //             target: 'application::category.category',
  //             type: 'relation',
  //           }),
  //           cover: fromJS({ type: 'media', multiple: false, required: false }),
  //           images: fromJS({ type: 'media', multiple: true, required: false }),
  //           full_name: fromJS({ type: 'string', required: true }),
  //         }),
  //       },
  //     });
  //     const component = fromJS({
  //       uid: componentUID,
  //       category: 'default',
  //       schema: {
  //         icon: 'book',
  //         name: 'dish',
  //         description: '',
  //         connection: 'default',
  //         collectionName: 'components_dishes',
  //         attributes: OrderedMap({
  //           name: fromJS({
  //             type: 'string',
  //             required: true,
  //             default: 'My super dish',
  //           }),
  //           description: fromJS({
  //             type: 'text',
  //           }),
  //           price: fromJS({
  //             type: 'float',
  //           }),
  //           picture: fromJS({
  //             type: 'media',
  //             multiple: false,
  //             required: false,
  //           }),
  //           very_long_description: fromJS({
  //             type: 'richtext',
  //           }),
  //           category: fromJS({
  //             relation: 'oneToOne',
  //             target: 'application::category.category',
  //             type: 'relation',
  //           }),
  //         }),
  //       },
  //     });
  //     const expectedComponent = fromJS({
  //       uid: componentUID,
  //       category: 'default',
  //       schema: {
  //         icon: 'book',
  //         name: 'dish',
  //         description: '',
  //         connection: 'default',
  //         collectionName: 'components_dishes',
  //         attributes: OrderedMap({
  //           name: fromJS({
  //             type: 'string',
  //             required: true,
  //             default: 'My super dish',
  //           }),
  //           test: fromJS({
  //             type: 'text',
  //             required: true,
  //           }),
  //           price: fromJS({
  //             type: 'float',
  //           }),
  //           picture: fromJS({
  //             type: 'media',
  //             multiple: false,
  //             required: false,
  //           }),
  //           very_long_description: fromJS({
  //             type: 'richtext',
  //           }),
  //           category: fromJS({
  //             relation: 'oneToOne',
  //             target: 'application::category.category',
  //             type: 'relation',
  //           }),
  //         }),
  //       },
  //     });
  //     const state = initialState
  //       .setIn(['contentTypes', contentTypeUID], contentType)
  //       .setIn(['modifiedData', 'contentType'], contentType)
  //       .setIn(['modifiedData', 'components', componentUID], component)
  //       .setIn(['components', componentUID], component);
  //     const expected = state.setIn(['modifiedData', 'components', componentUID], expectedComponent);
  //     expect(reducer(state, action)).toEqual(expected);
  //   });
  // });
  // describe('Editing a relation attribute', () => {
  //   describe('Editing a relation with the same content type', () => {
  //     describe('Changing the nature of the relation', () => {
  //       it('Should handle changing the nature from a one side relation (oneWay or manyWay) to another one side relation correctly and preserve the order of the attributes', () => {
  //         const contentTypeUID = 'application::address.address';
  //         const contentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               one_way: fromJS({
  //                 relation: 'oneToOne',
  //                 targetAttribute: null,
  //                 target: contentTypeUID,
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const expectedContentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               many_ways: fromJS({
  //                 relation: 'oneToMany',
  //                 target: contentTypeUID,
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const action = {
  //           type: EDIT_ATTRIBUTE,
  //           attributeToSet: {
  //             relation: 'oneToMany',
  //             targetAttribute: null,
  //             target: contentTypeUID,
  //             type: 'relation',
  //             name: 'many_ways',
  //           },
  //           forTarget: 'contentType',
  //           targetUid: contentTypeUID,
  //           initialAttribute: {
  //             relation: 'oneToOne',
  //             targetAttribute: null,
  //             target: contentTypeUID,
  //             name: 'one_way',
  //           },
  //           shouldAddComponentToData: false,
  //         };
  //         const state = initialState
  //           .setIn(['contentTypes', contentTypeUID], contentType)
  //           .setIn(['modifiedData', 'contentType'], contentType)
  //           .setIn(['modifiedData', 'components'], fromJS({}));
  //         const expected = state.setIn(['modifiedData', 'contentType'], expectedContentType);
  //         expect(reducer(state, action)).toEqual(expected);
  //       });
  //       it('Should handle changing the nature from a one side relation (oneWay or manyWay) to a many sides (oneToOne, ...) correctly and preserve the order of the attributes', () => {
  //         const contentTypeUID = 'application::address.address';
  //         const contentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               one_way: fromJS({
  //                 relation: 'oneToOne',
  //                 target: contentTypeUID,
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const action = {
  //           type: EDIT_ATTRIBUTE,
  //           attributeToSet: {
  //             relation: 'oneToOne',
  //             targetAttribute: 'address',
  //             target: contentTypeUID,
  //             type: 'relation',
  //             name: 'one_way',
  //           },
  //           forTarget: 'contentType',
  //           targetUid: contentTypeUID,
  //           initialAttribute: {
  //             relation: 'oneToOne',
  //             targetAttribute: null,
  //             target: contentTypeUID,
  //             type: 'relation',
  //             name: 'one_way',
  //           },
  //           shouldAddComponentToData: false,
  //         };
  //         const expectedContentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               one_way: fromJS({
  //                 relation: 'oneToOne',
  //                 target: contentTypeUID,
  //                 targetAttribute: 'address',
  //                 type: 'relation',
  //               }),
  //               address: fromJS({
  //                 relation: 'oneToOne',
  //                 target: contentTypeUID,
  //                 targetAttribute: 'one_way',
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const state = initialState
  //           .setIn(['contentTypes', contentTypeUID], contentType)
  //           .setIn(['modifiedData', 'contentType'], contentType)
  //           .setIn(['modifiedData', 'components'], fromJS({}));
  //         const expected = state.setIn(['modifiedData', 'contentType'], expectedContentType);
  //         expect(reducer(state, action)).toEqual(expected);
  //       });
  //       it('Should handle changing the nature from a many side relation to a one side relation correctly and preserve the order of the attributes', () => {
  //         const contentTypeUID = 'application::address.address';
  //         const expectedContentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               one_way: fromJS({
  //                 relation: 'oneToOne',
  //                 target: contentTypeUID,
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const action = {
  //           type: EDIT_ATTRIBUTE,
  //           attributeToSet: {
  //             relation: 'oneToOne',
  //             targetAttribute: null,
  //             target: contentTypeUID,
  //             type: 'relation',
  //             name: 'one_way',
  //           },
  //           forTarget: 'contentType',
  //           targetUid: contentTypeUID,
  //           initialAttribute: {
  //             relation: 'oneToOne',
  //             target: contentTypeUID,
  //             targetAttribute: 'address',
  //             type: 'relation',
  //             name: 'one_way',
  //           },
  //           shouldAddComponentToData: false,
  //         };
  //         const contentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               one_way: fromJS({
  //                 relation: 'oneToOne',
  //                 targetAttribute: 'address',
  //                 target: contentTypeUID,
  //                 type: 'relation',
  //               }),
  //               address: fromJS({
  //                 relation: 'oneToOne',
  //                 target: contentTypeUID,
  //                 targetAttribute: 'one_way',
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const state = initialState
  //           .setIn(['contentTypes', contentTypeUID], contentType)
  //           .setIn(['modifiedData', 'contentType'], contentType)
  //           .setIn(['modifiedData', 'components'], fromJS({}));
  //         const expected = state.setIn(['modifiedData', 'contentType'], expectedContentType);
  //         expect(reducer(state, action)).toEqual(expected);
  //       });
  //     });
  //     describe('Changing the target of the relation', () => {
  //       it('Should handle the edition of the target correctly for a one way relation (oneWay, manyWay) with another content type and preserve the order of the attributes', () => {
  //         const contentTypeUID = 'application::address.address';
  //         const updatedTargetUID = 'application::category.category';
  //         const contentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               address: fromJS({
  //                 relation: 'oneToOne',
  //                 targetAttribute: null,
  //                 target: contentTypeUID,
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const action = {
  //           type: EDIT_ATTRIBUTE,
  //           attributeToSet: {
  //             relation: 'oneToOne',
  //             targetAttribute: null,
  //             target: updatedTargetUID,
  //             type: 'relation',
  //             name: 'one_way',
  //           },
  //           forTarget: 'contentType',
  //           targetUid: contentTypeUID,
  //           initialAttribute: {
  //             relation: 'oneToOne',
  //             targetAttribute: null,
  //             target: contentTypeUID,
  //             type: 'relation',
  //             name: 'address',
  //           },
  //           shouldAddComponentToData: false,
  //         };
  //         const expectedContentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               one_way: fromJS({
  //                 relation: 'oneToOne',
  //                 targetAttribute: null,
  //                 target: updatedTargetUID,
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const state = initialState
  //           .setIn(['contentTypes', contentTypeUID], contentType)
  //           .setIn(['modifiedData', 'contentType'], contentType)
  //           .setIn(['modifiedData', 'components'], fromJS({}));
  //         const expected = state.setIn(['modifiedData', 'contentType'], expectedContentType);
  //         expect(reducer(state, action)).toEqual(expected);
  //       });
  //       it('Should remove the opposite attribute and keep the order of the attributes if the relation nature is not a one side', () => {
  //         const contentTypeUID = 'application::address.address';
  //         const updatedTargetUID = 'application::category.category';
  //         const contentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               many_to_many_left: fromJS({
  //                 relation: 'manyToMany',
  //                 targetAttribute: 'many_to_many_right',
  //                 target: contentTypeUID,
  //                 type: 'relation',
  //               }),
  //               many_to_many_right: fromJS({
  //                 relation: 'manyToMany',
  //                 targetAttribute: 'many_to_many_left',
  //                 target: contentTypeUID,
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const expectedContentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               many_to_many_left: fromJS({
  //                 relation: 'manyToMany',
  //                 targetAttribute: 'many_to_many_right',
  //                 target: updatedTargetUID,
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const action = {
  //           type: EDIT_ATTRIBUTE,
  //           attributeToSet: {
  //             relation: 'manyToMany',
  //             targetAttribute: 'many_to_many_right',
  //             target: updatedTargetUID,
  //             type: 'relation',
  //             name: 'many_to_many_left',
  //           },
  //           forTarget: 'contentType',
  //           targetUid: contentTypeUID,
  //           initialAttribute: {
  //             relation: 'manyToMany',
  //             targetAttribute: 'many_to_many_right',
  //             target: contentTypeUID,
  //             type: 'relation',
  //             name: 'many_to_many_left',
  //           },
  //           shouldAddComponentToData: false,
  //         };
  //         const state = initialState
  //           .setIn(['contentTypes', contentTypeUID], contentType)
  //           .setIn(['modifiedData', 'contentType'], contentType)
  //           .setIn(['modifiedData', 'components'], fromJS({}));
  //         const expected = state.setIn(['modifiedData', 'contentType'], expectedContentType);
  //         expect(reducer(state, action)).toEqual(expected);
  //       });
  //     });
  //     describe('Editing the other informations of the relation', () => {
  //       it('Should handle the edition of the other properties correctly by updating the opposite attribute in the other cases', () => {
  //         const contentTypeUID = 'application::address.address';
  //         const contentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               many_to_many_left: fromJS({
  //                 relation: 'manyToMany',
  //                 targetAttribute: 'many_to_many_right',
  //                 target: contentTypeUID,
  //                 type: 'relation',
  //               }),
  //               many_to_many_right: fromJS({
  //                 relation: 'manyToMany',
  //                 targetAttribute: 'many_to_many_left',
  //                 target: contentTypeUID,
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const action = {
  //           type: EDIT_ATTRIBUTE,
  //           attributeToSet: {
  //             relation: 'manyToMany',
  //             targetAttribute: 'many_to_many_right_updated',
  //             target: contentTypeUID,
  //             type: 'relation',
  //             name: 'many_to_many_left',
  //           },
  //           forTarget: 'contentType',
  //           targetUid: contentTypeUID,
  //           initialAttribute: {
  //             relation: 'manyToMany',
  //             targetAttribute: 'many_to_many_right',
  //             target: contentTypeUID,
  //             type: 'relation',
  //             name: 'many_to_many_left',
  //           },
  //           shouldAddComponentToData: false,
  //         };
  //         const expectedContentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               many_to_many_left: fromJS({
  //                 relation: 'manyToMany',
  //                 targetAttribute: 'many_to_many_right_updated',
  //                 target: contentTypeUID,
  //                 type: 'relation',
  //               }),
  //               many_to_many_right_updated: fromJS({
  //                 relation: 'manyToMany',
  //                 targetAttribute: 'many_to_many_left',
  //                 target: contentTypeUID,
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const state = initialState
  //           .setIn(['contentTypes', contentTypeUID], contentType)
  //           .setIn(['modifiedData', 'contentType'], contentType)
  //           .setIn(['modifiedData', 'components'], fromJS({}));
  //         const expected = state.setIn(['modifiedData', 'contentType'], expectedContentType);
  //         expect(reducer(state, action)).toEqual(expected);
  //       });
  //       it('Should handle the edition of the name of the relation correctly for a one side relation', () => {
  //         const contentTypeUID = 'application::address.address';
  //         const contentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               one_way: fromJS({
  //                 relation: 'oneToOne',
  //                 targetAttribute: null,
  //                 target: contentTypeUID,
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const expectedContentType = fromJS({
  //           uid: contentTypeUID,
  //           schema: {
  //             name: 'address',
  //             description: '',
  //             connection: 'default',
  //             collectionName: '',
  //             attributes: OrderedMap({
  //               geolocation: fromJS({ type: 'json', required: true }),
  //               city: fromJS({ type: 'string', required: true }),
  //               postal_code: fromJS({ type: 'string' }),
  //               one_way_updated: fromJS({
  //                 relation: 'oneToOne',
  //                 targetAttribute: null,
  //                 target: contentTypeUID,
  //                 type: 'relation',
  //               }),
  //               category: fromJS({
  //                 relation: 'oneToOne',
  //                 target: 'application::category.category',
  //                 targetAttribute: null,
  //                 type: 'relation',
  //               }),
  //               cover: fromJS({
  //                 type: 'media',
  //                 multiple: false,
  //                 required: false,
  //               }),
  //               images: fromJS({
  //                 type: 'media',
  //                 multiple: true,
  //                 required: false,
  //               }),
  //               full_name: fromJS({ type: 'string', required: true }),
  //             }),
  //           },
  //         });
  //         const action = {
  //           type: EDIT_ATTRIBUTE,
  //           attributeToSet: {
  //             relation: 'oneToOne',
  //             targetAttribute: null,
  //             target: contentTypeUID,
  //             type: 'relation',
  //             name: 'one_way_updated',
  //           },
  //           forTarget: 'contentType',
  //           targetUid: contentTypeUID,
  //           initialAttribute: {
  //             relation: 'oneToOne',
  //             targetAttribute: null,
  //             target: contentTypeUID,
  //             type: 'relation',
  //             name: 'one_way',
  //           },
  //           shouldAddComponentToData: false,
  //         };
  //         const state = initialState
  //           .setIn(['contentTypes', contentTypeUID], contentType)
  //           .setIn(['modifiedData', 'contentType'], contentType)
  //           .setIn(['modifiedData', 'components'], fromJS({}));
  //         const expected = state.setIn(['modifiedData', 'contentType'], expectedContentType);
  //         expect(reducer(state, action)).toEqual(expected);
  //       });
  //     });
  //   });
  //   describe('Editing a relation with another content type', () => {
  //     it('Should not create an opposite attribute if the target is the same content type and the nature is a one side relation (oneWay, manyWay)', () => {
  //       const contentTypeUID = 'application::category.category';
  //       const updatedTargetUID = 'application::address.address';
  //       const contentType = fromJS({
  //         uid: contentTypeUID,
  //         schema: {
  //           name: 'address',
  //           description: '',
  //           connection: 'default',
  //           collectionName: '',
  //           attributes: OrderedMap({
  //             geolocation: fromJS({ type: 'json', required: true }),
  //             city: fromJS({ type: 'string', required: true }),
  //             postal_code: fromJS({ type: 'string' }),
  //             one_way: fromJS({
  //               relation: 'oneToOne',
  //               targetAttribute: null,
  //               target: contentTypeUID,
  //               type: 'relation',
  //             }),
  //             category: fromJS({
  //               relation: 'oneToOne',
  //               target: 'application::category.category',
  //               targetAttribute: null,
  //               type: 'relation',
  //             }),
  //             cover: fromJS({
  //               type: 'media',
  //               multiple: false,
  //               required: false,
  //             }),
  //             images: fromJS({
  //               type: 'media',
  //               multiple: true,
  //               required: false,
  //             }),
  //             full_name: fromJS({ type: 'string', required: true }),
  //           }),
  //         },
  //       });
  //       const expectedContentType = fromJS({
  //         uid: contentTypeUID,
  //         schema: {
  //           name: 'address',
  //           description: '',
  //           connection: 'default',
  //           collectionName: '',
  //           attributes: OrderedMap({
  //             geolocation: fromJS({ type: 'json', required: true }),
  //             city: fromJS({ type: 'string', required: true }),
  //             postal_code: fromJS({ type: 'string' }),
  //             one_way: fromJS({
  //               relation: 'oneToOne',
  //               targetAttribute: null,
  //               target: updatedTargetUID,
  //               type: 'relation',
  //             }),
  //             category: fromJS({
  //               relation: 'oneToOne',
  //               target: 'application::category.category',
  //               targetAttribute: null,
  //               type: 'relation',
  //             }),
  //             cover: fromJS({
  //               type: 'media',
  //               multiple: false,
  //               required: false,
  //             }),
  //             images: fromJS({
  //               type: 'media',
  //               multiple: true,
  //               required: false,
  //             }),
  //             full_name: fromJS({ type: 'string', required: true }),
  //           }),
  //         },
  //       });
  //       const action = {
  //         type: EDIT_ATTRIBUTE,
  //         attributeToSet: {
  //           relation: 'oneToOne',
  //           targetAttribute: null,
  //           target: updatedTargetUID,
  //           type: 'relation',
  //           name: 'one_way',
  //         },
  //         forTarget: 'contentType',
  //         targetUid: contentTypeUID,
  //         initialAttribute: {
  //           relation: 'oneToOne',
  //           targetAttribute: null,
  //           target: updatedTargetUID,
  //           type: 'relation',
  //           name: 'one_way',
  //         },
  //         shouldAddComponentToData: false,
  //       };
  //       const state = initialState
  //         .setIn(['contentTypes', contentTypeUID], contentType)
  //         .setIn(['modifiedData', 'contentType'], contentType)
  //         .setIn(['modifiedData', 'components'], fromJS({}));
  //       const expected = state.setIn(['modifiedData', 'contentType'], expectedContentType);
  //       expect(reducer(state, action)).toEqual(expected);
  //     });
  //     it('Should create an opposite attribute if the target is the same content type and the nature is not a one side relation (oneToOne, ...)', () => {
  //       const originalTargetUID = 'application::category.category';
  //       const contentTypeUID = 'application::address.address';
  //       const contentType = fromJS({
  //         uid: contentTypeUID,
  //         schema: {
  //           name: 'address',
  //           description: '',
  //           connection: 'default',
  //           collectionName: '',
  //           attributes: OrderedMap({
  //             geolocation: fromJS({ type: 'json', required: true }),
  //             city: fromJS({ type: 'string', required: true }),
  //             postal_code: fromJS({ type: 'string' }),
  //             one_to_many: fromJS({
  //               relation: 'oneToMany',
  //               targetAttribute: 'many_to_one',
  //               target: originalTargetUID,
  //               type: 'relation',
  //             }),
  //             category: fromJS({
  //               relation: 'oneToOne',
  //               target: 'application::category.category',
  //               targetAttribute: null,
  //               type: 'relation',
  //             }),
  //             cover: fromJS({
  //               type: 'media',
  //               multiple: false,
  //               required: false,
  //             }),
  //             images: fromJS({
  //               type: 'media',
  //               multiple: true,
  //               required: false,
  //             }),
  //             full_name: fromJS({ type: 'string', required: true }),
  //           }),
  //         },
  //       });
  //       const expectedContentType = fromJS({
  //         uid: contentTypeUID,
  //         schema: {
  //           name: 'address',
  //           description: '',
  //           connection: 'default',
  //           collectionName: '',
  //           attributes: OrderedMap({
  //             geolocation: fromJS({ type: 'json', required: true }),
  //             city: fromJS({ type: 'string', required: true }),
  //             postal_code: fromJS({ type: 'string' }),
  //             one_to_many: fromJS({
  //               relation: 'oneToMany',
  //               targetAttribute: 'many_to_one',
  //               target: contentTypeUID,
  //               type: 'relation',
  //             }),
  //             many_to_one: fromJS({
  //               relation: 'manyToOne',
  //               targetAttribute: 'one_to_many',
  //               target: contentTypeUID,
  //               type: 'relation',
  //             }),
  //             category: fromJS({
  //               relation: 'oneToOne',
  //               target: 'application::category.category',
  //               targetAttribute: null,
  //               type: 'relation',
  //             }),
  //             cover: fromJS({
  //               type: 'media',
  //               multiple: false,
  //               required: false,
  //             }),
  //             images: fromJS({
  //               type: 'media',
  //               multiple: true,
  //               required: false,
  //             }),
  //             full_name: fromJS({ type: 'string', required: true }),
  //           }),
  //         },
  //       });
  //       const action = {
  //         type: EDIT_ATTRIBUTE,
  //         attributeToSet: {
  //           relation: 'oneToMany',
  //           targetAttribute: 'many_to_one',
  //           target: contentTypeUID,
  //           type: 'relation',
  //           name: 'one_to_many',
  //         },
  //         forTarget: 'contentType',
  //         targetUid: contentTypeUID,
  //         initialAttribute: {
  //           relation: 'oneToMany',
  //           targetAttribute: 'many_to_one',
  //           target: originalTargetUID,
  //           type: 'relation',
  //           name: 'one_to_many',
  //         },
  //         shouldAddComponentToData: false,
  //       };
  //       const state = initialState
  //         .setIn(['contentTypes', contentTypeUID], contentType)
  //         .setIn(['modifiedData', 'contentType'], contentType)
  //         .setIn(['modifiedData', 'components'], fromJS({}));
  //       const expected = state.setIn(['modifiedData', 'contentType'], expectedContentType);
  //       expect(reducer(state, action)).toEqual(expected);
  //     });
  //     it('Should create an opposite attribute if the target is the same content type and the nature is manyToMany', () => {
  //       const originalTargetUID = 'application::category.category';
  //       const contentTypeUID = 'application::address.address';
  //       const contentType = fromJS({
  //         uid: contentTypeUID,
  //         schema: {
  //           name: 'address',
  //           description: '',
  //           connection: 'default',
  //           collectionName: '',
  //           attributes: OrderedMap({
  //             geolocation: fromJS({ type: 'json', required: true }),
  //             city: fromJS({ type: 'string', required: true }),
  //             postal_code: fromJS({ type: 'string' }),
  //             many_to_many_left: fromJS({
  //               relation: 'manyToMany',
  //               targetAttribute: 'many_to_many_right',
  //               target: originalTargetUID,
  //               type: 'relation',
  //             }),
  //             category: fromJS({
  //               relation: 'oneToOne',
  //               target: 'application::category.category',
  //               targetAttribute: null,
  //               type: 'relation',
  //             }),
  //             cover: fromJS({
  //               type: 'media',
  //               multiple: false,
  //               required: false,
  //             }),
  //             images: fromJS({
  //               type: 'media',
  //               multiple: true,
  //               required: false,
  //             }),
  //             full_name: fromJS({ type: 'string', required: true }),
  //           }),
  //         },
  //       });
  //       const expectedContentType = fromJS({
  //         uid: contentTypeUID,
  //         schema: {
  //           name: 'address',
  //           description: '',
  //           connection: 'default',
  //           collectionName: '',
  //           attributes: OrderedMap({
  //             geolocation: fromJS({ type: 'json', required: true }),
  //             city: fromJS({ type: 'string', required: true }),
  //             postal_code: fromJS({ type: 'string' }),
  //             many_to_many_left: fromJS({
  //               relation: 'manyToMany',
  //               targetAttribute: 'many_to_many_right',
  //               target: contentTypeUID,
  //               type: 'relation',
  //             }),
  //             many_to_many_right: fromJS({
  //               relation: 'manyToMany',
  //               targetAttribute: 'many_to_many_left',
  //               target: contentTypeUID,
  //               type: 'relation',
  //             }),
  //             category: fromJS({
  //               relation: 'oneToOne',
  //               target: 'application::category.category',
  //               targetAttribute: null,
  //               type: 'relation',
  //             }),
  //             cover: fromJS({
  //               type: 'media',
  //               multiple: false,
  //               required: false,
  //             }),
  //             images: fromJS({
  //               type: 'media',
  //               multiple: true,
  //               required: false,
  //             }),
  //             full_name: fromJS({ type: 'string', required: true }),
  //           }),
  //         },
  //       });
  //       const action = {
  //         type: EDIT_ATTRIBUTE,
  //         attributeToSet: {
  //           relation: 'manyToMany',
  //           targetAttribute: 'many_to_many_right',
  //           target: contentTypeUID,
  //           type: 'relation',
  //           name: 'many_to_many_left',
  //         },
  //         forTarget: 'contentType',
  //         targetUid: contentTypeUID,
  //         initialAttribute: {
  //           relation: 'manyToMany',
  //           targetAttribute: 'many_to_many_right',
  //           target: originalTargetUID,
  //           type: 'relation',
  //           name: 'many_to_many_left',
  //         },
  //         shouldAddComponentToData: false,
  //       };
  //       const state = initialState
  //         .setIn(['contentTypes', contentTypeUID], contentType)
  //         .setIn(['modifiedData', 'contentType'], contentType)
  //         .setIn(['modifiedData', 'components'], fromJS({}));
  //       const expected = state.setIn(['modifiedData', 'contentType'], expectedContentType);
  //       expect(reducer(state, action)).toEqual(expected);
  //     });
  //   });
  // });
});
