import isAbsoluteUrl from '../index';

describe('isAbsoluteUrl', () => {
  test('can check is a provided url is absolute or not', () => {
    expect(isAbsoluteUrl('')).toBeFalsy();
    expect(isAbsoluteUrl('http://example.com')).toBeTruthy();
    expect(isAbsoluteUrl('HTTP://EXAMPLE.COM')).toBeTruthy();
    expect(isAbsoluteUrl('https://www.exmaple.com')).toBeTruthy();
    expect(isAbsoluteUrl('//example.com')).toBeTruthy();
    expect(isAbsoluteUrl('ftp://example.com/file.txt')).toBeTruthy();
    expect(isAbsoluteUrl('//cdn.example.com/lib.js')).toBeTruthy();
    expect(isAbsoluteUrl('git+ssh://example.con/item')).toBeTruthy();
    expect(isAbsoluteUrl('example.com')).toBeFalsy();
    expect(isAbsoluteUrl('/about')).toBeFalsy();
    expect(isAbsoluteUrl('/redirect?target=http://example.org')).toBeFalsy();
    expect(isAbsoluteUrl('test')).toBeFalsy();
    expect(isAbsoluteUrl(1)).toBeFalsy();
  });
});