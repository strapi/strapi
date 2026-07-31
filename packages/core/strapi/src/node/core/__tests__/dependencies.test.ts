import execa from 'execa';
import readPkgUp from 'read-pkg-up';
import resolveFrom from 'resolve-from';
import fs from 'node:fs/promises';

import {
  findUndeclaredAdminPeerDeps,
  getInstallCommandHint,
  installAdminPeerDeps,
  reexecCurrentCommand,
  reportMissingAdminPeerDeps,
  validateDeclaredAdminPeerDeps,
} from '../dependencies';
import { ensureAdminDependencies, handleAdminDependencies } from '../ensure-admin-dependencies';
import { getPackageManager } from '../managers';
import { expectExit } from '../../../cli/commands/__tests__/commands.test.utils';

jest.mock('read-pkg-up');
jest.mock('execa');
jest.mock('../managers', () => ({
  getPackageManager: jest.fn(),
}));
jest.mock('resolve-from', () => ({
  __esModule: true,
  default: {
    silent: jest.fn(),
  },
}));
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

const readPkgUpMock = readPkgUp as jest.MockedFunction<typeof readPkgUp>;
const execaMock = execa as unknown as jest.Mock;
const getPackageManagerMock = getPackageManager as jest.MockedFunction<typeof getPackageManager>;
const resolveFromSilentMock = resolveFrom.silent as jest.MockedFunction<typeof resolveFrom.silent>;
const readFileMock = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

const cwd = '/tmp/strapi-app';

const createLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

const packageJsonMissingPeers = {
  dependencies: {
    '@strapi/strapi': '^5.0.0',
  },
};

const packageJsonWithPeers = {
  dependencies: {
    '@strapi/strapi': '^5.0.0',
    react: '^18.0.0',
    'react-dom': '^18.0.0',
    'react-router-dom': '^6.0.0',
    'styled-components': '^6.0.0',
  },
};

const mockAllPeersInstalled = () => {
  resolveFromSilentMock.mockImplementation((_, modulePath: string) => {
    const name = modulePath.replace('/package.json', '');
    return `/tmp/strapi-app/node_modules/${name}/package.json`;
  });

  readFileMock.mockImplementation(async (filePath) => {
    const pkgName = String(filePath).split('/node_modules/')[1]?.split('/')[0];

    const versions: Record<string, string> = {
      react: '18.3.1',
      'react-dom': '18.3.1',
      'react-router-dom': '6.30.0',
      'styled-components': '6.1.19',
    };

    return JSON.stringify({ name: pkgName, version: versions[pkgName ?? ''] ?? '1.0.0' });
  });
};

