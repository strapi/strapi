import path from 'node:path';
import fse from 'fs-extra';

import {
  buildYarnrcConfiguration,
  describeRegistry,
  findOverridingConfigFiles,
  getUserNpmrcPath,
  inspectNpmrc,
  inspectYarnrc,
  prepareRegistryAccess,
} from '../registry-access';
import type { DetectedPackageManager } from '../package-manager';
import {
  createTemporaryDirectory,
  createTestLogger,
  loggedText,
  readFilePermissions,
} from './test-helpers';

const LICENSE = 'license-abc';
// The literal `.npmrc` syntax for a token read from an environment variable.
// eslint-disable-next-line no-template-curly-in-string
const ENVIRONMENT_TOKEN_LINE = '//packages.strapi.io/:_authToken=${STRAPI_LICENSE}\n';
const NPMRC_LINES =
  '@strapi-enterprise:registry=https://packages.strapi.io/\n//packages.strapi.io/:_authToken=license-abc\n';
const OTHER_LICENSE_NPMRC = NPMRC_LINES.replace(LICENSE, 'other-license');
const STRAPI_REGISTRY = describeRegistry('https://packages.strapi.io/');

describe('inspectNpmrc', () => {
  let npmrcPath: string;

  beforeEach(async () => {
    npmrcPath = path.join(await createTemporaryDirectory(), '.npmrc');
  });

  it('plans the lines to add without writing them', async () => {
    await expect(inspectNpmrc(npmrcPath, LICENSE, STRAPI_REGISTRY, LICENSE)).resolves.toMatchObject(
      {
        status: 'not-configured',
        linesToAdd: NPMRC_LINES.trimEnd(),
      }
    );
    expect(await fse.pathExists(npmrcPath)).toBe(false);
  });

  it('recognizes the same license', async () => {
    await fse.writeFile(npmrcPath, NPMRC_LINES);

    await expect(inspectNpmrc(npmrcPath, LICENSE, STRAPI_REGISTRY, LICENSE)).resolves.toMatchObject(
      {
        status: 'already-configured',
      }
    );
  });

  it('recognizes another license, and shows the lines without the license', async () => {
    await fse.writeFile(npmrcPath, OTHER_LICENSE_NPMRC);

    const outcome = await inspectNpmrc(npmrcPath, LICENSE, STRAPI_REGISTRY, LICENSE);

    expect(outcome.status).toBe('different-license');
    expect(outcome.expectedConfiguration).toContain('<your license>');
    expect(outcome.expectedConfiguration).not.toContain(LICENSE);
  });

  it('recognizes a token read from an environment variable', async () => {
    await fse.writeFile(
      npmrcPath,
      `@strapi-enterprise:registry=https://packages.strapi.io/\n${ENVIRONMENT_TOKEN_LINE}`
    );

    const outcome = await inspectNpmrc(npmrcPath, LICENSE, STRAPI_REGISTRY, LICENSE);

    expect(outcome.status).toBe('uses-environment-variable');
  });

  it('asks for a manual edit when a token reference has no scope registry to use it', async () => {
    await fse.writeFile(npmrcPath, ENVIRONMENT_TOKEN_LINE);

    const outcome = await inspectNpmrc(npmrcPath, LICENSE, STRAPI_REGISTRY, LICENSE);

    expect(outcome.status).toBe('manual-edit-needed');
  });

  it('asks for a manual edit when the configuration is incomplete', async () => {
    await fse.writeFile(npmrcPath, '@strapi-enterprise:registry=https://packages.strapi.io/\n');

    await expect(inspectNpmrc(npmrcPath, LICENSE, STRAPI_REGISTRY, LICENSE)).resolves.toMatchObject(
      {
        status: 'manual-edit-needed',
      }
    );
  });
});

