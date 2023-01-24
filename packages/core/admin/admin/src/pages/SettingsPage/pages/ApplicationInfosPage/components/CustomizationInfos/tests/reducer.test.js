import reducer, { initialState } from '../reducer';

describe('ApplicationsInfosPage | Form | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return initialState', () => {
      const state = { ...initialState };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('SET_CUSTOM_MENU_LOGO', () => {
    it('should update menu logo', () => {
      const state = { ...initialState };

      const file = new File(['(⌐□_□)'], 'michka.png', { type: 'image/png' });

      const action = {
        type: 'SET_CUSTOM_MENU_LOGO',
        value: {
          ext: 'svg',
          height: 256,
          name: 'cat-thin.svg',
          rawFile: file,
          size: 1.304,
          url: 'blob:http://localhost:4000/8df78e52-bcf2-4deb-9dc8-04e2bf69b748',
          width: 256,
        },
      };

      const expected = {
        ...initialState,
        menuLogo: {
          display: { ...action.value },
          submit: {
            rawFile: action.value.rawFile,
            isReset: false,
          },
        },
      };

      const actual = reducer(state, action);

      expect(actual).toEqual(expected);
    });

    it('should reset menu logo', () => {
      const file = new File(['(⌐□_□)'], 'michka.png', { type: 'image/png' });
      const state = {
        ...initialState,
        menuLogo: {
          display: {
            ext: 'svg',
            height: 256,
            name: 'cat-thin.svg',
            rawFile: file,
            size: 1.304,
            url: 'blob:http://localhost:4000/8df78e52-bcf2-4deb-9dc8-04e2bf69b748',
            width: 256,
          },
          submit: {
            rawFile: file,
            isReset: false,
          },
        },
      };

      const action = {
        type: 'RESET_CUSTOM_MENU_LOGO',
      };

      const expected = {
        ...initialState,
        menuLogo: {
          display: null,
          submit: {
            rawFile: null,
            isReset: true,
          },
        },
      };

      const actual = reducer(state, action);

      expect(actual).toEqual(expected);
    });
  });

  describe('SET_CUSTOM_AUTH_LOGO', () => {
    it('should update auth logo', () => {
      const state = { ...initialState };

      const file = new File(['(⌐□_□)'], 'michka.png', { type: 'image/png' });

      const action = {
        type: 'SET_CUSTOM_AUTH_LOGO',
        value: {
          ext: 'svg',
          height: 256,
          name: 'cat-thin.svg',
          rawFile: file,
          size: 1.304,
          url: 'blob:http://localhost:4000/8df78e52-bcf2-4deb-9dc8-04e2bf69b748',
          width: 256,
        },
      };

      const expected = {
        ...initialState,
        authLogo: {
          display: { ...action.value },
          submit: {
            rawFile: action.value.rawFile,
            isReset: false,
          },
        },
      };

      const actual = reducer(state, action);

      expect(actual).toEqual(expected);
    });

    it('should reset auth logo', () => {
      const file = new File(['(⌐□_□)'], 'michka.png', { type: 'image/png' });
      const state = {
        ...initialState,
        authLogo: {
          display: {
            ext: 'svg',
            height: 256,
            name: 'cat-thin.svg',
            rawFile: file,
            size: 1.304,
            url: 'blob:http://localhost:4000/8df78e52-bcf2-4deb-9dc8-04e2bf69b748',
            width: 256,
          },
          submit: {
            rawFile: file,
            isReset: false,
          },
        },
      };

      const action = {
        type: 'RESET_CUSTOM_AUTH_LOGO',
      };

      const expected = {
        ...initialState,
        authLogo: {
          display: null,
          submit: {
            rawFile: null,
            isReset: true,
          },
        },
      };

      const actual = reducer(state, action);

      expect(actual).toEqual(expected);
    });
  });
});
