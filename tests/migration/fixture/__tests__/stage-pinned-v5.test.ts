const path = require('path');

jest.mock('execa', () => jest.fn(() => Promise.resolve({})));
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
}));

jest.mock('../../framework/shared', () => ({
  nestedYarnInstallEnv: jest.fn((extra = {}) => ({
    ...process.env,
    YARN_ENABLE_IMMUTABLE_INSTALLS: 'false',
    ...extra,
  })),
}));

const execa = require('execa');
const { runPinnedStrapiStage } = require('../../framework/stage-pinned-v5');
const { buildScenarioFromFlags } = require('../../framework/build-scenario');

describe('runPinnedStrapiStage (--via path)', () => {
  beforeEach(() => {
    (execa as jest.Mock).mockClear();
    (execa as jest.Mock).mockResolvedValue({});
  });

  test('invokes setup-pinned-v5-project.ts through node --import tsx', async () => {
    const ctx = {
      REPO_ROOT: '/repo',
      COMPLEX_DIR: '/repo/examples/complex',
      MIGRATION_ROOT: '/repo/.migration-v5',
      V4_APP_DIR: '/repo/.migration-v5/v4-app',
      SQLITE_PATH: '/repo/.migration-v5/data.db',
      DOCKER_COMPOSE_FILE: '/repo/examples/complex/docker-compose.dev.yml',
      DOTENV_PATH: '/repo/.migration-v5/.env',
    };

    await runPinnedStrapiStage(ctx, {
      version: '5.30.0',
      dbEnv: { DATABASE_CLIENT: 'sqlite' },
    });

    expect(execa).toHaveBeenCalled();
    const [bin, args, opts] = (execa as jest.Mock).mock.calls[0];
    expect(bin).toBe(process.execPath);
    expect(args).toEqual([
      '--import',
      'tsx',
      path.join(ctx.COMPLEX_DIR, 'scripts', 'setup-pinned-v5-project.ts'),
    ]);
    expect(opts.env.PINNED_STRAPI_VERSION).toBe('5.30.0');
    expect(opts.env.PINNED_V5_OUT_DIR).toBe(path.join(ctx.MIGRATION_ROOT, 'pinned-v5', '5.30.0'));
  });
});

describe('buildScenarioFromFlags --via', () => {
  test('inserts pinned stages before workspace and defaults to full-ladder validators', () => {
    const scenario = buildScenarioFromFlags({
      initial: '4.26.1',
      via: ['5.30.0'],
    });

    expect(scenario.stages).toEqual([
      { id: 'pinned-5.30.0', type: 'strapi-pinned', version: '5.30.0' },
      {
        id: 'workspace',
        type: 'workspace',
        validate: ['full-ladder'],
      },
    ]);
    expect(scenario.id).toContain('via-5-30-0');
  });
});
