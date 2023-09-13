import { spawn, cleanup } from '../../tests/spawn';

/**
 * This has issues running in the CI due to how yarn3 works.
 */
describe.skip('cli', () => {
  afterAll(async () => {
    await cleanup();
  });

  const timeout = 1000 * 50;

  it(
    'should build `cjs-js` package',
    async () => {
      const project = await spawn('cjs-js');

      await project.install();

      const { stdout } = await project.run('build');

      expect(stdout).toContain('./src/index.js → ./dist/index.mjs');
      expect(stdout).toContain('./src/index.js → ./dist/index.js');

      await project.remove();
    },
    timeout
  );

  it(
    'should build `esm-js` package',
    async () => {
      const project = await spawn('esm-js');

      await project.install();

      const { stdout } = await project.run('build');

      expect(stdout).toContain('./src/index.js → ./dist/index.cjs');
      expect(stdout).toContain('./src/index.js → ./dist/index.js');

      await project.remove();
    },
    timeout
  );
});
