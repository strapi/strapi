import { normalizeModuleExport } from '../import-module';

describe('normalizeModuleExport', () => {
  test('returns primitives as-is', () => {
    expect(normalizeModuleExport(null)).toBe(null);
    expect(normalizeModuleExport(42)).toBe(42);
  });

  test('unwraps __esModule default exports', () => {
    const value = { foo: 'bar' };
    expect(normalizeModuleExport({ __esModule: true, default: value })).toBe(value);
  });

  test('unwraps default-only namespace objects', () => {
    const value = { compile: jest.fn() };
    expect(normalizeModuleExport({ default: value })).toBe(value);
  });

  test('keeps named export namespaces intact', () => {
    const mod = { default: { RateLimit: 1 }, RateLimit: 1 };
    expect(normalizeModuleExport(mod)).toBe(mod);
  });
});
