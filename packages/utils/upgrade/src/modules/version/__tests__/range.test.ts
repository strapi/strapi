import semver from 'semver';
import { rangeFactory, rangeFromReleaseType, rangeFromVersions } from '../range';
import * as Version from '../types';

describe('Version Utilities', () => {
  describe('rangeFactory', () => {
    it('should create a semver.Range with the given range string', () => {
      const rangeString = '>=1.0.0 <2.0.0';

      const range = rangeFactory(rangeString);
      expect(range).toBeInstanceOf(semver.Range);
      expect(range.raw).toBe(rangeString);
    });
  });

  describe('rangeFromReleaseType', () => {
    it('should create a range for Major release type', () => {
      const currentVersion = new semver.SemVer('1.0.0');

      const range = rangeFromReleaseType(currentVersion, Version.ReleaseType.Major);
      expect(range).toBeInstanceOf(semver.Range);
      expect(range.raw).toBe('>1.0.0 <=2.0.0');
    });

    it('should throw for unsupported release types', () => {
      const currentVersion = new semver.SemVer('1.0.0');
      expect(() =>
        rangeFromReleaseType(currentVersion, 'unsupported' as Version.ReleaseType)
      ).toThrow('Not implemented');
    });
  });

  describe('rangeFromVersions', () => {
    it('should create a range when target is a SemVer instance', () => {
      jest.resetAllMocks();
      const currentVersion = new semver.SemVer('1.0.0');
      const targetVersion = new semver.SemVer('1.5.0');

      const range = rangeFromVersions(currentVersion, targetVersion);
      expect(range).toBeInstanceOf(semver.Range);
      expect(range.raw).toBe(`>${currentVersion.raw} <=${targetVersion.raw}`);
    });

    it.each([[Version.ReleaseType.Major, '>1.0.0 <=2.0.0']])(
      'should create a range when target is %s',
      (releaseType, expectedRange) => {
        const currentVersion = new semver.SemVer('1.0.0');

        const range = rangeFromVersions(currentVersion, releaseType);
        expect(range).toBeInstanceOf(semver.Range);
        expect(range.raw).toBe(expectedRange);
      }
    );

    it('should throw for invalid targets', () => {
      const currentVersion = { raw: '1.0.0' } as Version.SemVer;
      const target = 'invalid' as unknown as Version.ReleaseType | Version.SemVer;

      expect(() => rangeFromVersions(currentVersion, target)).toThrow();
    });
  });
});
