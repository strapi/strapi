import type { Core } from '@strapi/types';

import { getTypesOutDir } from '../types-out-dir';

const buildStrapiMock = (outDir: unknown) =>
  ({
    config: {
      get: jest.fn((key: string) => (key === 'typescript.outDir' ? outDir : undefined)),
    },
  }) as unknown as Pick<Core.Strapi, 'config'>;

describe('getTypesOutDir', () => {
  test.each([undefined, null, ''])('returns undefined when typescript.outDir is %p', (value) => {
    expect(getTypesOutDir(buildStrapiMock(value))).toBeUndefined();
  });

  test('returns the configured directory', () => {
    expect(getTypesOutDir(buildStrapiMock('../../packages/generated-types'))).toBe(
      '../../packages/generated-types'
    );
  });

  test('throws when typescript.outDir is not a string', () => {
    expect(() => getTypesOutDir(buildStrapiMock(42))).toThrow(
      'Invalid "typescript.outDir" config: expected a string, received number'
    );
  });
});
