import path from 'node:path';

import { vol, fs } from 'memfs';

import { AbortedError } from '../../../../modules/error';
import { assertAppProject, projectFactory } from '../../../../modules/project';
import { Version } from '../../../../modules/version';
import { pinVersions } from '../pin-versions';

jest.mock('fs', () => fs);

describe('pinVersions prompt', () => {
  const cwd = '/__pin_versions_tests__';

  const logger = {
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    raw: jest.fn(),
    isSilent: false,
    isDebug: false,
    setSilent: jest.fn(),
    setDebug: jest.fn(),
    warnings: 0,
    errors: 0,
    stdout: undefined,
    stderr: undefined,
  };

  const createProject = (packageJSON: Record<string, unknown>) => {
    vol.fromNestedJSON(
      {
        'package.json': JSON.stringify(packageJSON, null, 2),
        node_modules: {
          '@strapi': {
            strapi: {
              'package.json': JSON.stringify({
                name: '@strapi/strapi',
                version: '4.26.2',
              }),
            },
          },
        },
      },
      cwd
    );

    return projectFactory(cwd);
  };

  beforeEach(() => {
    vol.reset();
    jest.clearAllMocks();
  });

  it('does nothing when all @strapi dependencies are pinned', async () => {
    const project = createProject({
      name: 'test-app',
      version: '0.1.0',
      dependencies: {
        '@strapi/strapi': '4.26.1',
      },
    });

    assertAppProject(project);

    const confirm = jest.fn();

    await pinVersions(project, {
      logger,
      confirm,
      target: Version.RELEASE_TYPES.Minor,
    });

    expect(confirm).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('pins ranged @strapi dependencies after confirmation', async () => {
    const project = createProject({
      name: 'test-app',
      version: '0.1.0',
      dependencies: {
        '@strapi/strapi': '^4.26.1',
      },
      devDependencies: {
        '@strapi/types': '^4.26.1',
      },
    });

    assertAppProject(project);

    await pinVersions(project, {
      logger,
      confirm: jest.fn().mockResolvedValue(true),
      target: Version.RELEASE_TYPES.Minor,
    });

    const packageJSON = JSON.parse(
      vol.readFileSync(path.join(cwd, 'package.json'), 'utf-8').toString()
    );

    expect(packageJSON.dependencies['@strapi/strapi']).toBe('4.26.1');
    expect(packageJSON.devDependencies['@strapi/types']).toBe('4.26.1');
    expect(project.strapiVersion.raw).toBe('4.26.1');
  });

  it('leaves non-lockstep @strapi dependencies unchanged when pinning', async () => {
    const strapiVersion = '5.0.0';
    const strapiVersionRange = `^${strapiVersion}`;

    const project = createProject({
      name: 'test-app',
      version: '0.1.0',
      dependencies: {
        '@strapi/strapi': strapiVersionRange,
        '@strapi/admin': strapiVersionRange,
        '@strapi/data-transfer': strapiVersionRange,
        '@strapi/design-system': '^2.2.0',
      },
      devDependencies: {
        '@strapi/types': strapiVersionRange,
        '@strapi/icons': '^2.2.0',
      },
    });

    assertAppProject(project);

    await pinVersions(project, {
      logger,
      confirm: jest.fn().mockResolvedValue(true),
      target: Version.RELEASE_TYPES.Patch,
    });

    const packageJSON = JSON.parse(
      vol.readFileSync(path.join(cwd, 'package.json'), 'utf-8').toString()
    );

    expect(packageJSON.dependencies['@strapi/strapi']).toBe(strapiVersion);
    expect(packageJSON.dependencies['@strapi/admin']).toBe(strapiVersion);
    expect(packageJSON.dependencies['@strapi/data-transfer']).toBe(strapiVersion);
    expect(packageJSON.dependencies['@strapi/design-system']).toBe('^2.2.0');
    expect(packageJSON.devDependencies['@strapi/types']).toBe(strapiVersion);
    expect(packageJSON.devDependencies['@strapi/icons']).toBe('^2.2.0');
    expect(project.strapiVersion.raw).toBe(strapiVersion);
  });

  it('aborts when the user declines pinning', async () => {
    const project = createProject({
      name: 'test-app',
      version: '0.1.0',
      dependencies: {
        '@strapi/strapi': '^4.26.1',
      },
    });

    assertAppProject(project);

    await expect(
      pinVersions(project, {
        logger,
        confirm: jest.fn().mockResolvedValue(false),
        target: Version.RELEASE_TYPES.Minor,
      })
    ).rejects.toBeInstanceOf(AbortedError);
  });

  it('pins in memory only during dry runs', async () => {
    const project = createProject({
      name: 'test-app',
      version: '0.1.0',
      dependencies: {
        '@strapi/strapi': '^4.26.1',
      },
    });

    assertAppProject(project);

    await pinVersions(project, {
      logger,
      confirm: jest.fn().mockResolvedValue(true),
      dry: true,
      target: Version.RELEASE_TYPES.Minor,
    });

    const packageJSON = JSON.parse(
      vol.readFileSync(path.join(cwd, 'package.json'), 'utf-8').toString()
    );

    expect(packageJSON.dependencies['@strapi/strapi']).toBe('^4.26.1');
    expect(project.strapiVersion.raw).toBe('4.26.1');
    expect(project.packageJSON.dependencies?.['@strapi/strapi']).toBe('4.26.1');
  });
});
