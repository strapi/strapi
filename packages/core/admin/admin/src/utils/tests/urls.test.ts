import { createAbsoluteUrl } from '../urls';

describe('urls', () => {
  describe('createAbsoluteUrl', () => {
    it('should return the url if it is an absolute URL', () => {
      expect(createAbsoluteUrl('https://example.com')).toBe('https://example.com');
    });

    it('should return the window.location.origin if the url is not provided', () => {
      expect(createAbsoluteUrl()).toBe('http://localhost:1337');
    });

    it('should return the window.location.origin prefixed to the provided url if the url is relative', () => {
      expect(createAbsoluteUrl('/example')).toBe('http://localhost:1337/example');
    });

    it('should handle protocol relative URLs', () => {
      expect(createAbsoluteUrl('//example.com')).toBe('http://example.com');
    });
  });
});
