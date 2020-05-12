import { fromJS } from 'immutable';
import { get } from 'lodash';
import reducer, { initialState } from '../reducer';
import testData from './data';

describe('CTB | containers | DataManagerProvider | reducer | basics actions ', () => {
  it('Should return the initial state', () => {
    expect(reducer(initialState, { type: 'TEST' })).toEqual(initialState);
  });

  describe('ADD_CREATED_COMPONENT_TO_DYNAMIC_ZONE', () => {
    it('should add the created component to the dynamic zone', () => {
      const createdComponent = fromJS({
        uid: 'default.test',
        category: 'default',
        isTemporary: true,
        schema: {
          icon: 'book',
          name: 'test',
          collectionName: '',
          attributes: {},
        },
      });
      const components = fromJS({
        'default.test': createdComponent,
        'default.other': {
          uid: 'default.other',
          category: 'default',

          schema: {
            icon: 'book',
            name: 'test',
            collectionName: '',
            attributes: {},
          },
        },
      });
      const contentType = fromJS({
        uid: 'application::test',
        schema: {
          name: 'test',
          attributes: {
            dz: {
              type: 'dynamiczone',
              components: ['default.other'],
            },
          },
        },
      });
      const state = initialState
        .setIn(['components'], components)
        .setIn(['modifiedData', 'components'], components)

        .setIn(['modifiedData', 'contentType'], contentType);

      const expected = state.setIn(
        [
          'modifiedData',
          'contentType',
          'schema',
          'attributes',
          'dz',
          'components',
        ],
        fromJS(['default.other', 'default.test'])
      );

      expect(
        reducer(state, {
          type: 'ADD_CREATED_COMPONENT_TO_DYNAMIC_ZONE',
          dynamicZoneTarget: 'dz',
          componentsToAdd: ['default.test'],
        })
      ).toEqual(expected);
    });
  });

  describe('CANCEL_CHANGES', () => {
    it('Should set the modifiedData and the components object with the initial ones', () => {
      const state = fromJS({
        components: {
          test: {
            something: true,
          },
          other: {
            something: false,
          },
        },
        initialComponents: {
          test: {
            something: false,
          },
          other: {
            something: false,
          },
        },
        modifiedData: {
          components: {
            test: {
              something: true,
            },
            other: {
              something: false,
            },
          },
          contentType: {
            uid: 'something',
            name: 'test',
          },
        },
        initialData: {
          components: {
            test: {
              something: false,
            },
            other: {
              something: false,
            },
          },
          contentType: {
            uid: 'something',
            name: 'something',
          },
        },
      });

      const expected = fromJS({
        components: {
          test: {
            something: false,
          },
          other: {
            something: false,
          },
        },
        initialComponents: {
          test: {
            something: false,
          },
          other: {
            something: false,
          },
        },
        modifiedData: {
          components: {
            test: {
              something: false,
            },
            other: {
              something: false,
            },
          },
          contentType: {
            uid: 'something',
            name: 'something',
          },
        },
        initialData: {
          components: {
            test: {
              something: false,
            },
            other: {
              something: false,
            },
          },
          contentType: {
            uid: 'something',
            name: 'something',
          },
        },
      });

      expect(reducer(state, { type: 'CANCEL_CHANGES' })).toEqual(expected);
    });
  });

  describe('CHANGE_DYNAMIC_ZONE_COMPONENTS', () => {
    it('Should add the component to the dz field and to the modifiedData.components if the added component is not already in the modifiedData.components', () => {
      const componentUID = 'default.openingtimes';
      const component = get(testData, ['components', componentUID]);
      const contentType = fromJS(
        testData.contentTypes['application::address.address']
      ).setIn(
        ['schema', 'attributes', 'dz'],
        fromJS({ type: 'dynamiczone', components: ['default.openingtimes'] })
      );
      const state = initialState
        .setIn(['components'], fromJS(testData.components))
        .setIn(['modifiedData', 'components', componentUID], fromJS(component))
        .setIn(['modifiedData', 'contentType'], contentType);

      const expected = state
        .setIn(
          ['modifiedData', 'components', 'default.dish'],
          fromJS(get(testData, ['components', 'default.dish']))
        )
        .setIn(
          [
            'modifiedData',
            'contentType',
            'schema',
            'attributes',
            'dz',
            'components',
          ],
          fromJS([componentUID, 'default.dish'])
        );

      expect(
        reducer(state, {
          type: 'CHANGE_DYNAMIC_ZONE_COMPONENTS',
          dynamicZoneTarget: 'dz',
          newComponents: ['default.dish'],
        })
      ).toEqual(expected);
    });

    it('Should add the component to the dz field and not to the modifiedData.components if the added component is already in the modifiedData.components', () => {
      const componentUID = 'default.openingtimes';
      const component = get(testData, ['components', componentUID]);
      const contentType = fromJS(
        testData.contentTypes['application::address.address']
      ).setIn(
        ['schema', 'attributes', 'dz'],
        fromJS({ type: 'dynamiczone', components: ['default.openingtimes'] })
      );
      const state = initialState
        .setIn(['components'], fromJS(testData.components))
        .setIn(['modifiedData', 'components', componentUID], fromJS(component))
        .setIn(
          ['modifiedData', 'components', 'default.dish'],
          fromJS(get(testData, ['components', 'default.dish']))
        )
        .setIn(['modifiedData', 'contentType'], contentType);

      const expected = state.setIn(
        [
          'modifiedData',
          'contentType',
          'schema',
          'attributes',
          'dz',
          'components',
        ],
        fromJS([componentUID, 'default.dish'])
      );

      expect(
        reducer(state, {
          type: 'CHANGE_DYNAMIC_ZONE_COMPONENTS',
          dynamicZoneTarget: 'dz',
          newComponents: ['default.dish'],
        })
      ).toEqual(expected);
    });
  });

  describe('CREATE_COMPONENT_SCHEMA', () => {
    it('Should add the created component schema to the components object when creating a component using the left menu link', () => {
      const action = {
        type: 'CREATE_COMPONENT_SCHEMA',
        data: { name: 'new component', icon: 'arrow-alt-circle-down' },
        componentCategory: 'test',
        schemaType: 'component',
        uid: 'test.new-component',
        shouldAddComponentToData: false,
      };

      const state = initialState
        .setIn(['components', fromJS(testData.components)])
        .setIn(['initialComponents', fromJS(testData.components)]);

      const expected = state.setIn(
        ['components', action.uid],
        fromJS({
          uid: action.uid,
          isTemporary: true,
          category: action.componentCategory,
          schema: {
            ...action.data,
            attributes: {},
          },
        })
      );

      expect(reducer(state, action)).toEqual(expected);
    });

    it('Should add the created component schema to the components object, create the attribute and also add the created component to modifiedData.components when using the add attribute modal', () => {
      const action = {
        type: 'CREATE_COMPONENT_SCHEMA',
        data: { name: 'new component', icon: 'arrow-alt-circle-down' },
        componentCategory: 'test',
        schemaType: 'component',
        uid: 'test.new-component',
        shouldAddComponentToData: true,
      };
      const compoToCreate = {
        uid: action.uid,
        isTemporary: true,
        category: action.componentCategory,
        schema: {
          ...action.data,
          attributes: {},
        },
      };

      const state = initialState
        .setIn(['components', fromJS(testData.components)])
        .setIn(['initialComponents', fromJS(testData.components)]);

      const expected = state
        .setIn(['components', action.uid], fromJS(compoToCreate))
        .setIn(
          ['modifiedData', 'components', action.uid],
          fromJS(compoToCreate)
        );

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('CREATE_SCHEMA', () => {
    it('Should create a content type schema correctly', () => {
      const uid = 'application::test';
      const data = {
        collectionName: 'test',
        name: 'test',
      };
      const expected = initialState.setIn(
        ['contentTypes', uid],
        fromJS({
          uid,
          isTemporary: true,
          schema: {
            collectionName: data.collectionName,
            name: data.name,
            attributes: {},
          },
        })
      );

      expect(
        reducer(initialState, { type: 'CREATE_SCHEMA', uid, data })
      ).toEqual(expected);
    });
  });

  describe('DELETE_NOT_SAVED_TYPE', () => {
    it('Should reset the components and and contentTypes object', () => {
      const state = initialState
        .setIn(['components'], fromJS({ foo: {}, bar: {} }))
        .setIn(['initialComponents'], fromJS({ foo: {} }))
        .setIn(['contentTypes'], fromJS({ baz: {}, bat: {} }))
        .setIn(['initialContentTypes'], fromJS({ baz: {} }));

      const expected = initialState
        .setIn(['components'], fromJS({ foo: {} }))
        .setIn(['initialComponents'], fromJS({ foo: {} }))
        .setIn(['contentTypes'], fromJS({ baz: {} }))
        .setIn(['initialContentTypes'], fromJS({ baz: {} }));

      expect(reducer(state, { type: 'DELETE_NOT_SAVED_TYPE' })).toEqual(
        expected
      );
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    const components = {
      'default.test': {
        uid: 'default.test',
        category: 'default',
        schema: {
          attributes: {},
        },
      },
    };
    const contentTypes = {
      'application::test.test': {
        uid: 'application::test.test',
        schema: {
          attributes: {},
        },
      },
    };
    const expected = initialState
      .set('components', fromJS(components))
      .set('contentTypes', fromJS(contentTypes))
      .set('initialContentTypes', fromJS(contentTypes))
      .set('initialComponents', fromJS(components))
      .set('isLoading', false);

    expect(
      reducer(initialState, {
        type: 'GET_DATA_SUCCEEDED',
        components,
        contentTypes,
      })
    ).toEqual(expected);
  });

  describe('RELOAD_PLUGIN', () => {
    it('Should return the initial state constant', () => {
      expect(
        reducer(initialState.setIn(['components', 'foo'], {}), {
          type: 'RELOAD_PLUGIN',
        })
      ).toEqual(initialState);
    });
  });

  describe('REMOVE_COMPONENT_FROM_DYNAMIC_ZONE', () => {
    it('Should remove a component from a dynamic zone', () => {
      const state = fromJS({
        components: {
          'default.openingtimes': {
            uid: 'default.openingtimes',
            category: 'default',
            schema: {
              icon: 'calendar',
              name: 'openingtimes',
              description: '',
              connection: 'default',
              collectionName: 'components_openingtimes',
              attributes: {
                label: {
                  type: 'string',
                  required: true,
                  default: 'something',
                },
                time: {
                  type: 'string',
                },
              },
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
              attributes: {
                label: {
                  type: 'string',
                  required: true,
                  default: 'something',
                },
                time: {
                  type: 'string',
                },
              },
            },
          },
        },
        modifiedData: {
          components: {
            'default.dish': {
              uid: 'default.dish',
              category: 'default',
              schema: {
                icon: 'calendar',
                name: 'dish',
                description: '',
                connection: 'default',
                collectionName: 'components_dishes',
                attributes: {
                  label: {
                    type: 'string',
                    required: true,
                    default: 'something',
                  },
                  time: {
                    type: 'string',
                  },
                },
              },
            },
            'default.openingtimes': {
              uid: 'default.openingtimes',
              category: 'default',
              schema: {
                icon: 'calendar',
                name: 'openingtimes',
                description: '',
                connection: 'default',
                collectionName: 'components_openingtimes',
                attributes: {
                  label: {
                    type: 'string',
                    required: true,
                    default: 'something',
                  },
                  time: {
                    type: 'string',
                  },
                },
              },
            },
          },
          contentType: {
            uid: 'application::address.address',
            schema: {
              name: 'address',
              description: '',
              connection: 'default',
              collectionName: 'addresses',
              attributes: {
                geolocation: {
                  type: 'json',
                  required: true,
                },
                city: {
                  type: 'string',
                  required: true,
                },
                postal_coder: {
                  type: 'string',
                },
                category: {
                  model: 'category',
                },
                cover: {
                  model: 'file',
                  via: 'related',
                  plugin: 'upload',
                  required: false,
                },
                images: {
                  collection: 'file',
                  via: 'related',
                  plugin: 'upload',
                  required: false,
                },
                full_name: {
                  type: 'string',
                  required: true,
                },
                dz: {
                  type: 'dynamiczone',
                  components: ['default.openingtimes', 'default.dish'],
                },
                otherDz: {
                  type: 'dynamiczone',
                  components: ['default.openingtimes', 'default.dish'],
                },
              },
            },
          },
        },
      });

      const expected = fromJS({
        components: {
          'default.openingtimes': {
            uid: 'default.openingtimes',
            category: 'default',
            schema: {
              icon: 'calendar',
              name: 'openingtimes',
              description: '',
              connection: 'default',
              collectionName: 'components_openingtimes',
              attributes: {
                label: {
                  type: 'string',
                  required: true,
                  default: 'something',
                },
                time: {
                  type: 'string',
                },
              },
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
              attributes: {
                label: {
                  type: 'string',
                  required: true,
                  default: 'something',
                },
                time: {
                  type: 'string',
                },
              },
            },
          },
        },
        modifiedData: {
          components: {
            'default.dish': {
              uid: 'default.dish',
              category: 'default',
              schema: {
                icon: 'calendar',
                name: 'dish',
                description: '',
                connection: 'default',
                collectionName: 'components_dishes',
                attributes: {
                  label: {
                    type: 'string',
                    required: true,
                    default: 'something',
                  },
                  time: {
                    type: 'string',
                  },
                },
              },
            },
            'default.openingtimes': {
              uid: 'default.openingtimes',
              category: 'default',
              schema: {
                icon: 'calendar',
                name: 'openingtimes',
                description: '',
                connection: 'default',
                collectionName: 'components_openingtimes',
                attributes: {
                  label: {
                    type: 'string',
                    required: true,
                    default: 'something',
                  },
                  time: {
                    type: 'string',
                  },
                },
              },
            },
          },
          contentType: {
            uid: 'application::address.address',
            schema: {
              name: 'address',
              description: '',
              connection: 'default',
              collectionName: 'addresses',
              attributes: {
                geolocation: {
                  type: 'json',
                  required: true,
                },
                city: {
                  type: 'string',
                  required: true,
                },
                postal_coder: {
                  type: 'string',
                },
                category: {
                  model: 'category',
                },
                cover: {
                  model: 'file',
                  via: 'related',
                  plugin: 'upload',
                  required: false,
                },
                images: {
                  collection: 'file',
                  via: 'related',
                  plugin: 'upload',
                  required: false,
                },
                full_name: {
                  type: 'string',
                  required: true,
                },
                dz: {
                  type: 'dynamiczone',
                  components: ['default.openingtimes'],
                },
                otherDz: {
                  type: 'dynamiczone',
                  components: ['default.openingtimes', 'default.dish'],
                },
              },
            },
          },
        },
      });

      expect(
        reducer(state, {
          type: 'REMOVE_COMPONENT_FROM_DYNAMIC_ZONE',
          dzName: 'dz',
          componentToRemoveIndex: 1,
        })
      ).toEqual(expected);
    });
  });

  describe('REMOVE_FIELD_FROM_DISPLAYED_COMPONENT', () => {
    it('Should remove the selected field', () => {
      const state = fromJS({
        modifiedData: {
          components: {
            'default.test': {
              schema: {
                attributes: {
                  text: {
                    type: 'text',
                  },
                  other: {
                    type: 'string',
                  },
                  last: {
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
      });

      const expected = fromJS({
        modifiedData: {
          components: {
            'default.test': {
              schema: {
                attributes: {
                  text: {
                    type: 'text',
                  },
                  last: {
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
      });

      expect(
        reducer(state, {
          type: 'REMOVE_FIELD_FROM_DISPLAYED_COMPONENT',
          componentUid: 'default.test',
          attributeToRemoveName: 'other',
        })
      ).toEqual(expected);
    });
  });

  describe('SET_MODIFIED_DATA', () => {
    it('Should set the modifiedData object correctly if the user did create a new type', () => {
      const schemaToSet = fromJS({
        components: {},
        contentType: {
          uid: 'test',
        },
      });
      const expected = initialState
        .set('modifiedData', schemaToSet)
        .set('initialData', schemaToSet)
        .set('isLoadingForDataToBeSet', false);

      expect(
        reducer(initialState, {
          type: 'SET_MODIFIED_DATA',
          schemaToSet,
          hasJustCreatedSchema: true,
        })
      ).toEqual(expected);
    });

    it('Should set the modifiedData object correctly if the user did not create a new type', () => {
      const schemaToSet = fromJS({
        components: {},
        contentType: {
          uid: 'test',
        },
      });
      const expected = initialState
        .set('modifiedData', schemaToSet)
        .set('initialData', schemaToSet)
        .set('isLoadingForDataToBeSet', false);

      expect(
        reducer(initialState, {
          type: 'SET_MODIFIED_DATA',
          schemaToSet,
          hasJustCreatedSchema: false,
        })
      ).toEqual(expected);
    });
  });

  describe('UPDATE_SCHEMA', () => {
    it('Should update the modified data correctly if the schemaType is a content type', () => {
      const data = {
        name: 'test1',
        collectionName: 'newTest',
      };
      const state = fromJS({
        modifiedData: {
          components: {},
          contentType: {
            uid: 'test',
            schema: {
              name: 'test',
              collectionName: 'test',
              attributes: {
                something: {
                  type: 'string',
                },
              },
            },
          },
        },
      });
      const expected = fromJS({
        modifiedData: {
          components: {},
          contentType: {
            uid: 'test',
            schema: {
              name: 'test1',
              collectionName: 'newTest',
              attributes: {
                something: {
                  type: 'string',
                },
              },
            },
          },
        },
      });

      expect(
        reducer(state, {
          type: 'UPDATE_SCHEMA',
          data,
          schemaType: 'contentType',
        })
      ).toEqual(expected);
    });

    it('Should update the modified data correctly if the schemaType is a component', () => {
      const data = {
        name: 'newTest',
        collectionName: 'newTest',
        category: 'test',
        icon: 'test',
      };
      const state = fromJS({
        components: {
          test: {
            uid: 'test',
            category: 'default',
            schema: {
              name: 'test',
              icon: 'book',
              collectionName: 'components_tests',
              attributes: {
                something: {
                  type: 'string',
                },
              },
            },
          },
        },
        modifiedData: {
          components: {},
          component: {
            uid: 'test',
            category: 'default',
            schema: {
              name: 'test',
              icon: 'book',
              collectionName: 'components_tests',
              attributes: {
                something: {
                  type: 'string',
                },
              },
            },
          },
        },
      });
      const expected = fromJS({
        components: {
          test: {
            uid: 'test',
            category: 'test',
            schema: {
              name: 'newTest',
              icon: 'test',
              collectionName: 'newTest',
              attributes: {
                something: {
                  type: 'string',
                },
              },
            },
          },
        },
        modifiedData: {
          components: {},
          component: {
            uid: 'test',
            category: 'test',
            schema: {
              name: 'newTest',
              icon: 'test',
              collectionName: 'newTest',
              attributes: {
                something: {
                  type: 'string',
                },
              },
            },
          },
        },
      });

      expect(
        reducer(state, {
          type: 'UPDATE_SCHEMA',
          data,
          schemaType: 'component',
          uid: 'test',
        })
      ).toEqual(expected);
    });
  });
});
