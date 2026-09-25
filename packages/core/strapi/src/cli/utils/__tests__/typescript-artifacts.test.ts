import { getTypeArtifacts, isStrictTypesEnabled } from '../typescript-artifacts';

const strapiWithConfig = (strictTypes: unknown) =>
  ({ config: { get: jest.fn(() => strictTypes) } }) as any;

describe('typescript.strictTypes', () => {
  test('is off when unset', () => {
    expect(isStrictTypesEnabled(strapiWithConfig(undefined))).toBe(false);
  });

  test.each([true, false])('accepts %s', (value) => {
    expect(isStrictTypesEnabled(strapiWithConfig(value))).toBe(value);
  });

  test.each(['true', 1, null, {}])('rejects %p', (value) => {
    expect(() => isStrictTypesEnabled(strapiWithConfig(value))).toThrow(
      /Invalid config\.typescript\.strictTypes value/
    );
  });

  test('always generates content-types and components', () => {
    expect(getTypeArtifacts(strapiWithConfig(undefined))).toEqual({
      contentTypes: true,
      components: true,
      services: false,
      plugins: false,
    });
  });

  test('adds the strict artifacts when enabled', () => {
    expect(getTypeArtifacts(strapiWithConfig(true))).toEqual({
      contentTypes: true,
      components: true,
      services: true,
      plugins: true,
    });
  });
});
