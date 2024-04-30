import { getCookieValue, deleteCookie } from '../src/utils/cookies';
describe('Cookie utils', () => {
  beforeEach(() => {
    document.cookie = 'cookie1=value1;';
    document.cookie = 'cookie2=value2;';
    document.cookie = 'cookie3=value3;';
  });

  describe('getCookieValue', () => {
    it('should return the value of the specified cookie', () => {
      expect(getCookieValue('cookie1')).toBe('value1');
      expect(getCookieValue('cookie2')).toBe('value2');
      expect(getCookieValue('cookie3')).toBe('value3');
    });

    it('should return null if the specified cookie does not exist', () => {
      expect(getCookieValue('cookie4')).toBeNull();
      expect(getCookieValue('cookie5')).toBeNull();
    });
  });

  describe('deleteCookie', () => {
    it('should delete the specified cookie', () => {
      deleteCookie('cookie2');
      expect(document.cookie).toBe('cookie1=value1; cookie3=value3');
    });

    it('should not delete any cookies if the specified cookie does not exist', () => {
      deleteCookie('cookie4');
      expect(document.cookie.split(';')).toEqual(
        expect.arrayContaining('cookie1=value1; cookie2=value2; cookie3=value3'.split(';'))
      );
    });
  });
});
