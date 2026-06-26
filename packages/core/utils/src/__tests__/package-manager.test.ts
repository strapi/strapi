import preferredPM from 'preferred-pm';
import execa from 'execa';
import * as pkg from '../package-manager';

jest.mock('preferred-pm');
jest.mock('execa');

const mockedPreferredPM = preferredPM as jest.MockedFunction<typeof preferredPM>;
const mockedExeca = execa as jest.MockedFunction<typeof execa>;

describe('package-manager', () => {
  describe('getPreferred', () => {
    it('returns pnpm when preferred-pm detects pnpm', async () => {
      mockedPreferredPM.mockResolvedValue({ name: 'pnpm', version: '10.12.1' });

      await expect(pkg.getPreferred('/some/project')).resolves.toBe('pnpm');
      expect(mockedPreferredPM).toHaveBeenCalledWith('/some/project');
    });

    it('defaults to npm with a warning when the detected package manager is not supported', async () => {
      const warnSpy = jest.spyOn(process, 'emitWarning').mockImplementation(() => {});
      mockedPreferredPM.mockResolvedValue({ name: 'bun', version: '1.2.0' });

      await expect(pkg.getPreferred('/some/project')).resolves.toBe('npm');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('throws when preferred-pm cannot detect a package manager', async () => {
      mockedPreferredPM.mockResolvedValue(undefined);

      await expect(pkg.getPreferred('/some/project')).rejects.toThrow(
        `Couldn't find a package manager in your project.`
      );
    });
  });

  describe('installDependencies', () => {
    it('runs pnpm install in the given directory', async () => {
      mockedExeca.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as Awaited<
        ReturnType<typeof execa>
      >);

      await pkg.installDependencies('/project/root', 'pnpm');

      expect(mockedExeca).toHaveBeenCalledWith('pnpm', ['install'], {
        cwd: '/project/root',
        stdin: 'ignore',
      });
    });
  });
});
