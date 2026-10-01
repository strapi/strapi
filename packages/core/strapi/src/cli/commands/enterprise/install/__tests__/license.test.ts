import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import { readLicense, verifyLicense } from '@strapi/core/_internal/license';

import { findLicense, resolveLicense, validateLicense } from '../license';
import {
  createTemporaryDirectory,
  createTestLogger,
  loggedText,
  readFilePermissions,
} from './test-helpers';

jest.mock('@strapi/core/_internal/license', () => ({
  readLicense: jest.fn(),
  verifyLicense: jest.fn(),
}));

const readLicenseMock = readLicense as jest.Mock;
const verifyLicenseMock = verifyLicense as jest.Mock;

const NOW = new Date('2026-09-28T12:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
  // Behaves like the real `readLicense`: the content of license.txt, or undefined.
  readLicenseMock.mockImplementation((appDir: string) => {
    const licenseFilePath = path.join(appDir, 'license.txt');
    return fs.existsSync(licenseFilePath) ? fs.readFileSync(licenseFilePath).toString() : undefined;
  });
  verifyLicenseMock.mockReturnValue({ type: 'gold', isTrial: false });
});

describe('findLicense', () => {
  it('prefers STRAPI_LICENSE, then license.txt', async () => {
    const appDir = await createTemporaryDirectory();
    await fse.writeFile(path.join(appDir, 'license.txt'), 'from-license-file\n');

    await expect(findLicense({ appDir, env: { STRAPI_LICENSE: 'from-env' } })).resolves.toEqual({
      license: 'from-env',
      source: 'environment',
    });
    await expect(findLicense({ appDir, env: {} })).resolves.toEqual({
      license: 'from-license-file',
      source: 'license-file',
    });
  });

  it('tells a license loaded from .env apart from one set in the shell', async () => {
    const appDir = await createTemporaryDirectory();
    const env = { STRAPI_LICENSE: 'the-license' };

    await expect(findLicense({ appDir, env })).resolves.toEqual({
      license: 'the-license',
      source: 'environment',
    });

    await fse.writeFile(path.join(appDir, '.env'), 'STRAPI_LICENSE=the-license\n');

    await expect(findLicense({ appDir, env })).resolves.toEqual({
      license: 'the-license',
      source: 'env-file',
    });

    // The shell wins over .env, as when Strapi loads it.
    await fse.writeFile(path.join(appDir, '.env'), 'STRAPI_LICENSE=another-license\n');

    await expect(findLicense({ appDir, env })).resolves.toMatchObject({ source: 'environment' });
  });

  it('reads the .env file named by ENV_PATH, as Strapi does', async () => {
    const appDir = await createTemporaryDirectory();
    await fse.writeFile(path.join(appDir, 'custom.env'), 'STRAPI_LICENSE=the-license\n');

    await expect(
      findLicense({ appDir, env: { STRAPI_LICENSE: 'the-license', ENV_PATH: 'custom.env' } })
    ).resolves.toMatchObject({ source: 'env-file' });
  });

  it('does not read .env itself, since the command loads it into the environment first', async () => {
    const appDir = await createTemporaryDirectory();
    await fse.writeFile(path.join(appDir, '.env'), 'STRAPI_LICENSE=from-env-file\n');

    await expect(findLicense({ appDir, env: {} })).resolves.toBeUndefined();
  });

  it('stops with a one-line error when license.txt cannot be read', async () => {
    readLicenseMock.mockImplementation(() => {
      throw new Error('License file not readable, review its format and access rules.');
    });

    await expect(
      findLicense({ appDir: await createTemporaryDirectory(), env: {} })
    ).rejects.toThrow(
      'Could not read license.txt. Check its permissions, or set STRAPI_LICENSE instead.'
    );
  });

  it('finds nothing when no source has a license', async () => {
    await expect(
      findLicense({ appDir: await createTemporaryDirectory(), env: {} })
    ).resolves.toBeUndefined();
  });
});

describe('validateLicense', () => {
  it('rejects a license whose signature does not verify', () => {
    verifyLicenseMock.mockImplementation(() => {
      throw new Error('Invalid license.');
    });

    expect(() => validateLicense('not-a-license', NOW)).toThrow(
      'This Strapi license is not valid.'
    );
  });

  it('rejects an expired license', () => {
    verifyLicenseMock.mockReturnValue({ expireAt: '2026-09-01T00:00:00.000Z' });

    expect(() => validateLicense('expired-license', NOW)).toThrow(
      'This Strapi license expired on 2026-09-01.'
    );
  });

  it('rejects an expired license whose expiry date is in milliseconds, as real licenses store it', () => {
    verifyLicenseMock.mockReturnValue({ expireAt: Date.parse('2026-09-01T00:00:00.000Z') });

    expect(() => validateLicense('expired-license', NOW)).toThrow(
      'This Strapi license expired on 2026-09-01.'
    );
  });

  it('accepts a license without an expiry date or not expired yet', () => {
    expect(() => validateLicense('license', NOW)).not.toThrow();

    verifyLicenseMock.mockReturnValue({ expireAt: '2027-03-01T00:00:00.000Z' });

    expect(() => validateLicense('license', NOW)).not.toThrow();

    verifyLicenseMock.mockReturnValue({ expireAt: Date.parse('2027-03-01T00:00:00.000Z') });

    expect(() => validateLicense('license', NOW)).not.toThrow();
  });
});

