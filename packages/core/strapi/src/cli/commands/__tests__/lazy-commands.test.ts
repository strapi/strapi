/**
 * Every command module is imported when the CLI starts, so `build` and `develop` must not
 * statically import their implementation: it pulls in the admin build toolchain (including
 * `@strapi/admin` source via `staticFiles`), which `strapi start` never needs.
 */
jest.mock('../../../node/build', () => {
  throw new Error('node/build was loaded eagerly');
});
jest.mock('../../../node/develop', () => {
  throw new Error('node/develop was loaded eagerly');
});

describe('build and develop commands', () => {
  test('do not load their implementation when the command module is imported', async () => {
    await expect(import('../build')).resolves.toHaveProperty('command');
    await expect(import('../develop')).resolves.toHaveProperty('command');
  });
});
