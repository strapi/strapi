import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { compile } from '@strapi/typescript-utils';

import { createMigrationFileBuilder } from '../file-builder';
import { discoverMigrationFiles } from '../discover';
import { migrationResolver } from '../resolver';

/**
 * Proves the `typescript` template survives the route a user app actually
 * takes it through when `useTypescriptMigrations` is enabled:
 *
 * - `strapi develop` recompiles the app with the vanilla `tsconfig.json`
 *   (diagnostics ignored) before forking the new worker, so a `.ts` file
 *   written to the source `database/migrations` lands in
 *   `dist/database/migrations` as `.js`, where discovery reads it.
 * - `strapi build` compiles with diagnostics *on* and the vanilla tsconfig
 *   sets `noEmitOnError`, so a type error in the template would break every
 *   production build of an app that has a generated rename migration.
 *
 * The fixture is a throwaway app dir: the vanilla tsconfig, a package.json,
 * and the monorepo's `node_modules` symlinked in so `knex`, `@strapi/strapi`
 * and `@strapi/types` resolve exactly as they do from a user app.
 */

// Each test builds a full `tsc` program over the `@strapi/strapi` types: ~2s in
// isolation, 20s+ when the whole monorepo's unit suites run in parallel.
jest.setTimeout(120_000);

const VANILLA_TSCONFIG = path.resolve(
  __dirname,
  '../../../../../cli/create-strapi-app/templates/vanilla/tsconfig.json'
);

const findRepoRoot = (from: string): string => {
  let dir = from;
  while (!fs.existsSync(path.join(dir, 'yarn.lock'))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error('Could not find the monorepo root (no yarn.lock found)');
    }
    dir = parent;
  }
  return dir;
};

const createFixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'db-migration-compile-'));

  fs.copyFileSync(VANILLA_TSCONFIG, path.join(root, 'tsconfig.json'));
  fs.writeJsonSync(path.join(root, 'package.json'), { name: 'fixture', private: true });
  fs.symlinkSync(
    path.join(findRepoRoot(__dirname), 'node_modules'),
    path.join(root, 'node_modules'),
    'dir'
  );

  return {
    root,
    sourceMigrationsDir: path.join(root, 'database', 'migrations'),
    distMigrationsDir: path.join(root, 'dist', 'database', 'migrations'),
  };
};

const writeRenameMigration = async (fixture: ReturnType<typeof createFixture>) => {
  const db = {
    config: { settings: { migrations: { dir: fixture.sourceMigrationsDir } } },
  } as any;
  const builder = createMigrationFileBuilder({ db });
  builder.renameColumn({
    table: 'articles',
    from: 'bio',
    to: 'biography',
    comment: 'api::article.article: rename field "bio" -> "biography"',
  });

  return (await builder.writeFiles({ name: 'rename-fields', format: 'typescript' })) as string;
};

describe('generated typescript migration', () => {
  let fixture: ReturnType<typeof createFixture>;
  let written: string;

  beforeAll(async () => {
    fixture = createFixture();
    written = await writeRenameMigration(fixture);
  });

  afterAll(() => {
    // `node_modules` is a symlink, so this removes the link, not its target.
    fs.rmSync(fixture.root, { recursive: true, force: true });
  });

  beforeEach(() => {
    fs.rmSync(path.join(fixture.root, 'dist'), { recursive: true, force: true });
  });

  it('is compiled into the discovery dir on reload', async () => {
    expect(written).toMatch(/\.rename-fields\.ts$/);

    // What `develop.ts` runs on every reload before forking the new worker.
    await compile(fixture.root, { configOptions: { ignoreDiagnostics: true } });

    const discovered = discoverMigrationFiles(fixture.distMigrationsDir);
    expect(discovered).toHaveLength(1);
    expect(path.basename(discovered[0])).toBe(`${path.basename(written, '.ts')}.js`);

    // Load it the way the runner does and drive `up` through a db stub, so
    // the assertion covers the resolver's `default` unwrapping as well as the
    // rendered helper call.
    const renameColumn = jest.fn();
    const db = {
      transaction: (fn: (ctx: { trx: unknown }) => Promise<void>) => fn({ trx: 'trx' }),
      schema: { renameColumn },
    } as any;

    const migration = migrationResolver({
      name: path.basename(discovered[0]),
      path: discovered[0],
      context: { db },
    });

    expect(typeof migration.up).toBe('function');
    await migration.up();
    expect(renameColumn).toHaveBeenCalledWith('trx', {
      table: 'articles',
      from: 'bio',
      to: 'biography',
    });
  });

  it('type-checks under production build settings', async () => {
    // `strapi build` compiles with diagnostics on, and the vanilla tsconfig
    // sets `noEmitOnError`: a type error in the template would throw here
    // ("TypeScript compilation failed") and suppress the emit.
    await expect(
      compile(fixture.root, { configOptions: { ignoreDiagnostics: false } })
    ).resolves.toBeUndefined();

    expect(discoverMigrationFiles(fixture.distMigrationsDir)).toEqual([
      path.join(fixture.distMigrationsDir, `${path.basename(written, '.ts')}.js`),
    ]);
  });
});
