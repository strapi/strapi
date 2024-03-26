import { validateExportsOrdering, parseExports, getExportExtensionMap } from '../exports';
import { PackageJson } from '../pkg';

const loggerMock = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('exports', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('validateExportsOrdering', () => {
    it('should throw if there are no exports at all and log that error', async () => {
      const pkg = {
        name: 'testing',
        version: '0.0.0',
      };

      await expect(
        // @ts-expect-error - we are testing the error case
        validateExportsOrdering({ pkg, logger: loggerMock })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"'package.json' must contain a 'main' and 'module' property"`
      );
    });

    it("should return the package if there is at least a 'main' or 'module' property", async () => {
      // @ts-expect-error - issue with Yup inference
      const pkg: PackageJson = {
        name: 'testing',
        version: '0.0.0',
        main: './index.js',
      };

      // @ts-expect-error - Logger is mocked
      const validatedPkg = await validateExportsOrdering({ pkg, logger: loggerMock });

      expect(validatedPkg).toMatchInlineSnapshot(`
            {
              "main": "./index.js",
              "name": "testing",
              "version": "0.0.0",
            }
          `);
    });

    it('should return the package if there is an exports property with a valid structure', async () => {
      const pkg: PackageJson = {
        name: 'testing',
        version: '0.0.0',
        exports: {
          './package.json': './package.json',
          // @ts-expect-error - issue with Yup inference
          './admin': {
            types: './admin/index.d.ts',
            import: './admin/index.js',
            require: './admin/index.cjs',
            source: './src/admin/index.js',
            default: './admin/index.js',
          },
        },
      };

      // @ts-expect-error - Logger is mocked
      const validatedPkg = await validateExportsOrdering({ pkg, logger: loggerMock });

      expect(validatedPkg).toMatchInlineSnapshot(`
        {
          "exports": {
            "./admin": {
              "default": "./admin/index.js",
              "import": "./admin/index.js",
              "require": "./admin/index.cjs",
              "source": "./src/admin/index.js",
              "types": "./admin/index.d.ts",
            },
            "./package.json": "./package.json",
          },
          "name": "testing",
          "version": "0.0.0",
        }
      `);
    });

    it('should throw if the types property is not the first in an export object', async () => {
      const pkg: PackageJson = {
        name: 'testing',
        version: '0.0.0',
        exports: {
          // @ts-expect-error - issue with Yup inference
          './admin': {
            import: './admin/index.js',
            types: './admin/index.d.ts',
            require: './admin/index.cjs',
            source: './src/admin/index.js',
            default: './admin/index.js',
          },
        },
      };

      await expect(
        // @ts-expect-error - Logger is mocked
        validateExportsOrdering({ pkg, logger: loggerMock })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"exports["./admin"]: the 'types' property should be the first property"`
      );
    });

    it('should log a warning if the require property comes before the import property in an export object', async () => {
      const pkg: PackageJson = {
        name: 'testing',
        version: '0.0.0',
        exports: {
          // @ts-expect-error - issue with Yup inference
          './admin': {
            types: './admin/index.d.ts',
            require: './admin/index.cjs',
            import: './admin/index.js',
            source: './src/admin/index.js',
            default: './admin/index.js',
          },
        },
      };

      // @ts-expect-error - Logger is mocked
      await validateExportsOrdering({ pkg, logger: loggerMock });

      expect(loggerMock.warn.mock.calls[0]).toMatchInlineSnapshot(`
            [
              "exports["./admin"]: the 'import' property should come before the 'require' property",
            ]
          `);
    });
  });

  describe('getExportExtensionMap', () => {
    it('should just return the default mapping', async () => {
      expect(getExportExtensionMap()).toMatchInlineSnapshot(`
            {
              "commonjs": {
                "cjs": ".js",
                "es": ".mjs",
              },
              "module": {
                "cjs": ".cjs",
                "es": ".js",
              },
            }
          `);
    });
  });

  describe('parseExports', () => {
    const extMap = getExportExtensionMap();

    it('should by default return a root exports map using the standard export fields from the pkg.json', () => {
      // @ts-expect-error - issue with Yup inference
      const pkg: PackageJson = {
        name: 'testing',
        version: '0.0.0',
        types: './dist/index.d.ts',
        main: './dist/index.js',
        module: './dist/index.mjs',
        source: './src/index.ts',
      };

      expect(parseExports({ pkg, extMap })).toMatchInlineSnapshot(`
            [
              {
                "_path": ".",
                "default": "./dist/index.mjs",
                "import": "./dist/index.mjs",
                "require": "./dist/index.js",
                "source": "./src/index.ts",
                "types": "./dist/index.d.ts",
              },
            ]
          `);
    });

    it("should not return anything if the standard export fields don't exist and there is no export map", () => {
      const pkg = {};

      // @ts-expect-error - We expect this to fail
      expect(parseExports({ pkg, extMap })).toMatchInlineSnapshot(`[]`);
    });

    it('should return a combination of the standard export fields and the export map if they both exist', () => {
      const pkg: PackageJson = {
        name: 'testing',
        version: '0.0.0',
        types: './dist/index.d.ts',
        main: './dist/index.js',
        module: './dist/index.mjs',
        source: './src/index.ts',
        exports: {
          './package.json': './package.json',
          // @ts-expect-error - issue with Yup inference
          './admin': {
            types: './admin/index.d.ts',
            import: './admin/index.mjs',
            require: './admin/index.js',
            default: './admin/index.js',
            source: './src/admin/index.js',
          },
        },
      };

      expect(parseExports({ pkg, extMap })).toMatchInlineSnapshot(`
            [
              {
                "_path": ".",
                "default": "./dist/index.mjs",
                "import": "./dist/index.mjs",
                "require": "./dist/index.js",
                "source": "./src/index.ts",
                "types": "./dist/index.d.ts",
              },
              {
                "_exported": true,
                "_path": "./admin",
                "default": "./admin/index.js",
                "import": "./admin/index.mjs",
                "require": "./admin/index.js",
                "source": "./src/admin/index.js",
                "types": "./admin/index.d.ts",
              },
            ]
          `);
    });

    it('should return just the exports map if there are no standard export fields and the export map exists', () => {
      const pkg: PackageJson = {
        name: 'testing',
        version: '0.0.0',
        exports: {
          './package.json': './package.json',
          // @ts-expect-error - issue with Yup inference
          './admin': {
            types: './admin/index.d.ts',
            import: './admin/index.mjs',
            require: './admin/index.js',
            default: './admin/index.js',
            source: './src/admin/index.js',
          },
        },
      };

      expect(parseExports({ pkg, extMap })).toMatchInlineSnapshot(`
            [
              {
                "_exported": true,
                "_path": "./admin",
                "default": "./admin/index.js",
                "import": "./admin/index.mjs",
                "require": "./admin/index.js",
                "source": "./src/admin/index.js",
                "types": "./admin/index.d.ts",
              },
            ]
          `);
    });

    it('should throw an error if you try to use an exports map without supplying an export for the package.json file', () => {
      const pkg: PackageJson = {
        name: 'testing',
        version: '0.0.0',
        exports: {
          // @ts-expect-error - issue with Yup inference
          './admin': {
            types: './admin/index.d.ts',
            import: './admin/index.mjs',
            require: './admin/index.js',
            default: './admin/index.js',
            source: './src/admin/index.js',
          },
        },
      };

      expect(() => parseExports({ pkg, extMap })).toThrowErrorMatchingInlineSnapshot(`
            "
            - package.json: \`exports["./package.json"] must be declared."
          `);
    });

    it('should throw an error if the pkg.json type is undefined and you try to export like a module', () => {
      const pkg: PackageJson = {
        name: 'testing',
        version: '0.0.0',
        exports: {
          './package.json': './package.json',
          // @ts-expect-error - issue with Yup inference
          './admin': {
            types: './admin/index.d.ts',
            import: './admin/index.js',
            require: './admin/index.cjs',
            default: './admin/index.cjs',
            source: './src/admin/index.js',
          },
        },
      };

      expect(() => parseExports({ pkg, extMap })).toThrowErrorMatchingInlineSnapshot(`
        "
        - package.json with 'type: "undefined"' - 'exports["./admin"].require' must end with ".js"
        - package.json with 'type: "undefined"' - 'exports["./admin"].import' must end with ".mjs""
      `);
    });

    it('should throw an error if the pkg.json type is commonjs and you try to export like a module', () => {
      const pkg: PackageJson = {
        name: 'testing',
        version: '0.0.0',
        type: 'commonjs',
        exports: {
          './package.json': './package.json',
          // @ts-expect-error - issue with Yup inference
          './admin': {
            types: './admin/index.d.ts',
            import: './admin/index.js',
            require: './admin/index.cjs',
            default: './admin/index.cjs',
            source: './src/admin/index.js',
          },
        },
      };

      expect(() => parseExports({ pkg, extMap })).toThrowErrorMatchingInlineSnapshot(`
        "
        - package.json with 'type: "commonjs"' - 'exports["./admin"].require' must end with ".js"
        - package.json with 'type: "commonjs"' - 'exports["./admin"].import' must end with ".mjs""
      `);
    });

    it('should throw an error if the pkg.json type is module and you try to export like a commonjs', () => {
      const pkg: PackageJson = {
        name: 'testing',
        version: '0.0.0',
        type: 'module',
        exports: {
          './package.json': './package.json',
          // @ts-expect-error - issue with Yup inference
          './admin': {
            types: './admin/index.d.ts',
            import: './admin/index.mjs',
            require: './admin/index.js',
            default: './admin/index.js',
            source: './src/admin/index.js',
          },
        },
      };

      expect(() => parseExports({ pkg, extMap })).toThrowErrorMatchingInlineSnapshot(`
        "
        - package.json with 'type: "module"' - 'exports["./admin"].require' must end with ".cjs"
        - package.json with 'type: "module"' - 'exports["./admin"].import' must end with ".js""
      `);
    });
  });
});
