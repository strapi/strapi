import { shouldUseResponsiveGrid } from '../FormLayout';

describe('FormLayout responsive grid environment', () => {
  it('keeps the responsive layout for a real browser even when NODE_ENV is test', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(
      shouldUseResponsiveGrid(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36'
      )
    ).toBe(true);
  });

  it('uses the fallback layout in JSDOM', () => {
    expect(shouldUseResponsiveGrid('Mozilla/5.0 (jsdom/26.1.0)')).toBe(false);
  });

  it('keeps the responsive layout when navigator is unavailable', () => {
    expect(shouldUseResponsiveGrid(undefined)).toBe(true);
  });
});
