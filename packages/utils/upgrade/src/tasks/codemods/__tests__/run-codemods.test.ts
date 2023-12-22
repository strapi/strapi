import semver from 'semver';
import { codemods } from '../codemods';
import { Version, rangeFactory, semVerFactory } from '../../../modules/version';
import { projectFactory } from '../../../modules/project';
import { codemodRunnerFactory } from '../../../modules/codemod-runner';
import { loggerFactory } from '../../../modules/logger';

jest.mock('../../../modules/codemod-runner');
jest.mock('../../../modules/project', () => ({
  projectFactory: jest.fn().mockReturnValue({
    refresh: jest.fn().mockReturnThis(),
    runCodemods: jest.fn().mockResolvedValue({ success: true }),
    strapiVersion: new semver.SemVer('3.6.0'),
  }),
}));

jest.mock('../../../modules/logger', () => ({
  loggerFactory: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('codemods task', () => {
  const logger = loggerFactory();
  const options = {
    target: Version.ReleaseType.Major,
    logger,
    dry: false,
    selectCodemods: (options) => Promise.resolve(options),
  };

  (codemodRunnerFactory as jest.Mock).mockReturnValue({
    dry: jest.fn().mockReturnThis(),
    onSelectCodemods: jest.fn().mockReturnThis(),
    setLogger: jest.fn().mockReturnThis(),
    run: jest.fn().mockResolvedValue({ success: true }),
    range: rangeFactory('4.0.0'),
    isDry: false,
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

  const mockProject = projectFactory('/mock/path');
  const mockCodemodRunner = codemodRunnerFactory(mockProject, rangeFactory('4.0.0'));

  afterAll(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it('completes codemod execution successfully', async () => {
    await expect(codemods(options)).resolves.toBeUndefined();
  });

  it('throws an error on codemod execution failure', async () => {
    (mockCodemodRunner.run as jest.Mock).mockResolvedValue({
      success: false,
      error: new Error('Mock error'),
    });

    await expect(codemods(options)).rejects.toThrow('Mock error');
  });

  it('handles invalid target version', async () => {
    const options = {
      target: 'invalid',
      logger,
      dry: false,
      selectCodemods: (options) => Promise.resolve(options),
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await expect(codemods(options)).rejects.toThrow('Invalid target set');
  });
});
