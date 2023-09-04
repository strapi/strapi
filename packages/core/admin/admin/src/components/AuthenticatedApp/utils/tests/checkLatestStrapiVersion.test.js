import checkLatestStrapiVersion from '../checkLatestStrapiVersion';

describe('ADMIN | utils | checkLatestStrapiVersion', () => {
  it('should return true if the current version is lower than the latest published version', () => {
    expect(checkLatestStrapiVersion('v3.3.2', 'v3.3.4')).toBeTruthy();
    expect(checkLatestStrapiVersion('3.3.2', 'v3.3.4')).toBeTruthy();
    expect(checkLatestStrapiVersion('v3.3.2', '3.3.4')).toBeTruthy();
    expect(checkLatestStrapiVersion('3.3.2', '3.3.4')).toBeTruthy();
  });
  it('should return false if the current version is equal to the latest published version', () => {
    expect(checkLatestStrapiVersion('3.3.4', 'v3.3.4')).toBeFalsy();
    expect(checkLatestStrapiVersion('v3.3.4', '3.3.4')).toBeFalsy();
    expect(checkLatestStrapiVersion('3.3.4', '3.3.4')).toBeFalsy();
  });
  it('should return false if the current version is a beta of the next release', () => {
    expect(checkLatestStrapiVersion('3.4.0-beta.1', 'v3.3.4')).toBeFalsy();
    expect(checkLatestStrapiVersion('v3.4.0-beta.1', '3.3.4')).toBeFalsy();
    expect(checkLatestStrapiVersion('3.4.0-beta.1', '3.3.4')).toBeFalsy();
  });
});