describe('inspectYarnrc', () => {
  let yarnrcPath: string;

  beforeEach(async () => {
    yarnrcPath = path.join(await createTemporaryDirectory(), '.yarnrc.yml');
  });

  it('plans the scope for a file without npmScopes, without writing it', async () => {
    await fse.writeFile(yarnrcPath, 'enableTelemetry: false\n');

    await expect(
      inspectYarnrc(yarnrcPath, LICENSE, STRAPI_REGISTRY, LICENSE)
    ).resolves.toMatchObject({
      status: 'not-configured',
      linesToAdd: buildYarnrcConfiguration(LICENSE, STRAPI_REGISTRY),
    });
    expect(await fse.readFile(yarnrcPath, 'utf8')).toBe('enableTelemetry: false\n');
  });

  it('asks for a manual edit when npmScopes only has other scopes', async () => {
    await fse.writeFile(
      yarnrcPath,
      'npmScopes:\n  my-company:\n    npmRegistryServer: "https://npm.example.com"\n'
    );

    await expect(
      inspectYarnrc(yarnrcPath, LICENSE, STRAPI_REGISTRY, LICENSE)
    ).resolves.toMatchObject({
      status: 'manual-edit-needed',
    });
  });

  it('recognizes the same and another license', async () => {
    await fse.writeFile(yarnrcPath, buildYarnrcConfiguration(LICENSE, STRAPI_REGISTRY));

    await expect(
      inspectYarnrc(yarnrcPath, LICENSE, STRAPI_REGISTRY, LICENSE)
    ).resolves.toMatchObject({
      status: 'already-configured',
    });
    await expect(
      inspectYarnrc(yarnrcPath, 'other-license', STRAPI_REGISTRY, 'other-license')
    ).resolves.toMatchObject({
      status: 'different-license',
    });
  });

  it('asks for a manual edit when the license is set for another registry', async () => {
    await fse.writeFile(
      yarnrcPath,
      buildYarnrcConfiguration(LICENSE, describeRegistry('http://localhost:4873'))
    );

    await expect(
      inspectYarnrc(yarnrcPath, LICENSE, STRAPI_REGISTRY, LICENSE)
    ).resolves.toMatchObject({
      status: 'manual-edit-needed',
    });
  });

  it('ignores a strapi-enterprise key outside npmScopes', async () => {
    await fse.writeFile(
      yarnrcPath,
      [
        'packageExtensions:',
        '  strapi-enterprise:',
        `    npmAuthToken: '${LICENSE}'`,
        'npmScopes:',
        '  acme:',
        "    npmRegistryServer: 'https://npm.example.com'",
        '',
      ].join('\n')
    );

    const outcome = await inspectYarnrc(yarnrcPath, LICENSE, STRAPI_REGISTRY, LICENSE);

    expect(outcome.status).toBe('manual-edit-needed');
  });

  it('reads the token set for the registry under npmRegistries', async () => {
    await fse.writeFile(
      yarnrcPath,
      [
        'npmScopes:',
        '  strapi-enterprise:',
        "    npmRegistryServer: 'https://packages.strapi.io/'",
        'npmRegistries:',
        '  "https://npm.example.com":',
        `    npmAuthToken: '${LICENSE}'`,
        '  "//packages.strapi.io":',
        "    npmAuthToken: 'out-of-date-license'",
        '',
      ].join('\n')
    );

    const outcome = await inspectYarnrc(yarnrcPath, LICENSE, STRAPI_REGISTRY, LICENSE);

    expect(outcome.status).toBe('different-license');
  });

  it.each([
    // eslint-disable-next-line no-template-curly-in-string
    ['a token read from an environment variable', "'${COMPANY_TOKEN}'"],
    ['the license', `'${LICENSE}'`],
  ])('reads only the strapi-enterprise scope when another scope holds %s', async (_case, token) => {
    await fse.writeFile(
      yarnrcPath,
      [
        'npmScopes:',
        '  acme:',
        `    npmAuthToken: ${token}`,
        '  strapi-enterprise:',
        "    npmRegistryServer: 'https://packages.strapi.io/'",
        "    npmAuthToken: 'out-of-date-license'",
        '',
      ].join('\n')
    );

    await expect(
      inspectYarnrc(yarnrcPath, LICENSE, STRAPI_REGISTRY, LICENSE)
    ).resolves.toMatchObject({ status: 'different-license' });
  });
});

