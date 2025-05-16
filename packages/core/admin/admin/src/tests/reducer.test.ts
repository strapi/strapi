import {
  reducer,
  setAppTheme,
  setAvailableThemes,
  setLocale,
  login,
  logout,
  setToken,
} from '../reducer';
import { setCookie, deleteCookie } from '../utils/cookies';

jest.mock('../utils/cookies', () => ({
  setCookie: jest.fn(),
  deleteCookie: jest.fn(),
}));

describe('admin_app reducer', () => {
  afterEach(() => {
    /**
     * Both the locale & theme are stored in localStorage.
     * We need to clear it after each test to avoid side effects.
     */
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  describe('admin_app reducer', () => {
    it('should return the initial state', () => {
      expect(reducer(undefined, { type: undefined })).toEqual({
        language: {
          locale: 'en',
          localeNames: { en: 'English' },
        },
        permissions: {},
        theme: {
          availableThemes: [],
          currentTheme: 'system',
        },
        token: null,
      });
    });

    describe('theme', () => {
      it('should set the theme', () => {
        const state = reducer(undefined, setAppTheme('dark'));

        expect(state).toEqual({
          language: {
            locale: 'en',
            localeNames: { en: 'English' },
          },
          permissions: {},
          theme: {
            availableThemes: [],
            currentTheme: 'dark',
          },
          token: null,
        });
      });

      it('should set the available themes', () => {
        const state = reducer(undefined, setAvailableThemes(['dark', 'light']));

        expect(state).toEqual({
          language: {
            locale: 'en',
            localeNames: { en: 'English' },
          },
          permissions: {},
          theme: {
            availableThemes: ['dark', 'light'],
            currentTheme: 'system',
          },
          token: null,
        });
      });
    });

    describe('language', () => {
      it('should set the locale', () => {
        const state = reducer(undefined, setLocale('fr'));

        expect(state).toEqual({
          language: {
            locale: 'fr',
            localeNames: { en: 'English' },
          },
          permissions: {},
          theme: {
            availableThemes: [],
            currentTheme: 'system',
          },
          token: null,
        });
      });
    });
  });

  describe('auth', () => {
    it('should set the token directly', () => {
      const result = reducer(undefined, setToken('1234'));
      expect(result.token).toBe('1234');
    });

    it('should handle login with persist=false (session)', () => {
      const result = reducer(undefined, login({ token: 'abcd', persist: false }));

      expect(result.token).toBe('abcd');
      expect(setCookie).toHaveBeenCalledWith('jwtToken', 'abcd');
      expect(localStorage.getItem('isLoggedIn')).toBe('true');
    });

    it('should handle login with persist=true (localStorage)', () => {
      const result = reducer(undefined, login({ token: 'abcd', persist: true }));

      expect(result.token).toBe('abcd');
      expect(localStorage.getItem('jwtToken')).toBe(JSON.stringify('abcd'));
      expect(setCookie).not.toHaveBeenCalled();
    });

    it('should handle logout', () => {
      localStorage.setItem('jwtToken', 'abcd');
      localStorage.setItem('isLoggedIn', 'true');

      const result = reducer({ ...reducer(undefined, login({ token: 'abcd' })) }, logout());

      expect(result.token).toBe(null);
      expect(localStorage.getItem('jwtToken')).toBe(null);
      expect(localStorage.getItem('isLoggedIn')).toBe(null);
      expect(deleteCookie).toHaveBeenCalledWith('jwtToken');
    });
  });
});