describe('resolveLicense', () => {
  it('uses a found license and says where it came from, without asking', async () => {
    const logger = createTestLogger();
    const prompt = jest.fn();

    await expect(
      resolveLicense({
        appDir: await createTemporaryDirectory(),
        isInteractive: true,
        logger,
        env: { STRAPI_LICENSE: 'the-license' },
        now: NOW,
        prompt,
      })
    ).resolves.toEqual({ license: 'the-license', source: 'environment' });
    expect(prompt).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      'Using the Strapi license from the STRAPI_LICENSE environment variable.'
    );
  });

  it('fails without a license when there is no terminal to ask in', async () => {
    const prompt = jest.fn();

    await expect(
      resolveLicense({
        appDir: await createTemporaryDirectory(),
        isInteractive: false,
        logger: createTestLogger(),
        env: {},
        now: NOW,
        prompt,
      })
    ).rejects.toThrow(
      'No Strapi license found. Set STRAPI_LICENSE, or run the command in a terminal to paste it.'
    );
    expect(prompt).not.toHaveBeenCalled();
  });

  it('restricts an existing, empty license.txt to its owner when saving the pasted license', async () => {
    const appDir = await createTemporaryDirectory();
    const licenseFilePath = path.join(appDir, 'license.txt');
    await fse.writeFile(licenseFilePath, '', { mode: 0o644 });

    await resolveLicense({
      appDir,
      isInteractive: true,
      logger: createTestLogger(),
      env: {},
      now: NOW,
      prompt: async () => 'pasted-license',
    });

    expect(await fse.readFile(licenseFilePath, 'utf8')).toBe('pasted-license\n');
    expect(await readFilePermissions(licenseFilePath)).toBe('600');
  });

  it('asks for a license, saves it to license.txt only, and ignores it in git', async () => {
    const appDir = await createTemporaryDirectory();
    const logger = createTestLogger();
    await fse.writeFile(path.join(appDir, '.gitignore'), 'node_modules');
    await fse.writeFile(path.join(appDir, '.env'), 'HOST=0.0.0.0\n');

    await expect(
      resolveLicense({
        appDir,
        isInteractive: true,
        logger,
        env: {},
        now: NOW,
        prompt: async () => 'pasted-license',
      })
    ).resolves.toEqual({ license: 'pasted-license', source: 'prompt' });

    const licenseFilePath = path.join(appDir, 'license.txt');
    expect(await fse.readFile(licenseFilePath, 'utf8')).toBe('pasted-license\n');
    expect(await readFilePermissions(licenseFilePath)).toBe('600');
    expect(await fse.readFile(path.join(appDir, '.gitignore'), 'utf8')).toBe(
      'node_modules\nlicense.txt\n'
    );
    expect(await fse.readFile(path.join(appDir, '.env'), 'utf8')).toBe('HOST=0.0.0.0\n');
    expect(loggedText(logger)).not.toContain('pasted-license');
  });

  it('leaves .gitignore alone when it already ignores license.txt', async () => {
    const appDir = await createTemporaryDirectory();
    await fse.writeFile(path.join(appDir, '.gitignore'), '.env\nlicense.txt\n');

    await resolveLicense({
      appDir,
      isInteractive: true,
      logger: createTestLogger(),
      env: {},
      now: NOW,
      prompt: async () => 'pasted-license',
    });

    expect(await fse.readFile(path.join(appDir, '.gitignore'), 'utf8')).toBe('.env\nlicense.txt\n');
  });

  it('writes nothing when the pasted license is not valid', async () => {
    const appDir = await createTemporaryDirectory();
    verifyLicenseMock.mockImplementation(() => {
      throw new Error('Invalid license.');
    });

    await expect(
      resolveLicense({
        appDir,
        isInteractive: true,
        logger: createTestLogger(),
        env: {},
        now: NOW,
        prompt: async () => 'bad-license',
      })
    ).rejects.toThrow('This Strapi license is not valid.');
    expect(await fse.pathExists(path.join(appDir, 'license.txt'))).toBe(false);
    expect(await fse.pathExists(path.join(appDir, '.gitignore'))).toBe(false);
  });
});
