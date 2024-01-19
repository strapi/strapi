import semver from 'semver';
import { semVerFactory, isLiteralSemVer, isSemverInstance, isSemVerReleaseType } from '../semver';
import * as Version from '../types';

describe('Version Utilities', () => {
  // semVerFactory Function Test
  describe('semVerFactory', () => {
    it('should create a semver.SemVer instance', () => {
      const version = '1.0.0';
      const semVer = semVerFactory(version);
      expect(semVer).toBeInstanceOf(semver.SemVer);
    });
  });

  describe('isLiteralSemVer', () => {
    it('should return true for valid semver strings', () => {
      expect(isLiteralSemVer('1.0.0')).toBe(true);
      expect(isLiteralSemVer('0.0.1')).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(isLiteralSemVer('1.0')).toBe(false);
      expect(isLiteralSemVer('1.0.x')).toBe(false);
      expect(isLiteralSemVer('test')).toBe(false);
    });
  });

  // isSemVer Function Test
  describe('isSemVer', () => {
    it('should return true for semver.SemVer instances', () => {
      const semVerInstance = new semver.SemVer('1.0.0');
      expect(isSemverInstance(semVerInstance)).toBe(true);
    });

    it('should return false for non-SemVer instances', () => {
      expect(isSemverInstance({})).toBe(false);
      expect(isSemverInstance('1.0.0')).toBe(false);
    });
  });

  describe('isSemVerReleaseType', () => {
    it('should return true for valid release types', () => {
      expect(isSemVerReleaseType(Version.ReleaseType.Major)).toBe(true);
      expect(isSemVerReleaseType(Version.ReleaseType.Minor)).toBe(true);
      expect(isSemVerReleaseType(Version.ReleaseType.Patch)).toBe(true);
    });

    it('should return false for invalid release types', () => {
      expect(isSemVerReleaseType('invalid')).toBe(false);
    });
  });
});
