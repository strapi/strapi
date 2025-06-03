import path from 'node:path';
import { vol, fs } from 'memfs';

import { PluginProject, projectFactory } from '../project';
import { assertAppProject, assertPluginProject, isPluginProject } from '../utils';

jest.mock('fs', () => fs);

const srcFilename = (cwd: string, filename: string) => path.join(cwd, 'src', filename);
const srcFilenames = (cwd: string) => {
  return Object.keys(defaultFiles).map((filename) => srcFilename(cwd, filename));
};

const pluginServerFilename = (cwd: string, filename: string) => path.join(cwd, 'server', filename);
const pluginServerFilenames = (cwd: string) => {
  return Object.keys(defaultFiles).map((filename) => pluginServerFilename(cwd, filename));
};

const currentStrapiVersion = '1.2.3';

const defaultCWD = '/__unit_tests__';

const appPackageJSONFile = `{
  "name": "test",
  "version": "1.0.0",
  "dependencies": { "@strapi/strapi": "${currentStrapiVersion}" }
}`;

const pluginPackageJSONFile = `{
  "name": "test",
  "version": "1.0.0",
  "strapi": {
    "kind": "plugin"
  }
}`;

const defaultFiles = {
  'a.ts': 'console.log("a.ts")',
  'b.ts': 'console.log("b.ts")',
  'c.js': 'console.log("c.js")',
  'd.json': `{ "foo": "bar", "bar": 123 }`,
  'e.jsx': `console.log('e.jsx')`,
  'f.tsx': `console.log('f.tsx')`,
};

const appVolume = {
  'package.json': appPackageJSONFile,
  src: defaultFiles,
};

const pluginVolume = {
  'package.json': pluginPackageJSONFile,
  server: defaultFiles,
};

