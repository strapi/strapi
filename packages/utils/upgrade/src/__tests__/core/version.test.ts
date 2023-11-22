import {
  isVersionRelease,
  isLatestVersion,
  isVersion,
  isSemVer,
  createSemverRange,
  VersionRelease,
} from '../../core';

describe('Version', () => {
  test.each([
    ['5', false],
    ['5.0', false],
    ['5.0.0', false],
    ['5.0.0.0', false],
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

      const range = createSemverRange({ from, to });

      expect(range.raw).toStrictEqual(`>${from} <=${to}`);
    });

    test('Create a range to "latest"', () => {
      const from = '4.0.0';
      const to = VersionRelease.Latest;

      const range = createSemverRange({ from, to });

      expect(range.raw).toStrictEqual(`>${from}`);
    });

    test('Throw on invalid boundaries', () => {
      const from = '6.0.0';
      const to = '4.0.0';

      expect(() => createSemverRange({ from, to })).toThrowError(
        `Upper boundary (${to}) must be greater than lower boundary (${from})`
      );
    });
  });
});
