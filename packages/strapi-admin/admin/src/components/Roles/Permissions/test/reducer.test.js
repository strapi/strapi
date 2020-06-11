import reducer from '../reducer';

describe('ADMIN | COMPONENTS | Permissions | ContentTypes | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('COLLAPSE_PATH', () => {
    it('should add the first level of the path', () => {
      const action = {
        type: 'COLLAPSE_PATH',
        index: 0,
        value: 'address',
      };
      const initialState = {
        collapsePath: [],
      };
      const expected = {
        collapsePath: ['address'],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove the value from the level level if click on the same value and level', () => {
      const action = {
        type: 'COLLAPSE_PATH',
        index: 0,
        value: 'address',
      };
      const initialState = {
        collapsePath: ['address'],
      };
      const expected = {
        collapsePath: [],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should add another level to the path', () => {
      const action = {
        type: 'COLLAPSE_PATH',
        index: 1,
        value: 'city',
      };
      const initialState = {
        collapsePath: ['address'],
      };
      const expected = {
        collapsePath: ['address', 'city'],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should replace the value at the right level', () => {
      const action = {
        type: 'COLLAPSE_PATH',
        index: 2,
        value: 'floor',
      };
      const initialState = {
        collapsePath: ['address', 'city', 'number', 'door'],
      };
      const expected = {
        collapsePath: ['address', 'city', 'floor', 'door'],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove all values from the index if same values and index', () => {
      const action = {
        type: 'COLLAPSE_PATH',
        index: 1,
        value: 'city',
      };
      const initialState = {
        collapsePath: ['address', 'city', 'number', 'door'],
      };
      const expected = {
        collapsePath: ['address'],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
