import get from 'lodash/get';

import { reducer, initialState, actions } from '../reducer';

import { data as testData } from './data';

import type { Component } from '../../../types';
import type { Internal } from '@strapi/types';

describe('CTB | components | DataManagerProvider | reducer | basics actions ', () => {
  it('Should return the initial state', () => {
    const state = { ...initialState };

    expect(reducer(state, { type: 'TEST' } as any)).toEqual(initialState);
  });

  describe('ADD_CREATED_COMPONENT_TO_DYNAMIC_ZONE', () => {
    it('should add the created component to the dynamic zone', () => {
      const createdComponent: Component = {
        uid: 'default.test',
        category: 'default',
        isTemporary: true,
        schema: {
          icon: 'book',
          name: 'test',
          collectionName: '',
          attributes: [],
        },
      };

      const components: Record<string, Component> = {
        'default.test': createdComponent,
        'default.other': {
          uid: 'default.other',
          category: 'default',
          schema: {
            icon: 'book',
            name: 'test',
            collectionName: '',
            attributes: [],
          },
        },
      };
      const contentType = {
        uid: 'api::test',
        schema: {
          name: 'test',
          attributes: [
            {
              name: 'dz',
              type: 'dynamiczone',
              components: ['default.other'],
            },
          ],
        },
      };

      const state: any = {
        ...initialState,
        components,
        modifiedData: {
          components,
          contentType,
        },
      };

      const expected = {
        ...initialState,
        components,
        modifiedData: {
          components,
          contentType: {
            uid: 'api::test',
            schema: {
              name: 'test',
              attributes: [
                {
                  name: 'dz',
                  type: 'dynamiczone',
                  components: ['default.other', 'default.test'],
                },
              ],
            },
          },
        },
      };

      const action = actions.addCreatedComponentToDynamicZone({
        dynamicZoneTarget: 'dz',
        componentsToAdd: ['default.test'],
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('CHANGE_DYNAMIC_ZONE_COMPONENTS', () => {
    it('Should add the component to the dz field and to the modifiedData.components if the added component is not already in the modifiedData.components', () => {
      const componentUID = 'default.openingtimes';
      const component = testData.components[componentUID];

      const ct = testData.contentTypes['api::address.address'];

      const contentType = {
        ...ct,
        schema: {
          ...ct.schema,
          attributes: [
            {
              name: 'price_range',
              enum: ['very_cheap', 'cheap', 'average', 'expensive', 'very_expensive'],
              type: 'enumeration',
            },
            {
              name: 'opening_times',
              component: 'default.openingtimes',
              type: 'component',
              repeatable: true,
              min: 1,
              max: 10,
            },
            {
              name: 'dz',
              type: 'dynamiczone',
              components: ['default.openingtimes'],
            },
          ],
        },
      };

      const state: any = {
        ...initialState,
        components: testData.components,
        modifiedData: {
          components: {
            [componentUID]: component,
          },
          contentType,
        },
      };

      const expected = {
        ...initialState,
        components: testData.components,
        modifiedData: {
          components: {
            [componentUID]: component,
            'default.dish': testData.components['default.dish'],
          },
          contentType: {
            ...contentType,
            schema: {
              ...contentType.schema,
              attributes: [
                {
                  name: 'price_range',
                  enum: ['very_cheap', 'cheap', 'average', 'expensive', 'very_expensive'],
                  type: 'enumeration',
                },
                {
                  name: 'opening_times',
                  component: 'default.openingtimes',
                  type: 'component',
                  repeatable: true,
                  min: 1,
                  max: 10,
                },
                {
                  name: 'dz',
                  type: 'dynamiczone',
                  components: ['default.openingtimes', 'default.dish'],
                },
              ],
            },
          },
        },
      };

      const action = actions.changeDynamicZoneComponents({
        forTarget,
        targetUid,
        dynamicZoneTarget: 'dz',
        newComponents: ['default.dish'],
      });

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should add the component to the dz field and the nestedComponents the modifiedData.components', () => {
      const componentUID = 'default.openingtimes';
      const component = get(testData, ['components', componentUID]);

      const contentType = {
        uid: 'api::address.address',
        schema: {
          name: 'address',
          description: '',
          connection: 'default',
          collectionName: '',
          attributes: [{ name: 'dz', type: 'dynamiczone', components: [componentUID] }],
        },
      };

      const state: any = {
        ...initialState,
        components: testData.components,
        modifiedData: {
          components: {
            [componentUID]: component,
          },
          contentType,
        },
      };

      const componentToAddUid = 'default.closingperiod';

      const action = actions.changeDynamicZoneComponents({
        forTarget,
        targetUid,
        dynamicZoneTarget: 'dz',
        newComponents: [componentToAddUid],
      });

      const expected = {
        ...initialState,
        components: testData.components,
        modifiedData: {
          components: {
            [componentUID]: component,
            'default.dish': testData.components['default.dish'],
            [componentToAddUid]: testData.components[componentToAddUid],
          },
          contentType: {
            uid: 'api::address.address',
            schema: {
              name: 'address',
              description: '',
              connection: 'default',
              collectionName: '',
              attributes: [
                { name: 'dz', type: 'dynamiczone', components: [componentUID, componentToAddUid] },
              ],
            },
          },
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('CREATE_COMPONENT_SCHEMA', () => {
    it('Should add the created component schema to the components object when creating a component using the left menu link', () => {
      const action = actions.createComponentSchema({
        data: { name: 'new component', icon: 'arrow-alt-circle-down' },
        componentCategory: 'test',
        uid: 'test.new-component',
        shouldAddComponentToData: false,
      });

      const state: any = {
        ...initialState,
        components: testData.components,
        initialComponents: testData.components,
      };

      const expected = {
        ...initialState,
        components: {
          ...testData.components,
          [action.payload.uid]: {
            uid: action.payload.uid,
            isTemporary: true,
            category: action.payload.componentCategory,
            schema: {
              ...action.payload.data,
              attributes: [],
            },
          },
        },
        initialComponents: testData.components,
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should add the created component schema to the components object, create the attribute and also add the created component to modifiedData.components when using the add attribute modal', () => {
      const action = actions.createComponentSchema({
        data: { name: 'new component', icon: 'arrow-alt-circle-down' },
        componentCategory: 'test',

        uid: 'test.new-component',
        shouldAddComponentToData: true,
      });

      const compoToCreate = {
        uid: action.payload.uid,
        isTemporary: true,
        category: action.payload.componentCategory,
        schema: {
          ...action.payload.data,
          attributes: [],
        },
      };

      const state: any = {
        ...initialState,
        components: testData.components,
        initialComponents: testData.components,
        modifiedData: {
          components: {},
          contentType: { ok: true },
        },
      };

      const expected = {
        ...initialState,
        components: {
          ...testData.components,
          [action.payload.uid]: compoToCreate,
        },
        initialComponents: testData.components,
        modifiedData: {
          components: {
            [action.payload.uid]: compoToCreate,
          },
          contentType: { ok: true },
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('CREATE_SCHEMA', () => {
    it('Should create a content type schema correctly', () => {
      const uid = 'api::test';
      const data = {
        collectionName: 'test',
        name: 'test',
      };

      const state = { ...initialState };

      const action = actions.createSchema({ uid, data });

      const expected = {
        ...initialState,
        contentTypes: {
          [uid]: {
            uid,
            isTemporary: true,
            schema: {
              collectionName: data.collectionName,
              name: data.name,
              attributes: [],
            },
          },
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('RELOAD_PLUGIN', () => {
    it('Should return the initial state constant', () => {
      const state = { ...initialState, component: { foo: {} } };

      expect(reducer(state, actions.reloadPlugin())).toEqual(initialState);
    });
  });

  describe('REMOVE_COMPONENT_FROM_DYNAMIC_ZONE', () => {
    it('Should remove a component from a dynamic zone', () => {
      const components = {
        'default.openingtimes': {
          uid: 'default.openingtimes',
          category: 'default',
          schema: {
            icon: 'calendar',
            name: 'openingtimes',
            description: '',
            connection: 'default',
            collectionName: 'components_openingtimes',
            attributes: [
              {
                name: 'label',
                type: 'string',
                required: true,
                default: 'something',
              },
              {
                name: 'time',
                type: 'string',
              },
            ],
          },
        },
        'default.dish': {
          uid: 'default.dish',
          category: 'default',
          schema: {
            icon: 'calendar',
            name: 'dish',
            description: '',
            connection: 'default',
            collectionName: 'components_dishes',
            attributes: [
              {
                name: 'label',
                type: 'string',
                required: true,
                default: 'something',
              },

              { name: 'time', type: 'string' },
            ],
          },
        },
      };

      const modifiedData = {
        components,
        contentType: {
          uid: 'api::address.address',
          schema: {
            name: 'address',
            description: '',
            connection: 'default',
            collectionName: 'addresses',
            attributes: [
              {
                name: 'full_name',
                type: 'string',
                required: true,
              },
              {
                name: 'dz',
                type: 'dynamiczone',
                components: ['default.openingtimes', 'default.dish'],
              },
              {
                name: 'otherDz',
                type: 'dynamiczone',
                components: ['default.openingtimes', 'default.dish'],
              },
            ],
          },
        },
      };
      const state: any = {
        ...initialState,
        components,
        modifiedData,
      };

      const action = actions.removeComponentFromDynamicZone({
        dzName: 'dz',
        componentToRemoveIndex: 1,
      });

      const expected = {
        ...initialState,
        components,
        modifiedData: {
          components,
          contentType: {
            uid: 'api::address.address',
            schema: {
              name: 'address',
              description: '',
              connection: 'default',
              collectionName: 'addresses',
              attributes: [
                {
                  name: 'full_name',
                  type: 'string',
                  required: true,
                },
                {
                  name: 'dz',
                  type: 'dynamiczone',
                  components: ['default.openingtimes'],
                },
                {
                  name: 'otherDz',
                  type: 'dynamiczone',
                  components: ['default.openingtimes', 'default.dish'],
                },
              ],
            },
          },
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('UPDATE_SCHEMA', () => {
    it('Should update the modified data correctly if the schemaType is a content type', () => {
      const data = {
        displayName: 'test1',
      };

      const state: any = {
        ...initialState,
        modifiedData: {
          components: {},
          contentType: {
            uid: 'test',
            schema: {
              displayName: 'test',
              attributes: [
                {
                  name: 'something',
                  type: 'string',
                },
              ],
            },
          },
        },
      };

      const action = actions.updateComponentSchema({
        data,
        schemaType: 'contentType',
      });
      const expected = {
        ...initialState,
        modifiedData: {
          components: {},
          contentType: {
            uid: 'test',
            schema: {
              displayName: 'test1',
              attributes: [
                {
                  name: 'something',
                  type: 'string',
                },
              ],
            },
          },
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should update the modified data correctly if the schemaType is a component', () => {
      const data = {
        displayName: 'newTest',
        category: 'test',
        icon: 'test',
      };

      const state: any = {
        ...initialState,
        components: {
          test: {
            uid: 'test',
            category: 'default',
            schema: {
              displayName: 'test',
              icon: 'book',
              attributes: [
                {
                  name: 'something',
                  type: 'string',
                },
              ],
            },
          },
        },
        modifiedData: {
          components: {},
          component: {
            uid: 'test',
            category: 'default',
            schema: {
              displayName: 'test',
              icon: 'book',
              attributes: [
                {
                  name: 'something',
                  type: 'string',
                },
              ],
            },
          },
        },
      };

      const action = actions.updateComponentSchema({
        data,
        schemaType: 'component',
        uid: 'test',
      });

      const expected = {
        ...initialState,
        components: {
          test: {
            uid: 'test',
            category: 'test',
            schema: {
              displayName: 'newTest',
              icon: 'test',
              attributes: [
                {
                  name: 'something',
                  type: 'string',
                },
              ],
            },
          },
        },
        modifiedData: {
          components: {},
          component: {
            uid: 'test',
            category: 'test',
            schema: {
              displayName: 'newTest',
              icon: 'test',
              attributes: [
                {
                  name: 'something',
                  type: 'string',
                },
              ],
            },
          },
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
