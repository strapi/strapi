import { spawn } from '../../tests/spawn';

/**
 * This has issues running in the CI due to how yarn3 works.
 */
// TODO: move this to an actual CLI test since it's too flaky and isn't really necessary since it is already de-facto tested by building everything
describe.skip('cli', () => {
  const timeout = 1000 * 120;

  describe('build & check', () => {
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
});
