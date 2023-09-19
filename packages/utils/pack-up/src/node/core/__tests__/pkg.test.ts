import fs from 'fs/promises';
import path from 'path';

import { loadPkg, validatePkg } from '../pkg';

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
      // @ts-expect-error - Logger is mocked
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
        // @ts-expect-error - Logger is mocked
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
        `"type must be one of the following values: commonjs, module"`
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
});
