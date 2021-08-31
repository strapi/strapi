import canDownloadFile from '../canDownloadFile';

describe('UPLOAD | utils | canDownloadFile', () => {
  it('should return false if the url is undefined', () => {
    const data = undefined;

    expect(canDownloadFile(data)).toBeFalsy();
  });

  it('should return false if the url is null', () => {
    const data = null;

    expect(canDownloadFile(data)).toBeFalsy();
  });

  it('should return false if the url is not a string', () => {
    const data = {};

    expect(canDownloadFile(data)).toBeFalsy();
  });

  it('should return false if the url starts with "test"', () => {
    const data = 'test';

    expect(canDownloadFile(data)).toBeFalsy();
  });

  it('should return false if the url starts with ""', () => {
    const data = '';

    expect(canDownloadFile(data)).toBeFalsy();
  });

  it('should return true if the url starts with "/"', () => {
    const data = '/';

    expect(canDownloadFile(data)).toBeTruthy();
  });
});
