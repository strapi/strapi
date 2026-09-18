import fs from 'node:fs/promises';
import path from 'node:path';

import coffee from 'coffee';
import stripAnsi from 'strip-ansi';

import { getTestApps } from '../../../../utils/get-test-apps';

const OLD_COMPONENT_FILE = 'src/components/match/player.json';
const NEW_COMPONENT_FILE = 'src/components/team/player.json';
const MIGRATIONS_DIR = 'database/migrations';

const exists = async (file: string): Promise<boolean> => {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
};

const listRenameMigrations = async (dir: string): Promise<string[]> => {
  try {
    return (await fs.readdir(dir)).filter((f) => f.endsWith('.rename-fields.js'));
  } catch {
    return [];
  }
};

describe('rename:component', () => {
  let appPath: string;

  beforeAll(async () => {
    const testApps = getTestApps();
    appPath = testApps.at(0) as string;
  });

  it('moves a component to a new category and generates a data-preserving migration', async () => {
    const migrationsDir = path.join(appPath, MIGRATIONS_DIR);
    const before = new Set(await listRenameMigrations(migrationsDir));

    const result = await coffee
      .spawn('npm', ['run', '-s', 'strapi', '--', 'rename:component', 'match.player', 'team'], {
        cwd: appPath,
      })
      .end();

    if (result.code !== 0) {
      throw new Error(
        `rename:component exited ${result.code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );
    }

    const { stdout } = result;

    // The component file moves to the new category and the old uid is gone.
    expect(await exists(path.join(appPath, NEW_COMPONENT_FILE))).toBe(true);
    expect(await exists(path.join(appPath, OLD_COMPONENT_FILE))).toBe(false);

    // Exactly one migration is written, updating the component_type reference.
    const after = await listRenameMigrations(migrationsDir);
    const created = after.filter((f) => !before.has(f));
    expect(created).toHaveLength(1);

    const migration = await fs.readFile(path.join(migrationsDir, created[0]), 'utf8');
    // The component_type reference is rewritten through the guarded database
    // helper (fresh-database safety lives in the helper, not in the file).
    expect(migration).toContain('db.schema.updateRows(knex, {');
    expect(migration).toContain("guardColumn: 'component_type'");
    expect(migration).toContain("component_type: 'match.player'");
    expect(migration).toContain("component_type: 'team.player'");

    const plainOut = stripAnsi(stdout);
    expect(plainOut).toMatch(/Renamed component "match\.player" to category "team"/);
    expect(plainOut).toMatch(/Generated migration/);
  });
});
