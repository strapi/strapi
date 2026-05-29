import path from 'node:path';

import { vol, fs } from 'memfs';

import { assertAppProject, projectFactory } from '../../project';
import { semVerFactory } from '../../version';
import { upgraderFactory } from '../upgrader';

import type { NPM } from '../../npm/types';

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

describe('Upgrader', () => {
  const cwd = '/__upgrader_tests__';

  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('updates scoped @strapi packages in dependencies and devDependencies (issue #22768)', async () => {
    const projectVersion = '5.8.1';
    const targetVersion = '5.9.0';

    vol.fromNestedJSON(
      {
        package: {
          'package.json': JSON.stringify(
            {
              name: 'strapi-upgrade-test-app',
              version: '1.0.0',
              dependencies: {
                '@strapi/strapi': projectVersion,
              },
              devDependencies: {
                '@strapi/types': projectVersion,
              },
            },
            null,
            2
          ),
        },
      },
      cwd
    );

    const packageRoot = path.join(cwd, 'package');
    const project = projectFactory(packageRoot);

    assertAppProject(project);

    const npmPackageStub: NPM.Package = {
      name: '@strapi/strapi',
      get isLoaded() {
        return true;
      },
      refresh: jest.fn().mockResolvedValue(undefined),
      versionExists: jest.fn(),
      getVersionsDict: jest.fn(() => ({})),
      getVersionsAsList: jest.fn(() => []),
      findVersion: jest.fn((semverTarget) => ({
        version: semverTarget.raw,
      })),
      findVersionsInRange: jest.fn(),
    } as unknown as NPM.Package;

    const nextTarget = semVerFactory(targetVersion);
    const upgrader = upgraderFactory(project, nextTarget, npmPackageStub);

    await upgrader.upgrade();

    const packageJsonRaw = vol.readFileSync(path.join(packageRoot, 'package.json'), 'utf-8');
    const pkg = JSON.parse(packageJsonRaw.toString());

    expect(pkg.dependencies['@strapi/strapi']).toBe(targetVersion);
    expect(pkg.devDependencies['@strapi/types']).toBe(targetVersion);
  });
});
