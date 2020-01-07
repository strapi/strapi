import { fromJS } from 'immutable';
import reducer, { initialState } from '../reducer';

describe('CTB | containers | reducer | basics actions ', () => {
  it('Should return the initial state', () => {
    expect(reducer(initialState, { type: 'TEST' })).toEqual(initialState);
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
  });
});
