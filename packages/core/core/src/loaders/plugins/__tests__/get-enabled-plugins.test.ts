import path from 'path';
import { toDetailedDeclaration } from '../get-enabled-plugins';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  statSync: jest.fn().mockReturnValue({ isDirectory: () => true }),
}));

describe('toDetailedDeclaration - local plugin resolution', () => {
  const originalStrapi = (global as any).strapi;

  beforeEach(() => {
    (global as any).strapi = {
      dirs: {
        dist: { root: '/app/dist' },
        app: { root: '/app' },
      },
      plugins: {},
      plugin: jest.fn(),
    };
  });

  afterEach(() => {
    if (originalStrapi !== undefined) {
      (global as any).strapi = originalStrapi;
    }
  });

  it('resolves a local plugin path against dirs.dist.root (not app.root)', () => {
    const result = toDetailedDeclaration({
      enabled: true,
      resolve: './src/plugins/my-plugin',
      isModule: false,
    });

    expect(result.pathToPlugin).toBe(path.resolve('/app/dist', './src/plugins/my-plugin'));
  });
});
