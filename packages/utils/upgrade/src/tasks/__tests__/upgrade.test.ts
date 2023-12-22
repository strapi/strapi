import semver from 'semver';
import { Version, semVerFactory } from '../../modules/version';
import { projectFactory } from '../../modules/project';
import { loggerFactory } from '../../modules/logger';
import { upgraderFactory, constants as upgraderConstants } from '../../modules/upgrader';
import { upgrade } from '../upgrade/upgrade';
import { npmPackageFactory } from '../../modules/npm';

jest.mock('../../modules/upgrader');
jest.mock('../../modules/project', () => ({
  projectFactory: jest.fn().mockReturnValue({
    refresh: jest.fn().mockReturnThis(),
    runCodemods: jest.fn().mockResolvedValue({ success: true }),
    strapiVersion: new semver.SemVer('3.6.0'),
  }),
}));

jest.mock('../../modules/npm', () => ({
  npmPackageFactory: jest.fn().mockReturnValue({
    refresh: jest.fn().mockReturnThis(),
    name: upgraderConstants.STRAPI_PACKAGE_NAME,
    isLoaded: true,
    versionExists: jest.fn().mockReturnValue(true),
    getVersionsAsList: jest
      .fn()
      .mockReturnValue([
        new semver.SemVer('3.6.0'),
        new semver.SemVer('3.7.0'),
        new semver.SemVer('4.0.0'),
      ]),
    getVersionsAsDict: jest.fn().mockReturnValue({
      '3.6.0': new semver.SemVer('3.6.0'),
      '3.7.0': new semver.SemVer('3.7.0'),
      '4.0.0': new semver.SemVer('4.0.0'),
    }),
    findVersionsInRange: jest
      .fn()
      .mockReturnValue([new semver.SemVer('3.7.0'), new semver.SemVer('4.0.0')]),
  }),
}));

jest.mock('../../modules/logger', () => ({
  loggerFactory: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('codemods task', () => {
  const logger = loggerFactory();
  const addRequirementMock = jest.fn().mockReturnThis();
  const options = {
    target: Version.ReleaseType.Major,
    logger,
    dry: false,
    selectCodemods: (options) => Promise.resolve(options),
  };

  (upgraderFactory as jest.Mock).mockReturnValue({
    dry: jest.fn().mockReturnThis(),
    onConfirm: jest.fn().mockReturnThis(),
    setLogger: jest.fn().mockReturnThis(),
    upgrade: jest.fn().mockResolvedValue({ success: true }),
    isDry: false,
    addRequirement: addRequirementMock,
  });

  (projectFactory as jest.Mock).mockReturnValue({
    dry: jest.fn().mockReturnThis(),
    onSelectCodemods: jest.fn().mockReturnThis(),
    setLogger: jest.fn().mockReturnThis(),
    run: jest.fn().mockResolvedValue({ success: true }),
    target: Version.ReleaseType.Major,
    strapiVersion: semVerFactory('3.6.0'),
    isDry: false,
  });

  afterAll(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it('completes upgrade execution successfully', async () => {
    await expect(upgrade(options)).resolves.toBeUndefined();
    expect(addRequirementMock).toHaveBeenCalledTimes(3);
  });

  it('throws an error on upgrade execution failure', async () => {
    const mockProject = projectFactory('/mock/path');

    const mockUpgrader = upgraderFactory(
      mockProject,
      Version.ReleaseType.Major,
      npmPackageFactory(upgraderConstants.STRAPI_PACKAGE_NAME)
    );
    (mockUpgrader.upgrade as jest.Mock).mockResolvedValue({
      success: false,
      error: new Error('Mock error'),
    });
    await expect(upgrade(options)).rejects.toThrow('Mock error');
  });
});