describe('prepareRegistryAccess', () => {
  const prepare = async ({
    homeDir,
    packageManager = { name: 'npm' },
    env = {},
    licenseSource = 'license-file',
    logger = createTestLogger(),
  }: {
    homeDir: string;
    packageManager?: DetectedPackageManager;
    env?: NodeJS.ProcessEnv;
    licenseSource?: 'environment' | 'license-file';
    logger?: ReturnType<typeof createTestLogger>;
  }) =>
    prepareRegistryAccess({
      appDir: await createTemporaryDirectory(),
      packageManager,
      license: LICENSE,
      licenseSource,
      logger,
      env,
      homeDir,
    });

  it('writes nothing until apply, then adds the setup readable by its owner only', async () => {
    const homeDir = await createTemporaryDirectory();
    const npmrcPath = path.join(homeDir, '.npmrc');
    const logger = createTestLogger();

    const registryAccess = await prepare({ homeDir, logger });

    expect(await fse.pathExists(npmrcPath)).toBe(false);

    await registryAccess.apply();

    expect(await fse.readFile(npmrcPath, 'utf8')).toBe(NPMRC_LINES);
    expect(await readFilePermissions(npmrcPath)).toBe('600');
    expect(logger.success).toHaveBeenCalledWith(
      `Configured access to packages.strapi.io in ${npmrcPath}.`
    );
  });

  it('appends to an existing file, keeps its content, and restricts it to its owner', async () => {
    const homeDir = await createTemporaryDirectory();
    const npmrcPath = path.join(homeDir, '.npmrc');
    await fse.writeFile(npmrcPath, 'save-exact=true', { mode: 0o644 });

    await (await prepare({ homeDir })).apply();

    expect(await fse.readFile(npmrcPath, 'utf8')).toBe(`save-exact=true\n${NPMRC_LINES}`);
    expect(await readFilePermissions(npmrcPath)).toBe('600');
  });

  it('leaves a file that already has this license as is', async () => {
    const homeDir = await createTemporaryDirectory();
    const npmrcPath = path.join(homeDir, '.npmrc');
    await fse.writeFile(npmrcPath, NPMRC_LINES, { mode: 0o644 });
    const logger = createTestLogger();

    await (await prepare({ homeDir, logger })).apply();

    expect(await fse.readFile(npmrcPath, 'utf8')).toBe(NPMRC_LINES);
    expect(await readFilePermissions(npmrcPath)).toBe('644');
    expect(logger.info).toHaveBeenCalledWith(
      `Access to packages.strapi.io is already configured in ${npmrcPath}.`
    );
  });

  it('uses ~/.npmrc for Yarn 1 and ~/.yarnrc.yml for Yarn 4', async () => {
    const homeDir = await createTemporaryDirectory();

    await (await prepare({ homeDir, packageManager: { name: 'yarn', majorVersion: 1 } })).apply();
    await (await prepare({ homeDir, packageManager: { name: 'yarn', majorVersion: 4 } })).apply();

    expect(await fse.pathExists(path.join(homeDir, '.npmrc'))).toBe(true);
    expect(await fse.pathExists(path.join(homeDir, '.yarnrc.yml'))).toBe(true);
  });

  it('stops when the user-level file holds another license, and leaves it as is', async () => {
    const homeDir = await createTemporaryDirectory();
    const npmrcPath = path.join(homeDir, '.npmrc');
    await fse.writeFile(npmrcPath, OTHER_LICENSE_NPMRC);
    const logger = createTestLogger();

    const preparing = prepare({ homeDir, logger });

    await expect(preparing).rejects.toThrow(
      `${npmrcPath} already sets up packages.strapi.io with another license, so installing would fail.`
    );
    await expect(preparing).rejects.not.toThrow(LICENSE);
    expect(await fse.readFile(npmrcPath, 'utf8')).toBe(OTHER_LICENSE_NPMRC);
  });

  it.each([
    [
      'adds the scope under the existing npmScopes key',
      "npmScopes:\n  acme:\n    npmRegistryServer: 'https://npm.example.com'\n",
      'Add this under its existing npmScopes key',
    ],
    [
      'replaces an incomplete strapi-enterprise scope',
      "npmScopes:\n  strapi-enterprise:\n    npmRegistryServer: 'https://packages.strapi.io/'\n",
      'Replace its strapi-enterprise scope with this',
    ],
  ])(
    'in a .yarnrc.yml with npmScopes, %s without repeating the key',
    async (_case, content, edit) => {
      const homeDir = await createTemporaryDirectory();
      await fse.writeFile(path.join(homeDir, '.yarnrc.yml'), content);

      const preparing = prepare({ homeDir, packageManager: { name: 'yarn', majorVersion: 4 } });

      await expect(preparing).rejects.toThrow(edit);
      await expect(preparing).rejects.toThrow(/:\n\n {2}strapi-enterprise:\n/);
      await expect(preparing).rejects.not.toThrow(/npmScopes:\n {2}strapi-enterprise/);
    }
  );

  it('replaces the strapi-enterprise scope of a .yarnrc.yml set up with another license', async () => {
    const homeDir = await createTemporaryDirectory();
    await fse.writeFile(
      path.join(homeDir, '.yarnrc.yml'),
      buildYarnrcConfiguration('other-license', STRAPI_REGISTRY)
    );

    await expect(
      prepare({ homeDir, packageManager: { name: 'yarn', majorVersion: 4 } })
    ).rejects.toThrow('Replace its strapi-enterprise scope with:\n\n  strapi-enterprise:');
  });

  it('stops when the file cannot be updated automatically', async () => {
    const homeDir = await createTemporaryDirectory();
    await fse.writeFile(
      path.join(homeDir, '.npmrc'),
      '@strapi-enterprise:registry=https://packages.strapi.io/\n'
    );

    await expect(prepare({ homeDir })).rejects.toThrow('could not be updated automatically');
  });

  it.each([
    [
      'npm',
      { name: 'npm' } as const,
      '.npmrc',
      // eslint-disable-next-line no-template-curly-in-string
      '//packages.strapi.io/:_authToken=${STRAPI_LICENSE}',
    ],
    [
      'Yarn 4, with a default so an unset variable does not break every Yarn command',
      { name: 'yarn', majorVersion: 4 } as const,
      '.yarnrc.yml',
      // eslint-disable-next-line no-template-curly-in-string
      "npmAuthToken: '${STRAPI_LICENSE:-}'",
    ],
  ])(
    'writes a reference to STRAPI_LICENSE in CI, not the license, for %s',
    async (_name, packageManager, fileName, expectedLine) => {
      const homeDir = await createTemporaryDirectory();
      const logger = createTestLogger();

      await (
        await prepare({
          homeDir,
          packageManager,
          env: { STRAPI_LICENSE: LICENSE, CI: 'true' },
          licenseSource: 'environment',
          logger,
        })
      ).apply();

      const content = await fse.readFile(path.join(homeDir, fileName), 'utf8');
      expect(content).toContain(expectedLine);
      expect(content).not.toContain(LICENSE);
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining('reading the license from STRAPI_LICENSE')
      );
    }
  );

  it.each([
    ['outside CI', { STRAPI_LICENSE: LICENSE }],
    ['when CI is "false"', { STRAPI_LICENSE: LICENSE, CI: 'false' }],
  ])(
    'writes the license itself %s, since other package managers share ~/.npmrc',
    async (_case, env) => {
      const homeDir = await createTemporaryDirectory();

      await (await prepare({ homeDir, env, licenseSource: 'environment' })).apply();

      expect(await fse.readFile(path.join(homeDir, '.npmrc'), 'utf8')).toContain(
        `//packages.strapi.io/:_authToken=${LICENSE}`
      );
    }
  );

  it('reports the reference as set up on the next run', async () => {
    const homeDir = await createTemporaryDirectory();
    const env = { STRAPI_LICENSE: LICENSE, CI: 'true' };

    await (await prepare({ homeDir, env, licenseSource: 'environment' })).apply();
    const nextRun = await prepare({ homeDir, env, licenseSource: 'environment' });

    expect(nextRun.outcome.status).toBe('uses-environment-variable');
  });

  it('stops when a project file sets another license, and leaves it as is', async () => {
    const homeDir = await createTemporaryDirectory();
    const appDir = await createTemporaryDirectory();
    const projectNpmrcPath = path.join(appDir, '.npmrc');
    await fse.writeFile(projectNpmrcPath, OTHER_LICENSE_NPMRC);
    const logger = createTestLogger();

    const preparing = prepareRegistryAccess({
      appDir,
      packageManager: { name: 'npm' },
      license: LICENSE,
      licenseSource: 'license-file',
      logger,
      env: {},
      homeDir,
    });

    await expect(preparing).rejects.toThrow(
      `${projectNpmrcPath} sets another license for packages.strapi.io and takes precedence over ${path.join(homeDir, '.npmrc')}.`
    );
    expect(await fse.readFile(projectNpmrcPath, 'utf8')).toBe(OTHER_LICENSE_NPMRC);
    expect(await fse.pathExists(path.join(homeDir, '.npmrc'))).toBe(false);
    expect(loggedText(logger)).not.toContain(LICENSE);
  });
});

