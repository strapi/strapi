import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import execa from 'execa';

import {
  InstallError,
  MAX_INSTALL_OUTPUT_LENGTH,
  createOutputTail,
  installProjectDependencies,
  runInstall,
} from '../utils/install-dependencies';
import { getInstallArgs } from '../utils/get-package-manager-args';
import { trackUsage } from '../utils/usage';
import { logger } from '../utils/logger';
import type { Scope } from '../types';

vi.mock('execa', () => ({ default: vi.fn() }));
vi.mock('ora', () => ({
  default: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), fail: vi.fn() })),
}));
vi.mock('../utils/get-package-manager-args', () => ({ getInstallArgs: vi.fn() }));
vi.mock('../utils/usage', () => ({ trackUsage: vi.fn() }));
vi.mock('../utils/logger', () => ({
  logger: { title: vi.fn(), success: vi.fn(), fatal: vi.fn() },
}));

const execaMock = vi.mocked(execa);
const getInstallArgsMock = vi.mocked(getInstallArgs);
const trackUsageMock = vi.mocked(trackUsage);
const fatalMock = vi.mocked(logger.fatal);

const scope = { rootPath: '/tmp/my-app', packageManager: 'npm' } as Scope;

/**
 * Returns a fake execa child process. It writes `output` to `all`, then resolves,
 * or rejects with `error` when one is given.
 */
const fakeProcess = (output: string[], error?: unknown) => {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const all = new PassThrough();

  const done = new Promise<void>((resolve, reject) => {
    setImmediate(() => {
      output.forEach((chunk) => all.write(chunk));
      all.end();

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  return Object.assign(done, { stdout, stderr, all }) as unknown as ReturnType<typeof execa>;
};

const execaError = (shortMessage: string) =>
  Object.assign(new Error(`${shortMessage}\nfull output`), { shortMessage, exitCode: 1 });

describe('createOutputTail', () => {
  it('keeps the output when it is under the limit', () => {
    const tail = createOutputTail(10);
    tail.append('abc\n');
    tail.append('def');

    expect(tail.read()).toBe('abc\ndef');
  });

  it('keeps only the end of the output, from a full line', () => {
    const tail = createOutputTail(10);
    tail.append('first line\n');
    tail.append('second\nend');

    expect(tail.read()).toBe('end');
  });
});

describe('runInstall', () => {
  beforeEach(() => {
    getInstallArgsMock.mockResolvedValue({
      envArgs: { FOO: 'bar' },
      cmdArgs: ['install'],
      version: '10.0.0',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('ignores stdin, pipes the output and does not let execa buffer it', async () => {
    execaMock.mockReturnValue(fakeProcess(['ok']));

    await runInstall(scope);

    expect(execaMock).toHaveBeenCalledWith(
      'npm',
      ['install'],
      expect.objectContaining({
        cwd: '/tmp/my-app',
        stdio: ['ignore', 'pipe', 'pipe'],
        all: true,
        buffer: false,
        env: expect.objectContaining({ FOO: 'bar', NODE_ENV: 'development' }),
      })
    );
  });

  it('throws an InstallError with the end of the output when the install fails', async () => {
    const lines = Array.from({ length: 2000 }, (_, i) => `line ${i} ${'x'.repeat(100)}\n`);
    execaMock.mockReturnValue(
      fakeProcess([...lines, 'npm error the real error\n'], execaError('Command failed'))
    );

    const error = await runInstall(scope).catch((e) => e);

    expect(error).toBeInstanceOf(InstallError);
    expect(error.message).toBe('Command failed');
    expect(error.output.length).toBeLessThanOrEqual(MAX_INSTALL_OUTPUT_LENGTH);
    expect(error.output.endsWith('npm error the real error\n')).toBe(true);
    expect(error.output.startsWith('line ')).toBe(true);
  });
});

describe('installProjectDependencies', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getInstallArgsMock.mockResolvedValue({
      envArgs: {},
      cmdArgs: ['install'],
      version: '10.0.0',
    });
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    vi.clearAllMocks();
  });

  it('tracks the success and does not exit', async () => {
    execaMock.mockReturnValue(fakeProcess(['added 1 package\n']));

    await installProjectDependencies(scope);

    expect(trackUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'didInstallProjectDependencies' })
    );
    expect(fatalMock).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows the captured output but does not send it to telemetry', async () => {
    execaMock.mockReturnValue(
      fakeProcess(
        ['npm error path /Users/someone/my-app\n'],
        Object.assign(execaError('Command failed'), {
          stderr: 'npm error path /Users/someone/my-app',
        })
      )
    );

    await installProjectDependencies(scope);

    expect(consoleError).toHaveBeenCalledWith('\nnpm error path /Users/someone/my-app\n');
    expect(trackUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'didNotInstallProjectDependencies', error: '' })
    );
    expect(fatalMock).toHaveBeenCalled();
  });

  it('shows the error message when the package manager printed nothing', async () => {
    execaMock.mockReturnValue(fakeProcess([], execaError('Command failed with exit code 1')));

    await installProjectDependencies(scope);

    expect(consoleError).toHaveBeenCalledWith('\nCommand failed with exit code 1');
    expect(fatalMock).toHaveBeenCalled();
  });

  it('shows the error message when the install fails before it starts', async () => {
    getInstallArgsMock.mockRejectedValue(new Error('Error detecting yarn version: not found'));

    await installProjectDependencies(scope);

    expect(execaMock).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('\nError detecting yarn version: not found');
    expect(trackUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'didNotInstallProjectDependencies', error: '' })
    );
    expect(fatalMock).toHaveBeenCalled();
  });
});
