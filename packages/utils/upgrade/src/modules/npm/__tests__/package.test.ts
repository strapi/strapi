import semver from 'semver';
import type { ExecaReturnValue, SyncOptions } from 'execa';
import { Package, npmPackageFactory } from '../package';
import * as constants from '../constants';
import { Logger } from '../../logger';

jest.mock('execa');
jest.mock('@strapi/utils', () => ({
  packageManager: {
    getPreferred: jest.fn(),
  },
}));

const mockNpmPackage = {
  _id: '@test/test',
  name: '@test/test',
  versions: {
    '1.0.0': {
      name: '@test/test',
      description: 'Test a new feature',
      version: '1.0.0',
      repository: {
        type: 'git',
        url: 'git+ssh://git@github.com/test/test.js.git',
      },
    },
    '2.0.0': {
      name: '@test/test',
      description: 'Test a new feature v2',
      version: '2.0.0',
      repository: {
        type: 'git',
        url: 'git+ssh://git@github.com/test/test.js.git',
      },
    },
    '3.0.0': {
      name: '@test/test',
      description: 'Test a new feature v3',
      version: '3.0.0',
      repository: {
        type: 'git',
        url: 'git+ssh://git@github.com/test/test.js.git',
      },
    },
  },
};

const mockCwd = '/path/to/project';

const mockLogger: Logger = {
  debug: jest.fn(),
  warn: jest.fn(),
  isSilent: false,
  isDebug: false,
  setSilent: jest.fn(),
  setDebug: jest.fn(),
  warnings: 0,
  errors: 0,
  stdout: undefined,
  stderr: undefined,
  info: jest.fn(),
  error: jest.fn(),
  raw: jest.fn(),
};

describe('npmPackageFactory', () => {
  it('should create a new Package instance', () => {
    const packageName = 'example-package';
    const packageInstance = npmPackageFactory(packageName, mockCwd, mockLogger);

    expect(packageInstance).toBeInstanceOf(Package);
    expect(packageInstance.name).toBe(packageName);
    expect(packageInstance.cwd).toBe(mockCwd);
    expect(packageInstance.isLoaded).toBeFalsy();
  });
});

describe('Package class', () => {
  const packageName = mockNpmPackage.name;

  const packageInstance = new Package(packageName, mockCwd, mockLogger);
  it('should fetch package data and update npmPackage', async () => {
    await packageInstance.refresh();
    expect(global.fetch).toHaveBeenCalledWith(
      `${constants.NPM_REGISTRY_URL}/${packageName}`,
      expect.anything()
    );
    expect(packageInstance.versionExists).toBeTruthy();
  });

  beforeAll(async () => {
    const mockFetchPromise = Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockNpmPackage),
    }) as Promise<Response>;

    Object.defineProperty(global, 'fetch', {
      value: jest.fn().mockImplementation(() => mockFetchPromise),
    });

    await packageInstance.refresh();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('should create a package with correct properties', () => {
    expect(packageInstance.name).toBe(packageName);
    expect(packageInstance.cwd).toBe(mockCwd);
  });

  it('isLoaded should reflect package loading state', async () => {
    const unloadedPackage = new Package(packageName, mockCwd, mockLogger);
    expect(unloadedPackage.isLoaded).toBeFalsy();
    await unloadedPackage.refresh();
    expect(unloadedPackage.isLoaded).toBeTruthy();
  });

  it('should return versions dictionary', () => {
    expect(packageInstance.getVersionsDict()).toEqual(mockNpmPackage.versions);
  });

  it('should return versions as a list', async () => {
    expect(packageInstance.getVersionsAsList()).toEqual(Object.values(mockNpmPackage.versions));
  });

  it('should return versions in the specified range', async () => {
    const range = new semver.Range('>=1.0.0 <3.0.0');

    const filteredVersions = packageInstance.findVersionsInRange(range);
    expect(filteredVersions).toEqual(Object.values(mockNpmPackage.versions).slice(0, 2));
  });

  it('refresh method should fetch package data and update npmPackage', async () => {
    const packageInstance = new Package(packageName, mockCwd, mockLogger);

    expect(packageInstance.isLoaded).toBeFalsy();

    await packageInstance.refresh();

    expect(global.fetch).toHaveBeenCalledWith(
      `${constants.NPM_REGISTRY_URL}/${packageName}`,
      expect.anything()
    );
    expect(packageInstance.isLoaded).toBeTruthy();
    expect(packageInstance.getVersionsAsList().length).toBeGreaterThan(0);
  });

  it('should return true if version exists', async () => {
    const version = new semver.SemVer('1.0.0');
    expect(packageInstance.versionExists(version)).toBeTruthy();
  });

  it('should return false if version does not exist', async () => {
    const version = new semver.SemVer('1.1.1');

    expect(packageInstance.versionExists(version)).toBeFalsy();
  });

  it('should return the version if it exists', async () => {
    const version = new semver.SemVer('1.0.0');
    expect(packageInstance.findVersion(version)).not.toBeUndefined();
  });

  it('should return undefined if the version does not exist', async () => {
    const version = new semver.SemVer('1.1.1');

    expect(packageInstance.findVersion(version)).toBeUndefined();
  });
});

