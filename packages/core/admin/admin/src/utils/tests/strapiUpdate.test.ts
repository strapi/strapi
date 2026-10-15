import { getReleasesBehind, getStrapiUpdateInfo, isUpdateAvailable } from '../strapiUpdate';

describe('strapiUpdate', () => {
  describe('isUpdateAvailable', () => {
    it('returns false when versions are missing or invalid', () => {
      expect(isUpdateAvailable(undefined, 'v5.1.0')).toBe(false);
      expect(isUpdateAvailable('5.0.0', undefined)).toBe(false);
      expect(isUpdateAvailable('not-a-version', 'v5.1.0')).toBe(false);
    });

    it('accepts release tags prefixed with "v"', () => {
      expect(isUpdateAvailable('5.0.0', 'v5.1.0')).toBe(true);
    });
  });

  describe('getReleasesBehind', () => {
    it('counts minor versions only', () => {
      expect(getReleasesBehind('5.2.3', 'v5.14.0')).toBe(12);
    });

    it('returns 0 for a patch-only difference', () => {
      expect(getReleasesBehind('5.10.1', 'v5.10.4')).toBe(0);
    });

    it('returns 0 when there is no update', () => {
      expect(getReleasesBehind('5.10.0', 'v5.10.0')).toBe(0);
      expect(getReleasesBehind('5.11.0', 'v5.10.0')).toBe(0);
    });

    it('returns 0 across majors', () => {
      expect(getReleasesBehind('4.25.0', 'v5.3.0')).toBe(0);
    });
  });

  describe('getStrapiUpdateInfo', () => {
    it('returns "none" when up to date', () => {
      expect(getStrapiUpdateInfo('5.10.0', 'v5.10.0')).toEqual({
        severity: 'none',
        releasesBehind: 0,
        isMajorBehind: false,
      });
    });

    it('returns "default" when 1 minor behind', () => {
      expect(getStrapiUpdateInfo('5.9.0', 'v5.10.0')).toEqual({
        severity: 'default',
        releasesBehind: 1,
        isMajorBehind: false,
      });
    });

    it('returns "default" when exactly 10 minors behind', () => {
      expect(getStrapiUpdateInfo('5.0.0', 'v5.10.0')).toEqual({
        severity: 'default',
        releasesBehind: 10,
        isMajorBehind: false,
      });
    });

    it('returns "urgent" when 11 minors behind', () => {
      expect(getStrapiUpdateInfo('5.0.0', 'v5.11.0')).toEqual({
        severity: 'urgent',
        releasesBehind: 11,
        isMajorBehind: false,
      });
    });

    it('returns "urgent" when on an older major', () => {
      expect(getStrapiUpdateInfo('4.25.0', 'v5.0.0')).toEqual({
        severity: 'urgent',
        releasesBehind: 0,
        isMajorBehind: true,
      });
    });

    it('returns "default" for a patch-only difference', () => {
      expect(getStrapiUpdateInfo('5.10.1', 'v5.10.4')).toEqual({
        severity: 'default',
        releasesBehind: 0,
        isMajorBehind: false,
      });
    });
  });
});
