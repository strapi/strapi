import type { Logger } from '../../utils/logger';
import { PackageJson, getExportExtensionMap } from '../../utils/pkg';
import { BuildContext, createBuildContext, createBuildTasks } from '../packages';

describe('packages', () => {
  const loggerMock = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  const extMap = getExportExtensionMap();

  const pkg = {
    name: 'test',
    version: '0.0.1',
    exports: {
      './package.json': './package.json',
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.mjs',
        require: './dist/index.js',
      },
    },
    module: './dist/index.mjs',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    dependencies: {
      react: '^17.0.2',
    },
    devDependencies: {
      typescript: '^4.3.5',
    },
    peerDependencies: {
      'styled-components': '^5.3.1',
    },
  } as unknown as PackageJson;

  describe('createBuildContext', () => {
    it('should return a valid exports list', async () => {
      const ctx = await createBuildContext({
        cwd: '/',
        extMap,
        logger: loggerMock,
        pkg,
      });

      expect(ctx.exports).toMatchInlineSnapshot(`
        {
          ".": {
            "default": "./dist/index.mjs",
            "import": "./dist/index.mjs",
            "require": "./dist/index.js",
            "source": undefined,
            "types": "./dist/index.d.ts",
          },
        }
      `);
    });

    it('should return a valid externals list', async () => {
      const ctx = await createBuildContext({
        cwd: '/',
        extMap,
        logger: loggerMock,
        pkg,
      });

      expect(ctx.external).toMatchInlineSnapshot(`
        [
          "react",
          "styled-components",
        ]
      `);
    });

    it("should return a valid 'dist' path", async () => {
      const ctx = await createBuildContext({
        cwd: '/',
        extMap,
        logger: loggerMock,
        pkg,
      });

      expect(ctx.distPath).toMatchInlineSnapshot(`"/dist"`);
    });

    it('should return a valid targets map', async () => {
      const ctx = await createBuildContext({
        cwd: '/',
        extMap,
        logger: loggerMock,
        pkg,
      });

      expect(ctx.targets).toMatchInlineSnapshot(`
        {
          "*": [
            "chrome114",
            "edge113",
            "firefox102",
            "ios14",
            "node16.0",
            "safari14",
          ],
          "node": [
            "node16.0",
          ],
          "web": [
            "esnext",
          ],
        }
      `);
    });

    it('parse the browserslist property in the pkg.json if available and set as the universal target in the targets map', async () => {
      const ctx = await createBuildContext({
        cwd: '/',
        extMap,
        logger: loggerMock,
        pkg: {
          ...pkg,
          browserslist: ['node 18'],
        },
      });

      expect(ctx.targets['*']).toMatchInlineSnapshot(`
        [
          "node18.5",
        ]
      `);
    });

    it('should throw an error if the cwd and dist path are the same', async () => {
      await expect(
        createBuildContext({
          cwd: '/',
          extMap,
          logger: loggerMock,
          pkg: {
            ...pkg,
            exports: {
              './package.json': './package.json',
              '.': {
                types: './index.d.ts',
                import: './index.mjs',
                require: './index.js',
              },
            },

            module: './index.mjs',
            main: './index.js',
            types: './index.d.ts',
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"all output files must share a common parent directory which is not the root package directory"`
      );
    });
  });

  describe('createBuildTasks', () => {
    let ctx: BuildContext;

    beforeAll(async () => {
      ctx = await createBuildContext({
        cwd: '/',
        extMap,
        logger: loggerMock,
        pkg,
      });
    });

    it('should produce a valid list of build tasks', async () => {
      const tasks = await createBuildTasks(ctx);

      expect(tasks).toMatchInlineSnapshot(`
        [
          {
            "entries": [
              {
                "exportPath": ".",
                "importId": "test",
                "sourcePath": undefined,
                "targetPath": "./dist/index.d.ts",
              },
            ],
            "type": "build:dts",
          },
          {
            "entries": [
              {
                "entry": undefined,
                "path": ".",
              },
            ],
            "format": "cjs",
            "output": "./dist/index.js",
            "runtime": "*",
            "type": "build:js",
          },
          {
            "entries": [
              {
                "entry": undefined,
                "path": ".",
              },
            ],
            "format": "es",
            "output": "./dist/index.mjs",
            "runtime": "*",
            "type": "build:js",
          },
        ]
      `);
    });
  });
});
