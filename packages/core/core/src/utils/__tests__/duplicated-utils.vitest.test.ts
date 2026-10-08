import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { findDuplicatedUtils, warnOnDuplicatedUtils } from '../duplicated-utils';

let appRoot: string;

const writePackage = (dir: string, pkg: Record<string, unknown>) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
};

const modules = (...parts: string[]) => path.join(appRoot, 'node_modules', ...parts);

const hoistedUtils = () => require.resolve('@strapi/utils/package.json', { paths: [appRoot] });

beforeEach(() => {
  appRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-duplicated-utils-')));

  writePackage(modules('@strapi', 'utils'), { name: '@strapi/utils', version: '5.0.0' });
  writePackage(modules('shared-plugin'), {
    name: 'shared-plugin',
    version: '1.0.0',
    dependencies: { '@strapi/utils': '5.0.0' },
  });
  writePackage(modules('drifted-plugin'), {
    name: 'drifted-plugin',
    version: '2.0.0',
    dependencies: { '@strapi/utils': '4.0.0' },
  });
  writePackage(modules('drifted-plugin', 'node_modules', '@strapi', 'utils'), {
    name: '@strapi/utils',
    version: '4.0.0',
  });
  writePackage(modules('lodash'), { name: 'lodash', version: '4.17.21' });
});

afterEach(() => {
  fs.rmSync(appRoot, { recursive: true, force: true });
});

describe('findDuplicatedUtils', () => {
  it('lists the dependencies that load another copy of @strapi/utils', () => {
    expect(
      findDuplicatedUtils(
        appRoot,
        { 'shared-plugin': '1.0.0', 'drifted-plugin': '2.0.0', lodash: '4.17.21' },
        hoistedUtils()
      )
    ).toEqual([
      {
        name: 'drifted-plugin',
        version: '2.0.0',
        utilsPath: modules('drifted-plugin', 'node_modules', '@strapi', 'utils', 'package.json'),
        utilsVersion: '4.0.0',
      },
    ]);
  });

  it('detects a second copy even when it has the same version', () => {
    writePackage(modules('drifted-plugin', 'node_modules', '@strapi', 'utils'), {
      name: '@strapi/utils',
      version: '5.0.0',
    });

    expect(
      findDuplicatedUtils(appRoot, { 'drifted-plugin': '2.0.0' }, hoistedUtils()).map(
        ({ name, utilsVersion }) => ({ name, utilsVersion })
      )
    ).toEqual([{ name: 'drifted-plugin', utilsVersion: '5.0.0' }]);
  });

  it('ignores dependencies that do not use @strapi/utils', () => {
    writePackage(modules('unrelated'), { name: 'unrelated', version: '1.0.0' });
    writePackage(modules('unrelated', 'node_modules', '@strapi', 'utils'), {
      name: '@strapi/utils',
      version: '4.0.0',
    });

    expect(findDuplicatedUtils(appRoot, { unrelated: '1.0.0' }, hoistedUtils())).toEqual([]);
  });

  it('checks dependencies that use @strapi/utils as a peer dependency', () => {
    writePackage(modules('peer-plugin'), {
      name: 'peer-plugin',
      version: '3.0.0',
      peerDependencies: { '@strapi/utils': '^5.0.0' },
    });
    writePackage(modules('peer-plugin', 'node_modules', '@strapi', 'utils'), {
      name: '@strapi/utils',
      version: '5.1.0',
    });

    expect(
      findDuplicatedUtils(appRoot, { 'peer-plugin': '3.0.0' }, hoistedUtils()).map(
        ({ name }) => name
      )
    ).toEqual(['peer-plugin']);
  });

  it('ignores dependencies that are not installed', () => {
    expect(findDuplicatedUtils(appRoot, { 'not-installed': '1.0.0' }, hoistedUtils())).toEqual([]);
  });

  it('does nothing when core @strapi/utils cannot be resolved', () => {
    expect(findDuplicatedUtils(appRoot, { 'drifted-plugin': '2.0.0' }, null)).toEqual([]);
  });
});

describe('warnOnDuplicatedUtils', () => {
  const createStrapi = (dependencies: Record<string, string>, warn = vi.fn()) =>
    ({
      dirs: { app: { root: appRoot } },
      config: { get: () => dependencies },
      log: { warn },
    }) as never;

  it('does not log when no dependency is installed', () => {
    const warn = vi.fn();

    warnOnDuplicatedUtils(createStrapi({ 'not-installed': '1.0.0' }, warn));

    expect(warn).not.toHaveBeenCalled();
  });

  it('names the dependency that loads its own @strapi/utils', () => {
    const warn = vi.fn();

    warnOnDuplicatedUtils(createStrapi({ 'drifted-plugin': '2.0.0' }, warn));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('drifted-plugin@2.0.0 uses @strapi/utils@4.0.0');
  });
});
