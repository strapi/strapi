import path from 'node:path';

import { packageManager } from '@strapi/utils';
import { vol, fs } from 'memfs';

import { codemodRunnerFactory } from '../../codemod-runner';
import { assertAppProject, projectFactory } from '../../project';
import { requirementFactory } from '../../requirement';
import { NPMCandidateNotFoundError } from '../../error';
import { Version, rangeFromVersions, semVerFactory } from '../../version';
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
const mockedGetPreferred = packageManager.getPreferred as jest.MockedFunction<
  typeof packageManager.getPreferred
>;
const mockedInstallDependencies = packageManager.installDependencies as jest.MockedFunction<
  typeof packageManager.installDependencies
>;

describe('Upgrader', () => {
  const cwd = '/__upgrader_tests__';

  const createProject = (
    projectVersion: string,
    extraDependencies: Record<string, string> = {},
    extraDevDependencies: Record<string, string> = {}
  ) => {
    vol.fromNestedJSON(
      {
        package: {
          'package.json': JSON.stringify(
            {
              name: 'strapi-upgrade-test-app',
              version: '1.0.0',
              dependencies: {
                '@strapi/strapi': projectVersion,
                ...extraDependencies,
              },
              devDependencies: {
                '@strapi/types': projectVersion,
                ...extraDevDependencies,
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

    return project;
  };

  const readPackageJson = () => {
    const packageJsonRaw = vol.readFileSync(path.join(cwd, 'package', 'package.json'), 'utf-8');

    return JSON.parse(packageJsonRaw.toString()) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
  };

  type NpmPackageStubOptions = {
    findVersion?: NPM.Package['findVersion'];
    findVersionsInRange?: NPM.Package['findVersionsInRange'];
  };

  const createNpmPackageStub = ({
    findVersion = jest.fn((semverTarget) => ({
      version: semverTarget.raw,
    })),
    findVersionsInRange = jest.fn(() => []),
  }: NpmPackageStubOptions = {}): NPM.Package =>
    ({
      name: '@strapi/strapi',
      get isLoaded() {
        return true;
      },
      refresh: jest.fn().mockResolvedValue(undefined),
      versionExists: jest.fn(),
      getVersionsDict: jest.fn(() => ({})),
      getVersionsAsList: jest.fn(() => []),
      findVersion,
      findVersionsInRange,
    }) as unknown as NPM.Package;

  const getCodemodRunnerRange = () => {
    const [, range] = mockedCodemodRunnerFactory.mock.calls.at(-1) ?? [];

    return range;
  };

  beforeEach(() => {
    vol.reset();
    jest.clearAllMocks();
  });

  describe('upgraderFactory', () => {
    it('resolves an exact semver target from npm', () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();

      const upgrader = upgraderFactory(project, semVerFactory('5.9.0'), npmPackageStub);

      expect(upgrader.getTarget().raw).toBe('5.9.0');
      expect(npmPackageStub.findVersion).toHaveBeenCalledWith(
        expect.objectContaining({ raw: '5.9.0' })
      );
    });

    it('resolves pre-release semver targets from npm', () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();

      const upgrader = upgraderFactory(project, semVerFactory('5.9.0-beta.1'), npmPackageStub);

      expect(upgrader.getTarget().raw).toBe('5.9.0-beta.1');
    });

    it('resolves the latest version in range for major release type', () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub({
        findVersionsInRange: jest.fn(() => [{ version: '6.0.0' }, { version: '6.0.1' }]),
      });

      const upgrader = upgraderFactory(project, Version.ReleaseType.Major, npmPackageStub);

      expect(upgrader.getTarget().raw).toBe('6.0.1');
    });

    it('resolves the latest version in range for minor release type', () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub({
        findVersionsInRange: jest.fn(() => [{ version: '5.8.2' }, { version: '5.9.0' }]),
      });

      const upgrader = upgraderFactory(project, Version.ReleaseType.Minor, npmPackageStub);

      expect(upgrader.getTarget().raw).toBe('5.9.0');
    });

    it('throws when the target version is not available on npm', () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub({
        findVersion: jest.fn(() => undefined),
      });

      expect(() => upgraderFactory(project, semVerFactory('5.9.0'), npmPackageStub)).toThrow(
        NPMCandidateNotFoundError
      );
    });

    it('throws when no versions match a release type target', () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub({
        findVersionsInRange: jest.fn(() => []),
      });

      expect(() => upgraderFactory(project, Version.ReleaseType.Patch, npmPackageStub)).toThrow(
        'The project is already up-to-date (patch)'
      );
    });

    it('throws when the project is already on the target version', () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();

      expect(() => upgraderFactory(project, semVerFactory('5.8.1'), npmPackageStub)).toThrow(
        'The project is already using v5.8.1'
      );
    });

    it('throws when the target version is older than the current version', () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();

      expect(() => upgraderFactory(project, semVerFactory('5.7.0'), npmPackageStub)).toThrow(
        'The target version v5.7.0 must be greater than the current version v5.8.1'
      );
    });
  });

  describe('upgrade()', () => {
    it('updates scoped @strapi packages in dependencies and devDependencies (issue #22768)', async () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();
      const upgrader = upgraderFactory(project, semVerFactory('5.9.0'), npmPackageStub);

      const report = await upgrader.upgrade();

      expect(report.success).toBe(true);
      expect(readPackageJson().dependencies['@strapi/strapi']).toBe('5.9.0');
      expect(readPackageJson().devDependencies['@strapi/types']).toBe('5.9.0');
    });

    it('only updates @strapi packages that match the current Strapi version', async () => {
      const project = createProject('5.8.1', {
        '@strapi/plugin-users-permissions': '5.8.0',
      });
      const npmPackageStub = createNpmPackageStub();
      const upgrader = upgraderFactory(project, semVerFactory('5.9.0'), npmPackageStub);

      await upgrader.upgrade();

      const pkg = readPackageJson();

      expect(pkg.dependencies['@strapi/strapi']).toBe('5.9.0');
      expect(pkg.dependencies['@strapi/plugin-users-permissions']).toBe('5.8.0');
    });

    it('runs codemods using a range from the current version to the target', async () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();
      const upgrader = upgraderFactory(project, semVerFactory('5.9.0'), npmPackageStub);

      await upgrader.upgrade();

      expect(getCodemodRunnerRange()?.raw).toBe(
        rangeFromVersions(project.strapiVersion, semVerFactory('5.9.0')).raw
      );
    });

    it('uses the major.minor.patch portion of pre-release targets for codemods', async () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();
      const upgrader = upgraderFactory(project, semVerFactory('5.9.0-beta.1'), npmPackageStub);

      await upgrader.upgrade();

      expect(getCodemodRunnerRange()?.raw).toBe(
        rangeFromVersions(project.strapiVersion, semVerFactory('5.9.0')).raw
      );
    });

    it('uses an overridden codemods target when provided', async () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();
      const upgrader = upgraderFactory(project, semVerFactory('5.9.0-beta.1'), npmPackageStub);

      upgrader.overrideCodemodsTarget(semVerFactory('5.0.0'));

      await upgrader.upgrade();

      expect(getCodemodRunnerRange()?.raw).toBe(
        rangeFromVersions(project.strapiVersion, semVerFactory('5.0.0')).raw
      );
    });

    it('does not write package.json in dry mode', async () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();
      const upgrader = upgraderFactory(project, semVerFactory('5.9.0'), npmPackageStub).dry(true);

      await upgrader.upgrade();

      expect(readPackageJson().dependencies['@strapi/strapi']).toBe('5.8.1');
      expect(readPackageJson().devDependencies['@strapi/types']).toBe('5.8.1');
    });

    it('does not install dependencies in dry mode', async () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();
      const upgrader = upgraderFactory(project, semVerFactory('5.9.0'), npmPackageStub).dry(true);

      await upgrader.upgrade();

      expect(mockedInstallDependencies).not.toHaveBeenCalled();
    });

    it('installs dependencies after updating package.json', async () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();
      const upgrader = upgraderFactory(project, semVerFactory('5.9.0'), npmPackageStub);

      await upgrader.upgrade();

      expect(mockedGetPreferred).toHaveBeenCalledWith(project.cwd);
      expect(mockedInstallDependencies).toHaveBeenCalledWith(
        project.cwd,
        'yarn',
        expect.any(Object)
      );
    });

    it('passes dry mode to the codemod runner', async () => {
      const mockDry = jest.fn().mockReturnThis();
      mockedCodemodRunnerFactory.mockReturnValueOnce({
        dry: mockDry,
        setLogger: jest.fn().mockReturnThis(),
        run: jest.fn().mockResolvedValue(undefined),
      } as ReturnType<typeof codemodRunnerFactory>);

      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();
      const upgrader = upgraderFactory(project, semVerFactory('5.9.0'), npmPackageStub).dry(true);

      await upgrader.upgrade();

      expect(mockDry).toHaveBeenCalledWith(true);
    });

    it('returns an error report when a required requirement fails', async () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();
      const upgrader = upgraderFactory(
        project,
        semVerFactory('5.9.0'),
        npmPackageStub
      ).addRequirement(
        requirementFactory('REQUIRE_CLEAN_GIT', () => {
          throw new Error('Working tree is dirty');
        })
      );

      const report = await upgrader.upgrade();

      expect(report.success).toBe(false);
      expect(report.error?.message).toContain('Working tree is dirty');
      expect(readPackageJson().dependencies['@strapi/strapi']).toBe('5.8.1');
    });

    it('returns an error report when an optional requirement is rejected', async () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();
      const upgrader = upgraderFactory(project, semVerFactory('5.9.0'), npmPackageStub)
        .addRequirement(
          requirementFactory('OPTIONAL_CHECK', () => {
            throw new Error('Optional check failed');
          }).asOptional()
        )
        .onConfirm(async () => false);

      const report = await upgrader.upgrade();

      expect(report.success).toBe(false);
      expect(report.error?.message).toContain('Optional check failed');
    });

    it('continues when an optional requirement is confirmed', async () => {
      const project = createProject('5.8.1');
      const npmPackageStub = createNpmPackageStub();
      const upgrader = upgraderFactory(project, semVerFactory('5.9.0'), npmPackageStub)
        .addRequirement(
          requirementFactory('OPTIONAL_CHECK', () => {
            throw new Error('Optional check failed');
          }).asOptional()
        )
        .onConfirm(async () => true);

      const report = await upgrader.upgrade();

      expect(report.success).toBe(true);
      expect(readPackageJson().dependencies['@strapi/strapi']).toBe('5.9.0');
    });
  });
});
