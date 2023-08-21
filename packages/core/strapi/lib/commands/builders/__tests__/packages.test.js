'use strict';

const { getExportExtensionMap } = require('../../utils/pkg');
const { createBuildContext, createBuildTasks } = require('../packages');

describe('packages', () => {
  const loggerMock = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

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
  };

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

    it('should return a valid target list', async () => {
      const ctx = await createBuildContext({
        cwd: '/',
        extMap,
        logger: loggerMock,
        pkg,
      });

      expect(ctx.target).toMatchInlineSnapshot(`
        [
          "chrome114",
          "edge113",
          "firefox102",
          "ios14",
          "node16.0",
          "safari14",
        ]
      `);
    });

    it('parse the browserslist property in the pkg.json if available', async () => {
      const ctx = await createBuildContext({
        cwd: '/',
        extMap,
        logger: loggerMock,
        pkg: {
          ...pkg,
          browserslist: ['node 18'],
        },
      });

      expect(ctx.target).toMatchInlineSnapshot(`
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
    let ctx;

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
            "type": "build:js",
          },
        ]
      `);
    });
  });
});
