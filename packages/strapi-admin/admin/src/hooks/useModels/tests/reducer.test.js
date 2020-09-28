import reducer from '../reducer';

describe('ADMIN | HOOKS | useModels | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('GET_MODELS_ERROR', () => {
    it('should set isLoading to false is an error occured', () => {
      const action = {
        type: 'GET_MODELS_ERROR',
      };
      const initialState = {
        collectionTypes: [],
        components: [],
        singleTypes: [
          {
            uid: 'app.homepage',
            isDisplayed: true,
            schema: {
              kind: 'singleType',
            },
          },
        ],
        isLoading: true,
      };
      const expected = {
        collectionTypes: [],
        components: [],
        singleTypes: [],
        isLoading: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('GET_MODELS', () => {
    it('should set isLoading to true to start getting the data', () => {
      const action = {
        type: 'GET_MODELS',
      };
      const initialState = {
        collectionTypes: [
          {
            uid: 'app.category',
            isDisplayed: true,
            schema: {
              kind: 'collectionType',
            },
          },
          {
            uid: 'app.category',
            isDisplayed: true,
            schema: {
              kind: 'collectionType',
            },
          },
        ],
        singleTypes: [
          {
            uid: 'app.homepage',
            isDisplayed: true,
            schema: {
              kind: 'singleType',
            },
          },
        ],
        components: [{}],
        isLoading: false,
      };
      const expected = {
        collectionTypes: [],
        components: [],
        singleTypes: [],
        isLoading: true,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('GET_MODELS_SUCCEDED', () => {
    it('should return the state with the collectionTypes and singleTypes', () => {
      const action = {
        type: 'GET_MODELS_SUCCEDED',
        contentTypes: [
          {
            uid: 'app.homepage',
            isDisplayed: true,
            schema: {
              kind: 'singleType',
            },
          },
          {
            uid: 'permissions.role',
            isDisplayed: false,
            schema: {
              kind: 'collectionType',
            },
          },
          {
            uid: 'app.category',
            isDisplayed: true,
            schema: {
              kind: 'collectionType',
            },
          },
        ],
        components: [],
      };
      const initialState = {
        collectionTypes: [],
        components: [],
        singleTypes: [],
        isLoading: true,
      };
      const expected = {
        collectionTypes: [
          {
            uid: 'app.category',
            isDisplayed: true,
            schema: {
              kind: 'collectionType',
            },
          },
        ],
        singleTypes: [
          {
            uid: 'app.homepage',
            isDisplayed: true,
            schema: {
              kind: 'singleType',
            },
          },
        ],
        components: [],
        isLoading: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
