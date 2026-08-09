import { isDependencyInCwd } from '../process';

// the path has to be a literal, `jest.mock` calls are hoisted above any variable
jest.mock(
  '/fake/project/package.json',
  () => ({
    dependencies: { '@strapi/strapi': '5.0.0' },
    devDependencies: { '@strapi/sdk-plugin': '5.0.0', 'socket.io': '4.0.0' },
  }),
  { virtual: true }
);

const CWD = '/fake/project';

describe('isDependencyInCwd', () => {
  it('finds a dependency', () => {
    expect(isDependencyInCwd('@strapi/strapi', CWD)).toBe(true);
  });

  it('finds a dev dependency', () => {
    expect(isDependencyInCwd('@strapi/sdk-plugin', CWD)).toBe(true);
  });

  it('finds a dependency whose name contains a dot', () => {
    expect(isDependencyInCwd('socket.io', CWD)).toBe(true);
  });

  it('returns false for a dependency that is not listed', () => {
    expect(isDependencyInCwd('@strapi/admin', CWD)).toBe(false);
  });

  it('returns false when the cwd holds no package.json', () => {
    expect(isDependencyInCwd('@strapi/strapi', '/fake/empty')).toBe(false);
  });
});
