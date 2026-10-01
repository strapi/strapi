import path from 'path';
import fse from 'fs-extra';

import {
  configureNpmrc,
  configureRegistryAccess,
  configureYarnrc,
  describeRegistry,
  getUserNpmrcPath,
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

describe('configureNpmrc', () => {
  let npmrcPath: string;

  beforeEach(async () => {
    npmrcPath = path.join(await createTemporaryDirectory(), '.npmrc');
  });

  it('creates the file, readable by its owner only', async () => {
    await expect(configureNpmrc(npmrcPath, LICENSE)).resolves.toMatchObject({ status: 'written' });

    expect(await fse.readFile(npmrcPath, 'utf8')).toBe(NPMRC_LINES);
    expect(await readFilePermissions(npmrcPath)).toBe('600');
  });

  it('appends to an existing file and keeps its content', async () => {
    await fse.writeFile(npmrcPath, 'save-exact=true');

    await configureNpmrc(npmrcPath, LICENSE);

    expect(await fse.readFile(npmrcPath, 'utf8')).toBe(`save-exact=true\n${NPMRC_LINES}`);
  });

  it('restricts an existing file to its owner once it holds the license', async () => {
    await fse.writeFile(npmrcPath, 'save-exact=true\n', { mode: 0o644 });

    await configureNpmrc(npmrcPath, LICENSE);

    expect(await readFilePermissions(npmrcPath)).toBe('600');
  });

  it('leaves the permissions of a file it does not change', async () => {
    await fse.writeFile(npmrcPath, NPMRC_LINES, { mode: 0o644 });

    await configureNpmrc(npmrcPath, LICENSE);

    expect(await readFilePermissions(npmrcPath)).toBe('644');
  });

  it('changes nothing when the same license is already configured', async () => {
    await fse.writeFile(npmrcPath, NPMRC_LINES);

    await expect(configureNpmrc(npmrcPath, LICENSE)).resolves.toMatchObject({
      status: 'already-configured',
    });
    expect(await fse.readFile(npmrcPath, 'utf8')).toBe(NPMRC_LINES);
  });

  it('does not overwrite another license', async () => {
    const otherLicenseLines = NPMRC_LINES.replace(LICENSE, 'other-license');
    await fse.writeFile(npmrcPath, otherLicenseLines);

    const outcome = await configureNpmrc(npmrcPath, LICENSE);

    expect(outcome.status).toBe('different-license');
    expect(outcome.expectedConfiguration).toContain('<your license>');
    expect(outcome.expectedConfiguration).not.toContain(LICENSE);
    expect(await fse.readFile(npmrcPath, 'utf8')).toBe(otherLicenseLines);
  });

  it('leaves a token read from an environment variable alone', async () => {
    await fse.writeFile(npmrcPath, ENVIRONMENT_TOKEN_LINE);

    await expect(configureNpmrc(npmrcPath, LICENSE)).resolves.toMatchObject({
      status: 'uses-environment-variable',
    });
  });

  it('asks for a manual edit when the configuration is incomplete', async () => {
    await fse.writeFile(npmrcPath, '@strapi-enterprise:registry=https://packages.strapi.io/\n');

    await expect(configureNpmrc(npmrcPath, LICENSE)).resolves.toMatchObject({
      status: 'manual-edit-needed',
    });
  });
});

describe('configureYarnrc', () => {
  let yarnrcPath: string;

  beforeEach(async () => {
    yarnrcPath = path.join(await createTemporaryDirectory(), '.yarnrc.yml');
  });

  it('adds the scope to a file without npmScopes and keeps its content', async () => {
    await fse.writeFile(yarnrcPath, 'enableTelemetry: false\n');

    await expect(configureYarnrc(yarnrcPath, LICENSE)).resolves.toMatchObject({
      status: 'written',
    });

    expect(await fse.readFile(yarnrcPath, 'utf8')).toBe(
      [
        'enableTelemetry: false',
        'npmScopes:',
        '  strapi-enterprise:',
        "    npmRegistryServer: 'https://packages.strapi.io/'",
        '    npmAlwaysAuth: true',
        "    npmAuthToken: 'license-abc'",
        '',
      ].join('\n')
    );
  });

  it('does not edit an existing npmScopes, and prints the block instead', async () => {
    const content = 'npmScopes:\n  my-company:\n    npmRegistryServer: "https://npm.example.com"\n';
    await fse.writeFile(yarnrcPath, content);

    await expect(configureYarnrc(yarnrcPath, LICENSE)).resolves.toMatchObject({
      status: 'manual-edit-needed',
    });
    expect(await fse.readFile(yarnrcPath, 'utf8')).toBe(content);
  });

  it('recognizes the same and another license', async () => {
    await configureYarnrc(yarnrcPath, LICENSE);

    await expect(configureYarnrc(yarnrcPath, LICENSE)).resolves.toMatchObject({
      status: 'already-configured',
    });
    await expect(configureYarnrc(yarnrcPath, 'other-license')).resolves.toMatchObject({
      status: 'different-license',
    });
  });
});

describe('configureYarnrc with another registry', () => {
  it('asks for a manual edit when the license is set for another registry', async () => {
    const yarnrcPath = path.join(await createTemporaryDirectory(), '.yarnrc.yml');
    await configureYarnrc(yarnrcPath, LICENSE, describeRegistry('http://localhost:4873'));

    await expect(configureYarnrc(yarnrcPath, LICENSE)).resolves.toMatchObject({
      status: 'manual-edit-needed',
    });
  });
});

describe('configureRegistryAccess', () => {
  it('uses ~/.npmrc for Yarn 1 and ~/.yarnrc.yml for Yarn 4', async () => {
    const homeDir = await createTemporaryDirectory();
    const logger = createTestLogger();

    await configureRegistryAccess({
      packageManager: { name: 'yarn', majorVersion: 1 },
      license: LICENSE,
      licenseSource: 'license-file',
      logger,
      env: {},
      homeDir,
      appDir: await createTemporaryDirectory(),
    });
    await configureRegistryAccess({
      packageManager: { name: 'yarn', majorVersion: 4 },
      license: LICENSE,
      licenseSource: 'license-file',
      logger,
      env: {},
      homeDir,
      appDir: await createTemporaryDirectory(),
    });

    expect(await fse.pathExists(path.join(homeDir, '.npmrc'))).toBe(true);
    expect(await fse.pathExists(path.join(homeDir, '.yarnrc.yml'))).toBe(true);
  });

  it('warns about another license without ever printing the license', async () => {
    const homeDir = await createTemporaryDirectory();
    const logger = createTestLogger();
    await fse.writeFile(
      path.join(homeDir, '.npmrc'),
      NPMRC_LINES.replace(LICENSE, 'other-license')
    );

    await configureRegistryAccess({
      packageManager: { name: 'npm' },
      license: LICENSE,
      licenseSource: 'license-file',
      logger,
      env: {},
      homeDir,
      appDir: await createTemporaryDirectory(),
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('different license'));
    expect(loggedText(logger)).not.toContain(LICENSE);
  });

  it('points to STRAPI_ENTERPRISE_REGISTRY_URL when it is set, like the registry lookups', async () => {
    const homeDir = await createTemporaryDirectory();
    const logger = createTestLogger();

    await configureRegistryAccess({
      packageManager: { name: 'npm' },
      license: LICENSE,
      licenseSource: 'license-file',
      logger,
      env: { STRAPI_ENTERPRISE_REGISTRY_URL: 'http://localhost:4873' },
      homeDir,
      appDir: await createTemporaryDirectory(),
    });

    expect(await fse.readFile(path.join(homeDir, '.npmrc'), 'utf8')).toBe(
      `@strapi-enterprise:registry=http://localhost:4873/\n//localhost:4873/:_authToken=${LICENSE}\n`
    );
    expect(logger.success).toHaveBeenCalledWith(
      expect.stringContaining('Configured access to localhost:4873')
    );
  });
});

describe('configureRegistryAccess with the license in STRAPI_LICENSE', () => {
  const configure = async (
    packageManager: DetectedPackageManager,
    env: NodeJS.ProcessEnv,
    homeDir: string,
    logger = createTestLogger()
  ) =>
    configureRegistryAccess({
      appDir: await createTemporaryDirectory(),
      packageManager,
      license: LICENSE,
      licenseSource: 'environment',
      logger,
      env,
      homeDir,
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
    'writes a reference to the variable in CI, not the license, for %s',
    async (_name, packageManager, fileName, expectedLine) => {
      const homeDir = await createTemporaryDirectory();
      const logger = createTestLogger();

      await configure(packageManager, { STRAPI_LICENSE: LICENSE, CI: 'true' }, homeDir, logger);

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

      await configure({ name: 'npm' }, env, homeDir);

      expect(await fse.readFile(path.join(homeDir, '.npmrc'), 'utf8')).toContain(
        `//packages.strapi.io/:_authToken=${LICENSE}`
      );
    }
  );

  it('reports the reference as set up on the next run', async () => {
    const homeDir = await createTemporaryDirectory();
    const env = { STRAPI_LICENSE: LICENSE, CI: 'true' };
    await configure({ name: 'npm' }, env, homeDir);

    await expect(configure({ name: 'npm' }, env, homeDir)).resolves.toMatchObject({
      status: 'uses-environment-variable',
    });
  });
});

describe('configureRegistryAccess with a project-level file', () => {
  const OTHER_LICENSE_NPMRC = NPMRC_LINES.replace(LICENSE, 'other-license');

  /** An app two folders below a root folder, with its own home folder. */
  const setUp = async () => {
    const homeDir = await createTemporaryDirectory();
    const rootDir = await createTemporaryDirectory();
    const appDir = path.join(rootDir, 'apps', 'my-app');
    await fse.ensureDir(appDir);

    return { homeDir, rootDir, appDir, logger: createTestLogger() };
  };

  const configure = (
    { homeDir, appDir, logger }: Awaited<ReturnType<typeof setUp>>,
    packageManager: DetectedPackageManager = { name: 'npm' }
  ) =>
    configureRegistryAccess({
      appDir,
      packageManager,
      license: LICENSE,
      licenseSource: 'license-file',
      logger,
      env: {},
      homeDir,
    });

  it('warns when the app has its own .npmrc with another license, and leaves it as is', async () => {
    const context = await setUp();
    const projectNpmrcPath = path.join(context.appDir, '.npmrc');
    await fse.writeFile(projectNpmrcPath, OTHER_LICENSE_NPMRC);

    const outcome = await configure(context);

    expect(outcome.overridingFiles).toEqual([projectNpmrcPath]);
    expect(context.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`${projectNpmrcPath} sets another license for packages.strapi.io`)
    );
    expect(await fse.readFile(projectNpmrcPath, 'utf8')).toBe(OTHER_LICENSE_NPMRC);
    expect(loggedText(context.logger)).not.toContain(LICENSE);
  });

  it('still warns when another registry in the same file reads its token from a variable', async () => {
    const context = await setUp();
    await fse.writeFile(
      path.join(context.appDir, '.npmrc'),
      // eslint-disable-next-line no-template-curly-in-string
      `//registry.npmjs.org/:_authToken=\${NPM_TOKEN}\n${OTHER_LICENSE_NPMRC}`
    );

    const outcome = await configure(context);

    expect(outcome.overridingFiles).toEqual([path.join(context.appDir, '.npmrc')]);
  });

  it('reads the .npmrc of a workspace root, but not of any parent folder, for npm', async () => {
    const context = await setUp();
    await fse.writeFile(path.join(context.rootDir, 'apps', '.npmrc'), OTHER_LICENSE_NPMRC);

    expect((await configure(context)).overridingFiles).toEqual([]);

    await fse.writeJson(path.join(context.rootDir, 'package.json'), { workspaces: ['apps/*'] });
    await fse.writeFile(path.join(context.rootDir, '.npmrc'), OTHER_LICENSE_NPMRC);

    expect((await configure(context)).overridingFiles).toEqual([
      path.join(context.rootDir, '.npmrc'),
    ]);
  });

  it('ignores the app .npmrc inside a workspace, as npm and pnpm do', async () => {
    const context = await setUp();
    await fse.writeJson(path.join(context.rootDir, 'package.json'), { workspaces: ['apps/*'] });
    await fse.writeFile(path.join(context.appDir, '.npmrc'), OTHER_LICENSE_NPMRC);

    expect((await configure(context)).overridingFiles).toEqual([]);
    expect((await configure(context, { name: 'pnpm' })).overridingFiles).toEqual([]);
  });

  it('reads the .npmrc of every parent folder for Yarn 1', async () => {
    const context = await setUp();
    await fse.writeFile(path.join(context.rootDir, 'apps', '.npmrc'), OTHER_LICENSE_NPMRC);

    const outcome = await configure(context, { name: 'yarn', majorVersion: 1 });

    expect(outcome.overridingFiles).toEqual([path.join(context.rootDir, 'apps', '.npmrc')]);
  });

  it('finds a .yarnrc.yml in a parent folder for Yarn 4, as in a monorepo', async () => {
    const context = await setUp();
    const rootYarnrcPath = path.join(context.rootDir, '.yarnrc.yml');
    await fse.writeFile(
      rootYarnrcPath,
      "npmScopes:\n  other-scope:\n    npmAuthToken: 'unrelated'\n  strapi-enterprise:\n    npmAuthToken: 'other-license'\n"
    );

    const outcome = await configure(context, { name: 'yarn', majorVersion: 4 });

    expect(outcome.overridingFiles).toEqual([rootYarnrcPath]);
  });

  it.each([
    ['holds the same license', NPMRC_LINES],
    ['reads the token from an environment variable', ENVIRONMENT_TOKEN_LINE],
    [
      'only sets the scope registry, so the user-level token still applies',
      NPMRC_LINES.split('\n')[0],
    ],
    ['does not mention the Strapi registry', 'registry=https://registry.npmjs.org/\n'],
  ])('says nothing when the project file %s', async (_case, content) => {
    const context = await setUp();
    await fse.writeFile(path.join(context.appDir, '.npmrc'), content);

    const outcome = await configure(context);

    expect(outcome.overridingFiles).toEqual([]);
    expect(context.logger.warn).not.toHaveBeenCalled();
  });

  it('says nothing for a .yarnrc.yml whose token belongs to another scope', async () => {
    const context = await setUp();
    await fse.writeFile(
      path.join(context.appDir, '.yarnrc.yml'),
      "npmScopes:\n  strapi-enterprise:\n    npmRegistryServer: 'https://packages.strapi.io/'\n  other-scope:\n    npmAuthToken: 'unrelated'\n"
    );

    const outcome = await configure(context, { name: 'yarn', majorVersion: 4 });

    expect(outcome.overridingFiles).toEqual([]);
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
