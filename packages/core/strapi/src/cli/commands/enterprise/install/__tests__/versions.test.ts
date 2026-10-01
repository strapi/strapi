import path from 'path';
import fse from 'fs-extra';

import {
  canCheckStrapiCompatibility,
  describeNewerIncompatibleVersion,
  isUpgrade,
  pickTargetVersion,
  readInstalledVersion,
} from '../versions';
import { createPackument, createTemporaryDirectory } from './test-helpers';

const aiByokPackument = createPackument('@strapi-enterprise/plugin-ai-byok', [
  { version: '1.1.0', strapiRange: '^5.52.0' },
  { version: '1.2.0', strapiRange: '^5.54.0' },
  { version: '1.3.0', strapiRange: '^5.56.0' },
]);

describe('pickTargetVersion', () => {
  it('picks the highest version that fits the app Strapi version', () => {
    expect(pickTargetVersion(aiByokPackument, '5.54.1')).toEqual({
      targetVersion: '1.2.0',
      newestVersion: '1.3.0',
      newestVersionStrapiRange: '^5.56.0',
    });
  });

  it('picks the newest version when it fits', () => {
    expect(pickTargetVersion(aiByokPackument, '5.56.2').targetVersion).toBe('1.3.0');
  });

  it('returns no target when no version fits', () => {
    expect(pickTargetVersion(aiByokPackument, '5.50.0').targetVersion).toBeUndefined();
  });

  it('never picks a prerelease or a deprecated version', () => {
    const packument = createPackument('@strapi-enterprise/plugin-ai-byok', [
      { version: '1.0.0', strapiRange: '^5.0.0' },
      { version: '1.1.0', strapiRange: '^5.0.0', deprecated: 'Use 1.0.0 instead.' },
      { version: '2.0.0-beta.1', strapiRange: '^5.0.0' },
    ]);

    expect(pickTargetVersion(packument, '5.54.1')).toMatchObject({
      targetVersion: '1.0.0',
      newestVersion: '1.0.0',
    });
  });

  it('treats a version without a Strapi peer range as compatible', () => {
    const packument = createPackument('@strapi-enterprise/plugin-ai-byok', [{ version: '1.0.0' }]);

    expect(pickTargetVersion(packument, '5.54.1').targetVersion).toBe('1.0.0');
  });

  it('skips the compatibility check for a prerelease Strapi', () => {
    expect(pickTargetVersion(aiByokPackument, '0.0.0-experimental.18cedb5').targetVersion).toBe(
      '1.3.0'
    );
  });

  it('finds nothing when a package only has prerelease builds', () => {
    const packument = createPackument('@strapi-enterprise/plugin-ai-byok', [
      { version: '0.0.0-experimental.8be2653', strapiRange: '>=5.52.0 <6.0.0' },
    ]);

    expect(pickTargetVersion(packument, '5.54.1')).toEqual({
      targetVersion: undefined,
      newestVersion: undefined,
      newestVersionStrapiRange: undefined,
    });
  });
});

describe('describeNewerIncompatibleVersion', () => {
  it('describes a newer version that needs a newer Strapi', () => {
    expect(describeNewerIncompatibleVersion(pickTargetVersion(aiByokPackument, '5.54.1'))).toBe(
      '1.3.0 is available but requires Strapi ^5.56.0.'
    );
  });

  it('says nothing when the target is the newest version', () => {
    expect(
      describeNewerIncompatibleVersion(pickTargetVersion(aiByokPackument, '5.56.0'))
    ).toBeUndefined();
  });

  it('says nothing when that version, or a later one, is already installed', () => {
    const versionChoice = pickTargetVersion(aiByokPackument, '5.54.1');

    expect(describeNewerIncompatibleVersion(versionChoice, '1.3.0')).toBeUndefined();
    expect(describeNewerIncompatibleVersion(versionChoice, '1.4.0')).toBeUndefined();
    expect(describeNewerIncompatibleVersion(versionChoice, '1.2.0')).toBe(
      '1.3.0 is available but requires Strapi ^5.56.0.'
    );
  });
});

describe('isUpgrade', () => {
  it.each([
    ['1.1.0', '1.2.0', true],
    ['1.2.0', '1.2.0', false],
    ['1.3.0', '1.2.0', false],
    ['0.0.0-experimental.8be2653', '1.0.0', true],
  ])('from %s to %s is %s', (installedVersion, targetVersion, expected) => {
    expect(isUpgrade(installedVersion, targetVersion)).toBe(expected);
  });
});

describe('canCheckStrapiCompatibility', () => {
  it.each([
    ['5.54.1', true],
    ['0.0.0-experimental.18cedb5', false],
    [undefined, false],
  ])('for %s is %s', (strapiVersion, expected) => {
    expect(canCheckStrapiCompatibility(strapiVersion)).toBe(expected);
  });
});

describe('readInstalledVersion', () => {
  it('reads the version from node_modules, resolving from parent folders', async () => {
    const rootDir = await createTemporaryDirectory();
    const appDir = path.join(rootDir, 'apps', 'my-app');
    await fse.outputJson(path.join(rootDir, 'node_modules', '@strapi', 'strapi', 'package.json'), {
      version: '5.54.1',
    });
    await fse.ensureDir(appDir);

    await expect(readInstalledVersion(appDir, '@strapi/strapi')).resolves.toBe('5.54.1');
  });

  it('stops with a one-line error when an installed package.json is not valid JSON', async () => {
    const appDir = await createTemporaryDirectory();
    const packageJsonPath = path.join(appDir, 'node_modules', '@strapi', 'strapi', 'package.json');
    await fse.outputFile(packageJsonPath, '{');

    await expect(readInstalledVersion(appDir, '@strapi/strapi')).rejects.toThrow(
      `Could not read ${packageJsonPath}. Reinstall the app's dependencies, then try again.`
    );
  });

  it('returns undefined when the package is not installed', async () => {
    const appDir = await createTemporaryDirectory();

    await expect(
      readInstalledVersion(appDir, '@strapi-enterprise/plugin-ai-byok')
    ).resolves.toBeUndefined();
  });
});
