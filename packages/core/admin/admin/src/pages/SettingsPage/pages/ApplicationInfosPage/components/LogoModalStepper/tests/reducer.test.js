import reducer, { initialState } from '../reducer';

describe('ApplicationsInfosPage | LogoModalStepper | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return initialState', () => {
      const state = { ...initialState };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('SET_LOCAL_IMAGE', () => {
    it('should update localImage', () => {
      const state = { ...initialState };

      const file = new File(['(⌐□_□)'], 'michka.gif', { type: 'image/gif' });

      const action = {
        type: 'SET_LOCAL_IMAGE',
        value: {
          name: 'cat-logo-test.jpeg',
          rawFile: file,
          size: 9.948,
          url: 'blob:http://localhost:4000/4e6f9416-18f2-490d-b7a1-26a49d58c70e',
        },
      };

      const expected = { ...initialState, localImage: action.value };
      const actual = reducer(state, action);

      expect(actual).toEqual(expected);
    });
  });
});
