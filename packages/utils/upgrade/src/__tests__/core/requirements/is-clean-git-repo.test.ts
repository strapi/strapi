import { simpleGit } from 'simple-git';
import chalk from 'chalk';
import { createLogger } from '../../../core';
import { isCleanGitRepo } from '../../../core/requirements/is-clean-git-repo';

jest.mock('simple-git');

const noop = () => {};
const mockSimpleGit = {
  checkIsRepo: jest.fn(),
  status: jest.fn(),
  version: jest.fn(),
};

describe('Is Clean Git Repo', () => {
  const now = new Date();
  const logger = createLogger({ silent: false, debug: true });
  const isoString = now.toISOString();

  beforeAll(() => {
    jest.useFakeTimers({ now });
    (simpleGit as jest.Mock).mockReturnValue(mockSimpleGit);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(noop);
    mockSimpleGit.version.mockResolvedValue('git version 2.24.3 (Apple Git-128)');
    mockSimpleGit.checkIsRepo.mockReset();
    mockSimpleGit.status.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Git is not installed', async () => {
    mockSimpleGit.version.mockRejectedValue(new Error('Git is not installed'));

    const confirm = jest.fn().mockResolvedValue(false);
    const params = { cwd: '/path/to/repo', logger, confirm, force: false };

    await expect(isCleanGitRepo(params)).rejects.toThrow('Aborted');
    expect(mockSimpleGit.version).toHaveBeenCalled();
    expect(mockSimpleGit.version).rejects.toThrow('Git is not installed');
    // expect(mockSimpleGit.checkIsRepo).not.toHaveBeenCalled();
    // expect(mockSimpleGit.status).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      chalk.yellow(`[WARN]\t[${isoString}]`),
      'Unable to proceed with the upgrade:'
    );
    expect(console.warn).toHaveBeenCalledWith(
      chalk.yellow(`[WARN]\t[${isoString}]`),
      '- Git is not installed.'
    );
  });

  test('Repo exists and is clean', async () => {
    mockSimpleGit.checkIsRepo.mockResolvedValue(true);
    mockSimpleGit.status.mockResolvedValue({ isClean: () => true });

    const confirm = jest.fn().mockResolvedValue(true);
    const params = { cwd: '/path/to/repo', logger, confirm, force: false };

    await expect(isCleanGitRepo(params)).resolves.not.toThrow();
    expect(confirm).not.toHaveBeenCalled();
    expect(mockSimpleGit.checkIsRepo).toHaveBeenCalled();
    expect(mockSimpleGit.status).toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  test('Repo exists and is not clean', async () => {
    mockSimpleGit.checkIsRepo.mockResolvedValue(true);
    mockSimpleGit.status.mockResolvedValue({ isClean: () => false });

    const confirm = jest.fn().mockResolvedValue(false);
    const params = { cwd: '/path/to/repo', logger, confirm, force: false };

    await expect(isCleanGitRepo(params)).rejects.toThrow('Aborted');
    expect(mockSimpleGit.checkIsRepo).toHaveBeenCalled();
    expect(mockSimpleGit.status).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      chalk.yellow(`[WARN]\t[${isoString}]`),
      'Unable to proceed with the upgrade:'
    );
    expect(console.warn).toHaveBeenCalledWith(
      chalk.yellow(`[WARN]\t[${isoString}]`),
      '- The Git tree is not clean (uncommitted changes found).'
    );
  });

  test('Repo does not exist and not confirmed', async () => {
    mockSimpleGit.checkIsRepo.mockResolvedValue(false);

    const confirm = jest.fn().mockResolvedValue(false);
    const params = { cwd: '/path/to/repo', logger, confirm, force: false };

    await expect(isCleanGitRepo(params)).rejects.toThrow('Aborted');
    expect(mockSimpleGit.checkIsRepo).toHaveBeenCalled();
    expect(mockSimpleGit.status).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      chalk.yellow(`[WARN]\t[${isoString}]`),
      'Unable to proceed with the upgrade:'
    );

    expect(console.warn).toHaveBeenCalledWith(
      chalk.yellow(`[WARN]\t[${isoString}]`),
      '- No git repository was detected in the directory.'
    );
  });

  test('Repo does not exist and confirmed', async () => {
    mockSimpleGit.checkIsRepo.mockResolvedValue(false);

    const confirm = jest.fn().mockResolvedValue(true);
    const params = { cwd: '/path/to/repo', logger, confirm, force: false };

    await expect(isCleanGitRepo(params)).resolves.not.toThrow('Aborted');
    expect(mockSimpleGit.checkIsRepo).toHaveBeenCalled();
    expect(mockSimpleGit.status).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      chalk.yellow(`[WARN]\t[${isoString}]`),
      'Unable to proceed with the upgrade:'
    );

    expect(console.warn).toHaveBeenCalledWith(
      chalk.yellow(`[WARN]\t[${isoString}]`),
      '- No git repository was detected in the directory.'
    );
  });

  test('Force option is true', async () => {
    mockSimpleGit.checkIsRepo.mockResolvedValue(true);
    mockSimpleGit.status.mockResolvedValue({ isClean: () => false });

    const confirm = jest.fn().mockResolvedValue(true);
    const params = { cwd: '/path/to/repo', logger, confirm, force: true };

    await expect(isCleanGitRepo(params)).resolves.not.toThrow();
    expect(mockSimpleGit.checkIsRepo).toHaveBeenCalled();
    expect(mockSimpleGit.status).toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
});
