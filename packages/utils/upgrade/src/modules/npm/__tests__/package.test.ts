import semver from 'semver';
import { Package, npmPackageFactory } from '../package';
import * as constants from '../constants';

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

describe('npmPackageFactory', () => {
  it('should create a new Package instance', () => {
    const packageName = 'example-package';
    const packageInstance = npmPackageFactory(packageName);

    expect(packageInstance).toBeInstanceOf(Package);
    expect(packageInstance.name).toBe(packageName);
    expect(packageInstance.packageURL).toBe(`${constants.NPM_REGISTRY_URL}/${packageName}`);
    expect(packageInstance.isLoaded).toBeFalsy();
  });
});

describe('Package class', () => {
  const packageName = mockNpmPackage.name;
  const packageInstance = new Package(packageName);
  it('should fetch package data and update npmPackage', async () => {
    await packageInstance.refresh();
    expect(global.fetch).toHaveBeenCalledWith(packageInstance.packageURL);
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
    expect(packageInstance.packageURL).toBe(`${constants.NPM_REGISTRY_URL}/${packageName}`);
  });

  it('isLoaded should reflect package loading state', async () => {
    const unloadedPackage = new Package(packageName);
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
    const packageInstance = new Package(packageName);

    expect(packageInstance.isLoaded).toBeFalsy();

    await packageInstance.refresh();

    expect(global.fetch).toHaveBeenCalledWith(packageInstance.packageURL);
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
