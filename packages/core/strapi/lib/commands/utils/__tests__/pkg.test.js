'use strict';

const fs = require('fs/promises');
const path = require('path');

const {
  loadPkg,
  validatePkg,
  validateExportsOrdering,
  parseExports,
  getExportExtensionMap,
} = require('../pkg');

const loggerMock = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('pkg', () => {
  const tmpfolder = path.resolve(__dirname, '.tmp');

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('loadPkg', () => {
    beforeEach(async () => {
      await fs.mkdir(tmpfolder);
      await fs.copyFile(
        path.resolve(__dirname, 'fixtures', 'test.pkg.json'),
        path.resolve(tmpfolder, 'package.json')
      );
    });

    afterEach(async () => {
      await fs.rm(tmpfolder, { recursive: true });
    });

    it('should succesfully load the package.json closest to the cwd provided & call the debug logger', async () => {
      const pkg = await loadPkg({ cwd: tmpfolder, logger: loggerMock });

      expect(pkg).toMatchInlineSnapshot(`
        {
          "name": "testing",
          "version": "0.0.0",
        }
      `);

      expect(loggerMock.debug).toHaveBeenCalled();
    });

    it('should throw an error if it cannot find a package.json', async () => {
      await expect(
        loadPkg({ cwd: '/', logger: loggerMock })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Could not find a package.json in the current directory"`
      );
    });
  });

  describe('validatePkg', () => {
    it("should return the validated package.json if it's valid", async () => {
      const pkg = {
        name: 'testing',
        version: '0.0.0',
      };

      const validatedPkg = await validatePkg({ pkg });

      expect(validatedPkg).toMatchInlineSnapshot(`
        {
          "name": "testing",
          "version": "0.0.0",
        }
      `);
    });

    it('should fail if a required field is missing and call the error logger with the correct message', async () => {
      expect(() =>
        validatePkg({
          pkg: {
            version: '0.0.0',
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"'name' in 'package.json' is required as type '[35mstring[39m'"`
      );

      expect(() =>
        validatePkg({
          pkg: {
            name: 'testing',
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"'version' in 'package.json' is required as type '[35mstring[39m'"`
      );
    });

    it('should fail if a required field does not match the correct type and call the error logger with the correct message', async () => {
      expect(() =>
        validatePkg({
          pkg: {
            name: 'testing',
            version: 0,
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"'version' in 'package.json' must be of type '[35mstring[39m' (recieved '[35mnumber[39m')"`
      );
    });

    it("should fail if the regex for a field doesn't match and call the error logger with the correct message", async () => {
      expect(() =>
        validatePkg({
          pkg: {
            name: 'testing',
            version: '0.0.0',
            exports: {
              apple: './apple.xyzx',
            },
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"'exports.apple' in 'package.json' must be of type '[35m/^\\.\\/.*\\.json$/[39m' (recieved the value '[35m./apple.xyzx[39m')"`
      );

      expect(() =>
        validatePkg({
          pkg: {
            name: 'testing',
            version: '0.0.0',
            type: 'something',
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"'type' in 'package.json' must be of type '[35m/(commonjs|module)/[39m' (recieved the value '[35msomething[39m')"`
      );
    });

    it('should fail if the exports object does not match expectations', async () => {
      expect(() =>
        validatePkg({
          pkg: {
            name: 'testing',
            version: '0.0.0',
            exports: 'hello',
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"'exports' in 'package.json' must be of type '[35mobject[39m' (recieved '[35mstring[39m')"`
      );

      expect(() =>
        validatePkg({
          pkg: {
            name: 'testing',
            version: '0.0.0',
            exports: {
              './package.json': './package.json',
              './admin': {
                import: './admin/index.js',
                something: 'xyz',
              },
            },
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"'exports["./admin"]' in 'package.json' contains the unknown key [35msomething[39m, for compatability only the following keys are allowed: [35m['types', 'source', 'import', 'require', 'default'][39m"`
      );
    });
  });

  describe('validateExportsOrdering', () => {
    it('should throw if there are no exports at all and log that error', async () => {
      const pkg = {
        name: 'testing',
        version: '0.0.0',
      };

      await expect(
        validateExportsOrdering({ pkg, logger: loggerMock })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"'package.json' must contain a 'main' and 'module' property"`
      );
    });

    it("should return the package if there is at least a 'main' or 'module' property", async () => {
      const pkg = {
        name: 'testing',
        version: '0.0.0',
        main: './index.js',
      };

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
      const pkg = {
        name: 'testing',
        version: '0.0.0',
        exports: {
          './package.json': './package.json',
          './admin': {
            types: './admin/index.d.ts',
            import: './admin/index.js',
            require: './admin/index.cjs',
            default: './admin/index.js',
          },
        },
      };

      const validatedPkg = await validateExportsOrdering({ pkg, logger: loggerMock });

      expect(validatedPkg).toMatchInlineSnapshot(`
        {
          "exports": {
            "./admin": {
              "default": "./admin/index.js",
              "import": "./admin/index.js",
              "require": "./admin/index.cjs",
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
      const pkg = {
        name: 'testing',
        version: '0.0.0',
        exports: {
          './admin': {
            import: './admin/index.js',
            types: './admin/index.d.ts',
          },
        },
      };

      await expect(
        validateExportsOrdering({ pkg, logger: loggerMock })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"exports["./admin"]: the 'types' property should be the first property"`
      );
    });

    it('should log a warning if the require property comes before the import property in an export object', async () => {
      const pkg = {
        name: 'testing',
        version: '0.0.0',
        exports: {
          './admin': {
            require: './admin/index.cjs',
            import: './admin/index.js',
          },
        },
      };

      await validateExportsOrdering({ pkg, logger: loggerMock });

      expect(loggerMock.warn.mock.calls[0]).toMatchInlineSnapshot(`
        [
          "exports["./admin"]: the 'import' property should come before the 'require' property",
        ]
      `);
    });

    it('should log a warning if the import property comes the module property in an export object', async () => {
      const pkg = {
        name: 'testing',
        version: '0.0.0',
        exports: {
          './admin': {
            import: './admin/index.js',
            module: './admin/index.js',
          },
        },
      };

      await validateExportsOrdering({ pkg, logger: loggerMock });

      expect(loggerMock.warn.mock.calls[0]).toMatchInlineSnapshot(`
        [
          "exports["./admin"]: the 'module' property should come before 'import' property",
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
      const pkg = {
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

      expect(parseExports({ pkg, extMap })).toMatchInlineSnapshot(`[]`);
    });

    it('should return a combination of the standard export fields and the export map if they both exist', () => {
      const pkg = {
        types: './dist/index.d.ts',
        main: './dist/index.js',
        module: './dist/index.mjs',
        source: './src/index.ts',
        exports: {
          './package.json': './package.json',
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
      const pkg = {
        exports: {
          './package.json': './package.json',
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
      const pkg = {
        exports: {
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
      const pkg = {
        exports: {
          './package.json': './package.json',
          './admin': {
            types: './admin/index.d.ts',
            import: './admin/index.js',
            require: './admin/index.cjs',
            default: './admin/index.cjs',
            source: './src/admin/index.js',
          },
        },
      };

      expect(() => parseExports({ pkg, extMap, type: 'module' }))
        .toThrowErrorMatchingInlineSnapshot(`
        "
        - package.json with \`type: "undefined"\` - \`exports["./admin"].require\` must end with ".js"
        - package.json with \`type: "undefined"\` - \`exports["./admin"].import\` must end with ".mjs""
      `);
    });

    it('should throw an error if the pkg.json type is commonjs and you try to export like a module', () => {
      const pkg = {
        type: 'commonjs',
        exports: {
          './package.json': './package.json',
          './admin': {
            types: './admin/index.d.ts',
            import: './admin/index.js',
            require: './admin/index.cjs',
            default: './admin/index.cjs',
            source: './src/admin/index.js',
          },
        },
      };

      expect(() => parseExports({ pkg, extMap, type: 'module' }))
        .toThrowErrorMatchingInlineSnapshot(`
        "
        - package.json with \`type: "commonjs"\` - \`exports["./admin"].require\` must end with ".js"
        - package.json with \`type: "commonjs"\` - \`exports["./admin"].import\` must end with ".mjs""
      `);
    });

    it('should throw an error if the pkg.json type is module and you try to export like a commonjs', () => {
      const pkg = {
        type: 'module',
        exports: {
          './package.json': './package.json',
          './admin': {
            types: './admin/index.d.ts',
            import: './admin/index.mjs',
            require: './admin/index.js',
            default: './admin/index.js',
            source: './src/admin/index.js',
          },
        },
      };

      expect(() => parseExports({ pkg, extMap, type: 'module' }))
        .toThrowErrorMatchingInlineSnapshot(`
        "
        - package.json with \`type: "module"\` - \`exports["./admin"].require\` must end with ".cjs"
        - package.json with \`type: "module"\` - \`exports["./admin"].import\` must end with ".js""
      `);
    });
  });
});
