import path from 'path';
import fse from 'fs-extra';
import execa from 'execa';
import { packageManager as packageManagerUtils } from '@strapi/utils';

import { detectPackageManager, parsePackageManagerField, readsYarnrcYml } from '../package-manager';
import { createTemporaryDirectory } from './test-helpers';

jest.mock('execa', () => jest.fn());
jest.mock('@strapi/utils', () => ({ packageManager: { getPreferred: jest.fn() } }));

const execaMock = execa as unknown as jest.Mock;
const getPreferredMock = packageManagerUtils.getPreferred as jest.Mock;

const createApp = async (packageJson: Record<string, unknown> = {}) => {
  const appDir = await createTemporaryDirectory();
  await fse.writeJson(path.join(appDir, 'package.json'), packageJson);
  return appDir;
};

describe('parsePackageManagerField', () => {
  it.each([
    ['yarn@4.5.0', { name: 'yarn', majorVersion: 4 }],
    ['yarn@1.22.22', { name: 'yarn', majorVersion: 1 }],
    ['pnpm@9.1.0+sha512.abc', { name: 'pnpm', majorVersion: 9 }],
    ['npm@10.9.0', { name: 'npm', majorVersion: 10 }],
    ['bun@1.1.0', undefined],
    [undefined, undefined],
  ])('reads %s', (packageManagerField, expected) => {
    expect(parsePackageManagerField(packageManagerField)).toEqual(expected);
  });
});

describe('detectPackageManager', () => {
  afterEach(() => jest.clearAllMocks());

  it('uses the packageManager field first', async () => {
    const appDir = await createApp({ packageManager: 'yarn@4.5.0' });

    await expect(detectPackageManager(appDir)).resolves.toEqual({ name: 'yarn', majorVersion: 4 });
    expect(getPreferredMock).not.toHaveBeenCalled();
  });

  it('falls back to the lockfile detection', async () => {
    const appDir = await createApp();
    getPreferredMock.mockResolvedValue('pnpm');

    await expect(detectPackageManager(appDir)).resolves.toEqual({ name: 'pnpm' });
  });

  it('reads the Yarn major version, since Yarn 1 and 4 use different config files', async () => {
    const appDir = await createApp();
    getPreferredMock.mockResolvedValue('yarn');
    execaMock.mockResolvedValue({ stdout: '1.22.22\n' });

    await expect(detectPackageManager(appDir)).resolves.toEqual({ name: 'yarn', majorVersion: 1 });
    expect(execaMock).toHaveBeenCalledWith('yarn', ['--version'], { cwd: appDir });
  });
});

describe('readsYarnrcYml', () => {
  it.each([
    [{ name: 'yarn', majorVersion: 4 }, true],
    [{ name: 'yarn', majorVersion: 1 }, false],
    [{ name: 'npm' }, false],
    [{ name: 'pnpm', majorVersion: 9 }, false],
  ] as const)('for %j is %s', (packageManager, expected) => {
    expect(readsYarnrcYml(packageManager)).toBe(expected);
  });
});
