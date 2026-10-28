import execa from 'execa';

import { EnterpriseInstallError, PackageManagerError } from '../errors';
import { buildInstallCommand, installPackages } from '../install-packages';

jest.mock('execa', () => jest.fn());

const execaMock = execa as unknown as jest.Mock;

const SPECS = ['@strapi-enterprise/plugin-ai-byok@1.2.0'];

describe('buildInstallCommand', () => {
  it('keeps the exact version with npm, which would otherwise save a ^ range', () => {
    expect(buildInstallCommand({ name: 'npm', majorVersion: 10 }, SPECS)).toEqual({
      command: 'npm',
      args: ['install', '--save-exact', ...SPECS],
    });
  });

  it.each(['pnpm', 'yarn'] as const)('uses %s add, which saves an exact version as is', (name) => {
    expect(buildInstallCommand({ name, majorVersion: 4 }, SPECS)).toEqual({
      command: name,
      args: ['add', ...SPECS],
    });
  });
});

describe('installPackages', () => {
  const install = () =>
    installPackages({
      appDir: '/app',
      packageManager: { name: 'npm', majorVersion: 10 },
      installSpecs: SPECS,
    });

  it('keeps the exit code of a failed install, since the package manager printed its output', async () => {
    execaMock.mockRejectedValue(Object.assign(new Error('Command failed'), { exitCode: 2 }));

    const installing = install();

    await expect(installing).rejects.toBeInstanceOf(PackageManagerError);
    await expect(installing).rejects.toMatchObject({ exitCode: 2 });
  });

  it('says so in one line when the package manager cannot start', async () => {
    execaMock.mockRejectedValue(Object.assign(new Error('spawn npm ENOENT'), { code: 'ENOENT' }));

    const installing = install();

    await expect(installing).rejects.toBeInstanceOf(EnterpriseInstallError);
    await expect(installing).rejects.toThrow('Could not run npm. Check that it is installed.');
  });
});
