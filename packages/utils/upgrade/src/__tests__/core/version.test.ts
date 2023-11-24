import {
  isVersionRelease,
  isLatestVersion,
  isVersion,
  isSemVer,
  createSemverRange,
  formatSemVer,
} from '../../core';
import semver from 'semver';

describe('Version', () => {
  test.each([
    ['5', false],
    ['5.0', false],
    ['5.0.0', false],
    ['5.0.0.0', false],
    ['next', true],
    ['current', true],
    ['latest', true],
    ['major', true],
    ['minor', true],
    ['patch', true],
    ['foo', false],
    ['bar', false],
    ['v5.0.0', false],
  ])('Is version release? (%s)', (version, expected) => {
    const result = isVersionRelease(version);
    expect(result).toBe(expected);
  });

  test.each([
    ['5', false],
    ['5.0', false],
    ['5.0.0', false],
    ['5.0.0.0', false],
    ['next', false],
    ['current', false],
    ['latest', true],
    ['major', false],
    ['minor', false],
    ['patch', false],
    ['foo', false],
    ['bar', false],
    ['v5.0.0', false],
  ])('Is Latest version? (%s)', (version, expected) => {
    const result = isLatestVersion(version);
    expect(result).toBe(expected);
  });

  test.each([
    ['5', false],
    ['5.0', false],
    ['5.0.0', true],
    ['5.0.0.0', false],
    ['next', true],
    ['current', true],
    ['latest', true],
    ['major', true],
    ['minor', true],
    ['patch', true],
    ['foo', false],
    ['bar', false],
    ['v5.0.0', false],
  ])('Is valid version? (%s)', (version, expected) => {
    const result = isVersion(version);
    expect(result).toBe(expected);
  });

  test.each([
    ['5', false],
    ['5.0', false],
    ['5.0.0', true],
    ['5.0.0.0', false],
    ['latest', false],
    ['major', false],
    ['minor', false],
    ['patch', false],
    ['foo', false],
    ['bar', false],
    ['v5.0.0', false],
  ])('Is valid semantic versioning? (%s)', (version, expected) => {
    const result = isSemVer(version);
    expect(result).toBe(expected);
  });

  describe('Create SemVer Range', () => {
    test('Create a range to a specific version', () => {
      const from = '4.0.0';
      const to = '6.0.0';

      const range = createSemverRange(`>${from} <=${to}`);

      expect(range.test(from)).toBe(false);

      expect(range.test('5.0.0')).toBe(true);
      expect(range.test(to)).toBe(true);
    });

    test('Create a range to "latest"', () => {
      const from = '4.0.0';

      const range = createSemverRange(`>${from}`);

      expect(range.test(from)).toBe(false);

      expect(range.test('9.0.0')).toBe(true);
    });
  });

  describe('Format SemVer', () => {
    const version = new semver.SemVer('4.15.5');

    test('Format to <major>', () => {
      const formatted = formatSemVer(version, 'x');
      expect(formatted).toBe('4');
    });

    test('Format to <major>.<minor>', () => {
      const formatted = formatSemVer(version, 'x.x');
      expect(formatted).toBe('4.15');
    });

    test('Format to <major>.<minor>.<patch>', () => {
      const formatted = formatSemVer(version, 'x.x.x');
      expect(formatted).toBe('4.15.5');
    });
  });
});
