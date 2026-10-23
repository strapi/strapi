import path from 'node:path';

import { packageManager } from '@strapi/utils';
import { vol, fs } from 'memfs';

import { codemodRunnerFactory } from '../../codemod-runner';
import { assertAppProject, projectFactory } from '../../project';
import { semVerFactory } from '../../version';
import { upgraderFactory } from '../upgrader';

import type { NPM } from '../../npm';

jest.mock('fs', () => fs);

jest.mock('../../codemod-runner', () => ({
  codemodRunnerFactory: jest.fn(() => ({
    dry: jest.fn().mockReturnThis(),
    setLogger: jest.fn().mockReturnThis(),
    run: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@strapi/utils', () => ({
  packageManager: {
    getPreferred: jest.fn().mockResolvedValue('yarn'),
    installDependencies: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockedCodemodRunnerFactory = codemodRunnerFactory as jest.MockedFunction<
  typeof codemodRunnerFactory
>;
const mockedInstallDependencies = packageManager.installDependencies as jest.MockedFunction<
  typeof packageManager.installDependencies
>;

const createNpmPackageStub = (): NPM.Package =>
  ({
    name: '@strapi/strapi',
    get isLoaded() {
      return true;
    },
    refresh: jest.fn().mockResolvedValue(undefined),
    versionExists: jest.fn(),
    getVersionsDict: jest.fn(() => ({})),
    getVersionsAsList: jest.fn(() => []),
    findVersion: jest.fn((target) => ({ version: target.raw })),
    findVersionsInRange: jest.fn(() => []),
  }) as unknown as NPM.Package;

describe('Upgrader dependency semver ranges', () => {
  const cwd = '/__upgrader_semver_ranges__';
  const packageRoot = path.join(cwd, 'package');

  beforeEach(() => {
    vol.reset();
    jest.clearAllMocks();
  });

  it('updates scoped Strapi dependency ranges that contain the installed Strapi version', async () => {
    vol.fromNestedJSON(
      {
        package: {
          'package.json': JSON.stringify(
            {
              name: 'strapi-upgrade-range-test-app',
              version: '1.0.0',
              dependencies: {
                '@strapi/strapi': '5.8',
                '@strapi/plugin-color-picker': '^5.8.0',
                '@strapi/plugin-users-permissions': '~5.7.0',
                'strapi-plugin-community': '^5.8.0',
              },
              devDependencies: {
                '@strapi/types': '~5.8.0',
              },
            },
            null,
            2
          ),
          node_modules: {
            '@strapi': {
              strapi: {
                'package.json': JSON.stringify({
                  name: '@strapi/strapi',
                  version: '5.8.1',
                }),
              },
            },
          },
        },
      },
      cwd
    );

    const project = projectFactory(packageRoot);
    assertAppProject(project);
    expect(project.strapiVersion.raw).toBe('5.8.1');

    const upgrader = upgraderFactory(project, semVerFactory('5.9.0'), createNpmPackageStub());
    const report = await upgrader.upgrade();

    expect(report.success).toBe(true);

    const packageJSON = JSON.parse(
      vol.readFileSync(path.join(packageRoot, 'package.json'), 'utf-8').toString()
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(packageJSON.dependencies['@strapi/strapi']).toBe('5.9.0');
    expect(packageJSON.dependencies['@strapi/plugin-color-picker']).toBe('5.9.0');
    expect(packageJSON.devDependencies['@strapi/types']).toBe('5.9.0');
    expect(packageJSON.dependencies['@strapi/plugin-users-permissions']).toBe('~5.7.0');
    expect(packageJSON.dependencies['strapi-plugin-community']).toBe('^5.8.0');
    expect(mockedCodemodRunnerFactory).toHaveBeenCalled();
    expect(mockedInstallDependencies).toHaveBeenCalled();
  });
});