describe('findOverridingConfigFiles', () => {
  /** An app two folders below a root folder, with its own home folder. */
  const setUp = async () => {
    const homeDir = await createTemporaryDirectory();
    const rootDir = await createTemporaryDirectory();
    const appDir = path.join(rootDir, 'apps', 'my-app');
    await fse.ensureDir(appDir);

    return { homeDir, rootDir, appDir };
  };

  const find = (
    { homeDir, appDir }: Awaited<ReturnType<typeof setUp>>,
    packageManager: DetectedPackageManager = { name: 'npm' }
  ) =>
    findOverridingConfigFiles({
      appDir,
      packageManager,
      userConfigPaths: [path.join(homeDir, '.npmrc'), path.join(homeDir, '.yarnrc.yml')],
      license: LICENSE,
      registry: STRAPI_REGISTRY,
    });

  it('finds an app .npmrc with another license', async () => {
    const context = await setUp();
    await fse.writeFile(path.join(context.appDir, '.npmrc'), OTHER_LICENSE_NPMRC);

    await expect(find(context)).resolves.toEqual([path.join(context.appDir, '.npmrc')]);
  });

  it('still finds it when another registry in the same file reads its token from a variable', async () => {
    const context = await setUp();
    await fse.writeFile(
      path.join(context.appDir, '.npmrc'),
      // eslint-disable-next-line no-template-curly-in-string
      `//registry.npmjs.org/:_authToken=\${NPM_TOKEN}\n${OTHER_LICENSE_NPMRC}`
    );

    await expect(find(context)).resolves.toEqual([path.join(context.appDir, '.npmrc')]);
  });

  it('reads the .npmrc of a workspace root, but not of any parent folder, for npm', async () => {
    const context = await setUp();
    await fse.writeFile(path.join(context.rootDir, 'apps', '.npmrc'), OTHER_LICENSE_NPMRC);

    await expect(find(context)).resolves.toEqual([]);

    await fse.writeJson(path.join(context.rootDir, 'package.json'), { workspaces: ['apps/*'] });
    await fse.writeFile(path.join(context.rootDir, '.npmrc'), OTHER_LICENSE_NPMRC);

    await expect(find(context)).resolves.toEqual([path.join(context.rootDir, '.npmrc')]);
  });

  it('ignores the app .npmrc inside a workspace, as npm and pnpm do', async () => {
    const context = await setUp();
    await fse.writeJson(path.join(context.rootDir, 'package.json'), { workspaces: ['apps/*'] });
    await fse.writeFile(path.join(context.appDir, '.npmrc'), OTHER_LICENSE_NPMRC);

    await expect(find(context)).resolves.toEqual([]);
    await expect(find(context, { name: 'pnpm' })).resolves.toEqual([]);
  });

  it('reads the .npmrc of every parent folder for Yarn 1', async () => {
    const context = await setUp();
    await fse.writeFile(path.join(context.rootDir, 'apps', '.npmrc'), OTHER_LICENSE_NPMRC);

    await expect(find(context, { name: 'yarn', majorVersion: 1 })).resolves.toEqual([
      path.join(context.rootDir, 'apps', '.npmrc'),
    ]);
  });

  it('finds a .yarnrc.yml in a parent folder for Yarn 4, as in a monorepo', async () => {
    const context = await setUp();
    const rootYarnrcPath = path.join(context.rootDir, '.yarnrc.yml');
    await fse.writeFile(
      rootYarnrcPath,
      "npmScopes:\n  other-scope:\n    npmAuthToken: 'unrelated'\n  strapi-enterprise:\n    npmAuthToken: 'other-license'\n"
    );

    await expect(find(context, { name: 'yarn', majorVersion: 4 })).resolves.toEqual([
      rootYarnrcPath,
    ]);
  });

  it.each([
    ['holds the same license', NPMRC_LINES],
    ['reads the token from an environment variable', ENVIRONMENT_TOKEN_LINE],
    [
      'only sets the scope registry, so the user-level token still applies',
      NPMRC_LINES.split('\n')[0],
    ],
    ['does not mention the Strapi registry', 'registry=https://registry.npmjs.org/\n'],
  ])('finds nothing when the project file %s', async (_case, content) => {
    const context = await setUp();
    await fse.writeFile(path.join(context.appDir, '.npmrc'), content);

    await expect(find(context)).resolves.toEqual([]);
  });

  it('finds nothing for a .yarnrc.yml whose token belongs to another scope', async () => {
    const context = await setUp();
    await fse.writeFile(
      path.join(context.appDir, '.yarnrc.yml'),
      "npmScopes:\n  strapi-enterprise:\n    npmRegistryServer: 'https://packages.strapi.io/'\n  other-scope:\n    npmAuthToken: 'unrelated'\n"
    );

    await expect(find(context, { name: 'yarn', majorVersion: 4 })).resolves.toEqual([]);
  });
});

describe('getUserNpmrcPath', () => {
  it('follows the npm user config setting', () => {
    expect(getUserNpmrcPath({ npm_config_userconfig: '/custom/.npmrc' }, '/home/me')).toBe(
      '/custom/.npmrc'
    );
    expect(getUserNpmrcPath({}, '/home/me')).toBe(path.join('/home/me', '.npmrc'));
  });
});
