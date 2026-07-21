import execa from 'execa';
import * as pkg from '../package-manager';
import { getPreferredPM } from '../get-preferred-pm';

jest.mock('../get-preferred-pm');
jest.mock('execa');

const mockedGetPreferredPM = getPreferredPM as jest.MockedFunction<typeof getPreferredPM>;
const mockedExeca = execa as jest.MockedFunction<typeof execa>;

describe('package-manager', () => {
  const preferredPM = jest.fn();

  beforeEach(() => {
    preferredPM.mockReset();
    mockedGetPreferredPM.mockResolvedValue(preferredPM);
  });

  describe('getPreferred', () => {
    it('returns pnpm when preferred-pm detects pnpm', async () => {
      preferredPM.mockResolvedValue({ name: 'pnpm', version: '10.12.1' });

      await expect(pkg.getPreferred('/some/project')).resolves.toBe('pnpm');
      expect(preferredPM).toHaveBeenCalledWith('/some/project');
    });

    it('defaults to npm with a warning when the detected package manager is not supported', async () => {
      const warnSpy = jest.spyOn(process, 'emitWarning').mockImplementation(() => {});
      preferredPM.mockResolvedValue({ name: 'bun', version: '1.2.0' });

      await expect(pkg.getPreferred('/some/project')).resolves.toBe('npm');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('throws when preferred-pm cannot detect a package manager', async () => {
      preferredPM.mockResolvedValue(null);

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
