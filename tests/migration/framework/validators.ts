const path = require('path');
const execa = require('execa');

type MigrationContext = {
  REPO_ROOT: string;
  COMPLEX_DIR: string;
  MIGRATION_ROOT: string;
  V4_APP_DIR: string;
  SQLITE_PATH: string;
  DOCKER_COMPOSE_FILE: string;
  DOTENV_PATH: string;
};

type DbEnv = Record<string, string | undefined>;

type ValidateOpts = {
  multiplier: number;
  dbEnv: DbEnv;
  validatorProfile: string;
  dataOrigin?: string;
};

type ValidatorRunOpts = {
  multiplier: number;
  dbEnv: DbEnv;
  dataOrigin?: string;
};

type ValidatorFn = (ctx: MigrationContext, opts: ValidatorRunOpts) => Promise<void>;

function buildValidateEnv(
  _ctx: MigrationContext,
  { multiplier, dbEnv, validatorProfile, dataOrigin }: ValidateOpts
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...dbEnv,
    MIGRATION_MULTIPLIER: String(multiplier),
    SEED_MULTIPLIER: String(multiplier),
    MIGRATION_VALIDATOR_PROFILE: validatorProfile,
    ...(dataOrigin ? { MIGRATION_DATA_ORIGIN: dataOrigin } : {}),
  };
}

/**
 * Runs examples/complex validate-migration.ts via `node --import tsx`
 * (avoids tsx CLI IPC; NODE_PATH points at monorepo so tsx resolves from nested cwd).
 */
async function runValidationScript(
  ctx: MigrationContext,
  validateEnv: NodeJS.ProcessEnv,
  multiplier: number
): Promise<void> {
  await execa(
    process.execPath,
    [
      '--import',
      'tsx',
      path.join('scripts', 'validate-migration.ts'),
      '--multiplier',
      String(multiplier),
    ],
    {
      cwd: ctx.COMPLEX_DIR,
      stdio: 'inherit',
      env: {
        ...validateEnv,
        NODE_PATH: [
          path.join(ctx.REPO_ROOT, 'node_modules'),
          validateEnv.NODE_PATH,
          process.env.NODE_PATH,
        ]
          .filter(Boolean)
          .join(path.delimiter),
      },
    }
  );
}

const REGISTRY: Record<string, ValidatorFn> = {
  /**
   * v4 canonical seed → workspace expectations (default origin v4). Alias for `full-v4-origin`.
   */
  full: async (ctx, opts) => {
    return REGISTRY['full-v4-origin'](ctx, opts);
  },

  'full-v4-origin': async (ctx, { multiplier, dbEnv, dataOrigin = 'v4' }) => {
    await runValidationScript(
      ctx,
      buildValidateEnv(ctx, {
        multiplier,
        dbEnv,
        validatorProfile: 'full-v4-origin',
        dataOrigin: dataOrigin || 'v4',
      }),
      multiplier
    );
  },

  'full-v5-origin': async (ctx, { multiplier, dbEnv, dataOrigin = 'v5' }) => {
    await runValidationScript(
      ctx,
      buildValidateEnv(ctx, {
        multiplier,
        dbEnv,
        validatorProfile: 'full-v5-origin',
        dataOrigin: dataOrigin || 'v5',
      }),
      multiplier
    );
  },

  /**
   * Same as full-v4-origin but skips DP join-table source parity (ladder / double discard-drafts).
   * Origin defaults to v4; pass scenario.dataOrigin for mixed cases.
   */
  'full-ladder': async (ctx, { multiplier, dbEnv, dataOrigin = 'v4' }) => {
    await runValidationScript(
      ctx,
      buildValidateEnv(ctx, {
        multiplier,
        dbEnv,
        validatorProfile: 'full-ladder',
        dataOrigin,
      }),
      multiplier
    );
  },
};

async function runValidators(
  ctx: MigrationContext,
  names: string[],
  { multiplier, dbEnv, dataOrigin = 'v4' }: ValidatorRunOpts
): Promise<void> {
  const list = Array.isArray(names) ? names : [];
  for (const name of list) {
    const fn = REGISTRY[name];
    if (!fn) {
      throw new Error(
        `Unknown migration validator "${name}". Known: ${Object.keys(REGISTRY).join(', ')}`
      );
    }
    console.log(`\n✅ Validator: ${name}`);
    await fn(ctx, { multiplier, dbEnv, dataOrigin });
  }
}

module.exports = { runValidators, REGISTRY };