describe('Project', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  describe('Factory', () => {
    test('Fails on invalid project path', async () => {
      vol.fromNestedJSON(appVolume, defaultCWD);

      const cwd = 'unknown-path';

      expect(() => projectFactory(cwd)).toThrow(
        `ENOENT: no such file or directory, access 'unknown-path'`
      );
    });

    test('Fails on project without package.json file', async () => {
      vol.fromNestedJSON({ src: defaultFiles }, defaultCWD);

      expect(() => projectFactory(defaultCWD)).toThrow(
        `Could not find a package.json file in ${defaultCWD}`
      );
    });

    test('Fails when not a plugin and no @strapi/strapi dependency found', async () => {
      vol.fromNestedJSON(
        { 'package.json': `{ "name": "test", "version": "1.2.3" }`, src: defaultFiles },
        defaultCWD
      );

      expect(() => projectFactory(defaultCWD)).toThrow(
        'No version of @strapi/strapi was found in test. Are you in a valid Strapi project?'
      );
    });

    test(`Use the @strapi/strapi's package.json version as a fallback fails when no version is installed`, () => {
      vol.fromNestedJSON(
        {
          'package.json': `{ "name": "test", "version": "1.2.3", "dependencies": { "@strapi/strapi": "^4.0.0" } }`,
          src: defaultFiles,
        },
        defaultCWD
      );

      expect(() => projectFactory(defaultCWD)).toThrow(
        `Cannot resolve module "@strapi/strapi" from paths [${defaultCWD}]`
      );
    });

    // TODO: Waiting for https://github.com/jestjs/jest/issues/9543 to be implemented as we rely on require.resolve to find the actual module
    test.todo(`Use the @strapi/strapi's package.json version as a fallback succeed`);

    test('Succeed for valid AppProject', () => {
      vol.fromNestedJSON(appVolume, defaultCWD);

      const project = projectFactory(defaultCWD);

      assertAppProject(project);

      expect(project.files.length).toBe(7);
      expect(project.files).toStrictEqual(
        expect.arrayContaining([path.join(defaultCWD, 'package.json'), ...srcFilenames(defaultCWD)])
      );

      expect(project.cwd).toBe(defaultCWD);
      expect(project.strapiVersion.raw).toBe(currentStrapiVersion);
    });

    test('Succeed for valid PluginProject', () => {
      vol.fromNestedJSON(pluginVolume, defaultCWD);

      const project = projectFactory(defaultCWD);

      assertPluginProject(project);

      expect(project.type).toBe('plugin');
      expect(project instanceof PluginProject).toBe(true);

      expect(project.files.length).toBe(7);
      expect(project.files).toStrictEqual(
        expect.arrayContaining([
          path.join(defaultCWD, 'package.json'),
          ...pluginServerFilenames(defaultCWD),
        ])
      );

      expect(project.cwd).toBe(defaultCWD);
    });
  });

  describe('refresh', () => {
    test('Succeed for valid AppProject', () => {
      vol.fromNestedJSON(appVolume, defaultCWD);

      const project = projectFactory(defaultCWD);

      assertAppProject(project);

      project.refresh();

      expect(project.files.length).toBe(7);
      expect(project.files).toStrictEqual(
        expect.arrayContaining([path.join(defaultCWD, 'package.json'), ...srcFilenames(defaultCWD)])
      );

      expect(project.cwd).toBe(defaultCWD);

      expect(project.strapiVersion.raw).toBe(currentStrapiVersion);

      project.packageJSON.name = 'test';
    });

    test('Succeed for valid PluginProject', () => {
      vol.fromNestedJSON(pluginVolume, defaultCWD);

      const project = projectFactory(defaultCWD);
      expect(isPluginProject(project)).toBe(true);

      project.refresh();

      expect(project.files.length).toBe(7);
      expect(project.files).toStrictEqual(
        expect.arrayContaining([
          path.join(defaultCWD, 'package.json'),
          ...pluginServerFilenames(defaultCWD),
        ])
      );

      expect(project.cwd).toBe(defaultCWD);

      project.packageJSON.name = 'test';
    });
  });

  describe('runCodemods', () => {});

  describe('getFilesByExtensions', () => {
    beforeEach(() => {
      vol.fromNestedJSON(appVolume, defaultCWD);
    });

    test('Get .js files only', () => {
      const project = projectFactory(defaultCWD);

      const jsFiles = project.getFilesByExtensions(['.js']);

      expect(jsFiles).toStrictEqual(expect.arrayContaining([srcFilename(defaultCWD, 'c.js')]));
    });

    test('Get .ts files only', () => {
      const project = projectFactory(defaultCWD);

      const tsFiles = project.getFilesByExtensions(['.ts']);

      expect(tsFiles).toStrictEqual(
        expect.arrayContaining([srcFilename(defaultCWD, 'a.ts'), srcFilename(defaultCWD, 'b.ts')])
      );
    });

    test('Get .jsx files only', () => {
      const project = projectFactory(defaultCWD);

      const tsFiles = project.getFilesByExtensions(['.jsx']);

      expect(tsFiles).toStrictEqual(expect.arrayContaining([srcFilename(defaultCWD, 'e.jsx')]));
    });

    test('Get .tsx files only', () => {
      const project = projectFactory(defaultCWD);

      const tsFiles = project.getFilesByExtensions(['.tsx']);

      expect(tsFiles).toStrictEqual(expect.arrayContaining([srcFilename(defaultCWD, 'f.tsx')]));
    });

    test('Get both .js and .ts files', () => {
      const project = projectFactory(defaultCWD);

      const jsAndTSFiles = project.getFilesByExtensions(['.ts', '.js']);

      expect(jsAndTSFiles).toStrictEqual(
        expect.arrayContaining([
          srcFilename(defaultCWD, 'a.ts'),
          srcFilename(defaultCWD, 'b.ts'),
          srcFilename(defaultCWD, 'c.js'),
        ])
      );
    });

    test('Get both .ts .json files', () => {
      const project = projectFactory(defaultCWD);

      const tsAndJSONFiles = project.getFilesByExtensions(['.ts', '.json']);

      expect(tsAndJSONFiles).toStrictEqual(
        expect.arrayContaining([
          path.join(defaultCWD, 'package.json'),
          srcFilename(defaultCWD, 'a.ts'),
          srcFilename(defaultCWD, 'b.ts'),
          srcFilename(defaultCWD, 'd.json'),
        ])
      );
    });
  });
});