describe('admin peer dependency checks', () => {
  const originalArgv = process.argv;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalExperimental = process.env.USE_EXPERIMENTAL_DEPENDENCIES;

  beforeEach(() => {
    jest.clearAllMocks();
    process.argv = ['node', '/path/to/strapi', 'build'];
    delete process.env.USE_EXPERIMENTAL_DEPENDENCIES;
    process.env.NODE_ENV = 'production';
    getPackageManagerMock.mockReturnValue('npm');
    execaMock.mockResolvedValue({ exitCode: 0, failed: false });
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.USE_EXPERIMENTAL_DEPENDENCIES = originalExperimental;
  });

  describe('findUndeclaredAdminPeerDeps', () => {
    it('returns undeclared admin peer dependencies', async () => {
      readPkgUpMock.mockResolvedValue({
        path: `${cwd}/package.json`,
        packageJson: packageJsonMissingPeers,
      } as Awaited<ReturnType<typeof readPkgUp>>);

      const missing = await findUndeclaredAdminPeerDeps(cwd);

      expect(missing).toEqual(
        expect.arrayContaining([
          { name: 'react', wantedVersion: '^18.0.0' },
          { name: 'react-dom', wantedVersion: '^18.0.0' },
          { name: 'react-router-dom', wantedVersion: '^6.0.0' },
          { name: 'styled-components', wantedVersion: '^6.0.0' },
        ])
      );
      expect(missing).toHaveLength(4);
    });

    it('returns an empty list when all admin peers are declared', async () => {
      readPkgUpMock.mockResolvedValue({
        path: `${cwd}/package.json`,
        packageJson: packageJsonWithPeers,
      } as Awaited<ReturnType<typeof readPkgUp>>);

      const missing = await findUndeclaredAdminPeerDeps(cwd);

      expect(missing).toEqual([]);
    });
  });

  describe('getInstallCommandHint', () => {
    it('uses yarn when yarn is the package manager', () => {
      getPackageManagerMock.mockReturnValue('yarn');

      expect(getInstallCommandHint([{ name: 'react', wantedVersion: '^18.0.0' }])).toBe(
        'yarn add react@^18.0.0'
      );
    });

    it('uses pnpm when pnpm is the package manager', () => {
      getPackageManagerMock.mockReturnValue('pnpm');

      expect(getInstallCommandHint([{ name: 'react', wantedVersion: '^18.0.0' }])).toBe(
        'pnpm add --save-prod react@^18.0.0'
      );
    });

    it('uses npm without legacy peer deps when npm is the package manager', () => {
      getPackageManagerMock.mockReturnValue('npm');

      expect(getInstallCommandHint([{ name: 'react', wantedVersion: '^18.0.0' }])).toBe(
        'npm install --save react@^18.0.0'
      );
    });
  });

  describe('reportMissingAdminPeerDeps', () => {
    it('logs a command-agnostic install hint', () => {
      const logger = createLogger();

      reportMissingAdminPeerDeps(logger, [{ name: 'react', wantedVersion: '^18.0.0' }]);

      expect(logger.error).toHaveBeenCalledWith(
        'Please install them manually before re-running this command:',
        expect.any(String),
        '  npm install --save react@^18.0.0'
      );
    });
  });

  describe('installAdminPeerDeps', () => {
    it('runs npm install without legacy peer deps', async () => {
      const logger = createLogger();

      await installAdminPeerDeps([{ name: 'react', wantedVersion: '^18.0.0' }], { cwd, logger });

      expect(execaMock).toHaveBeenCalledWith(
        'npm',
        ['install', '--save', 'react@^18.0.0'],
        expect.objectContaining({ cwd })
      );
      expect(execaMock.mock.calls[0][1]).not.toContain('--legacy-peer-deps');
    });
  });

  describe('reexecCurrentCommand', () => {
    it('re-runs the current CLI process', async () => {
      await reexecCurrentCommand(cwd);

      expect(execaMock).toHaveBeenCalledWith(
        'node',
        ['/path/to/strapi', 'build'],
        expect.objectContaining({ cwd, stdio: 'inherit' })
      );
    });
  });

  describe('validateDeclaredAdminPeerDeps', () => {
    beforeEach(() => {
      readPkgUpMock.mockResolvedValue({
        path: `${cwd}/package.json`,
        packageJson: packageJsonWithPeers,
      } as Awaited<ReturnType<typeof readPkgUp>>);
      mockAllPeersInstalled();
    });

    it('does not throw when declared peers are installed', async () => {
      const logger = createLogger();

      await expect(validateDeclaredAdminPeerDeps(cwd, logger)).resolves.toBeUndefined();
    });
  });

  describe('ensureAdminDependencies', () => {
    describe('when admin peer deps are undeclared', () => {
      beforeEach(() => {
        readPkgUpMock.mockResolvedValue({
          path: `${cwd}/package.json`,
          packageJson: packageJsonMissingPeers,
        } as Awaited<ReturnType<typeof readPkgUp>>);
      });

      it('throws when installIfMissing is false (build default)', async () => {
        const logger = createLogger();

        await expect(
          ensureAdminDependencies({ cwd, logger, installIfMissing: false })
        ).rejects.toThrow(
          'Missing required dependencies. Please install them and re-run this command.'
        );

        expect(logger.error).toHaveBeenCalled();
        expect(execaMock).not.toHaveBeenCalled();
      });

      it('installs and re-runs when installIfMissing is true (develop default)', async () => {
        const logger = createLogger();

        const result = await ensureAdminDependencies({ cwd, logger, installIfMissing: true });

        expect(result).toEqual({ didInstall: true });
        expect(logger.info).toHaveBeenCalledWith(
          'The Strapi admin needs to install the following dependencies:',
          expect.any(String),
          expect.stringContaining('react@^18.0.0')
        );
        expect(execaMock).toHaveBeenCalledWith(
          'npm',
          expect.arrayContaining(['install', '--save', 'react@^18.0.0']),
          expect.objectContaining({ cwd })
        );
        expect(execaMock.mock.calls[0][1]).not.toContain('--legacy-peer-deps');
        expect(execaMock).toHaveBeenCalledWith(
          'node',
          ['/path/to/strapi', 'build'],
          expect.objectContaining({ cwd, stdio: 'inherit' })
        );
      });
    });

    describe('when all admin peer deps are declared', () => {
      beforeEach(() => {
        readPkgUpMock.mockResolvedValue({
          path: `${cwd}/package.json`,
          packageJson: packageJsonWithPeers,
        } as Awaited<ReturnType<typeof readPkgUp>>);
      });

      it('returns didInstall false without installing', async () => {
        const logger = createLogger();

        const result = await ensureAdminDependencies({ cwd, logger, installIfMissing: false });

        expect(result).toEqual({ didInstall: false });
        expect(execaMock).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
      });
    });

    describe('USE_EXPERIMENTAL_DEPENDENCIES', () => {
      it('skips dependency checks when enabled', async () => {
        process.env.USE_EXPERIMENTAL_DEPENDENCIES = 'true';
        const logger = createLogger();

        const result = await ensureAdminDependencies({ cwd, logger, installIfMissing: false });

        expect(result).toEqual({ didInstall: false });
        expect(readPkgUpMock).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(
          'You are using experimental dependencies that may not be compatible with Strapi.'
        );
      });
    });
  });

  describe('handleAdminDependencies', () => {
    beforeEach(() => {
      readPkgUpMock.mockResolvedValue({
        path: `${cwd}/package.json`,
        packageJson: packageJsonMissingPeers,
      } as Awaited<ReturnType<typeof readPkgUp>>);
    });

    it('exits when dependencies are missing and installIfMissing is false', async () => {
      const logger = createLogger();

      await expectExit(1, () => handleAdminDependencies({ cwd, logger, installIfMissing: false }));

      expect(logger.error).toHaveBeenCalledWith(
        'Missing required dependencies. Please install them and re-run this command.'
      );
    });
  });
});