describe('Package registry URL determination', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockExeca: jest.MockedFunction<
    (command: string, args?: readonly string[], options?: SyncOptions) => Promise<ExecaReturnValue>
  >;
  let mockGetPreferred: jest.MockedFunction<(string) => Promise<string | null>>;

  beforeAll(() => {
    mockExeca = jest.requireMock('execa');
    mockGetPreferred = jest.requireMock('@strapi/utils').packageManager.getPreferred;
    const mockFetchPromise = Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockNpmPackage),
    }) as Promise<Response>;

    Object.defineProperty(global, 'fetch', {
      value: jest.fn().mockImplementation(() => mockFetchPromise),
    });
  });

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
    mockExeca.mockResolvedValue({ stdout: '' } as ExecaReturnValue);
    mockGetPreferred.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use NPM_REGISTRY_URL environment variable when set', async () => {
    const customRegistry = 'https://custom-registry.example.com/';
    process.env.NPM_REGISTRY_URL = customRegistry;

    const pkg = new Package('@test/package', mockCwd, mockLogger);
    await pkg.refresh();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://custom-registry.example.com/@test/package',
      expect.anything()
    );
  });

  it('should use yarn registry when yarn is the preferred package manager', async () => {
    const yarnRegistry = 'https://yarn-registry.example.com/';
    mockGetPreferred.mockResolvedValue('yarn');
    mockExeca.mockResolvedValue({ stdout: yarnRegistry } as ExecaReturnValue);

    const pkg = new Package('@test/package', mockCwd, mockLogger);
    await pkg.refresh();

    expect(mockGetPreferred).toHaveBeenCalledWith(mockCwd);
    expect(mockExeca).toHaveBeenCalledWith('yarn', ['config', 'get', 'npmRegistryServer'], {
      timeout: 10_000,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://yarn-registry.example.com/@test/package',
      expect.anything()
    );
  });

  it('should use npm registry when npm is the preferred package manager', async () => {
    const npmRegistry = 'https://npm-registry.example.com/';
    mockGetPreferred.mockResolvedValue('npm');
    mockExeca.mockResolvedValue({ stdout: npmRegistry } as ExecaReturnValue);

    const pkg = new Package('@test/package', mockCwd, mockLogger);
    await pkg.refresh();

    expect(mockGetPreferred).toHaveBeenCalledWith(mockCwd);
    expect(mockExeca).toHaveBeenCalledWith('npm', ['config', 'get', 'registry'], {
      timeout: 10_000,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://npm-registry.example.com/@test/package',
      expect.anything()
    );
  });

  it('should fallback to default registry when no other registry is available', async () => {
    delete process.env.NPM_REGISTRY_URL;
    mockGetPreferred.mockResolvedValue(null);

    const pkg = new Package('@test/package', mockCwd, mockLogger);
    await pkg.refresh();

    expect(global.fetch).toHaveBeenCalledWith(
      `${constants.NPM_REGISTRY_URL}/@test/package`,
      expect.anything()
    );
  });

  it('should handle trailing slashes in registry URLs', async () => {
    const registryWithSlash = 'https://registry.example.com/';
    mockGetPreferred.mockResolvedValue('npm');
    mockExeca.mockResolvedValue({ stdout: registryWithSlash } as ExecaReturnValue);

    const pkg = new Package('@test/package', mockCwd, mockLogger);
    await pkg.refresh();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://registry.example.com/@test/package',
      expect.anything()
    );
  });

  it('should prioritize env var over package manager registry', async () => {
    const envRegistry = 'https://env-registry.example.com';
    const npmRegistry = 'https://npm-registry.example.com';

    process.env.NPM_REGISTRY_URL = envRegistry;
    mockGetPreferred.mockResolvedValue('npm');
    mockExeca.mockResolvedValue({ stdout: npmRegistry } as ExecaReturnValue);

    const pkg = new Package('@test/package', mockCwd, mockLogger);
    await pkg.refresh();

    expect(global.fetch).toHaveBeenCalledWith(`${envRegistry}/@test/package`, expect.anything());
    expect(mockExeca).not.toHaveBeenCalled();
  });
});
