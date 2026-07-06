import fs from 'node:fs/promises';
import path from 'node:path';

import coffee from 'coffee';
import stripAnsi from 'strip-ansi';

import { getTestApps } from '../../../../utils/get-test-apps';

const DOG_SCHEMA = 'src/api/dog/content-types/dog/schema.json';
const MIGRATIONS_DIR = 'database/migrations';

const readJson = async (file: string) => JSON.parse(await fs.readFile(file, 'utf8'));

const listMigrationFiles = async (dir: string): Promise<string[]> => {
  try {
    return (await fs.readdir(dir)).filter((f) => f.endsWith('.rename-fields.js'));
  } catch {
    return [];
  }
};

describe('rename:field', () => {
  let appPath: string;

  beforeAll(async () => {
    const testApps = getTestApps();
    appPath = testApps.at(0) as string;
  });

  it('renames a scalar attribute in the schema and generates a data-preserving migration', async () => {
    const schemaPath = path.join(appPath, DOG_SCHEMA);
    const migrationsDir = path.join(appPath, MIGRATIONS_DIR);

    const before = new Set(await listMigrationFiles(migrationsDir));

    const { stdout } = await coffee
      .spawn(
        'npm',
        ['run', '-s', 'strapi', '--', 'rename:field', 'api::dog.dog', 'age', 'ageInYears'],
        {
          cwd: appPath,
        }
      )
      .expect('code', 0)
      .end();

    // The attribute is renamed in the schema file.
    const schema = await readJson(schemaPath);
    expect(schema.attributes).toHaveProperty('ageInYears');
    expect(schema.attributes).not.toHaveProperty('age');

    // Exactly one rename migration is written, renaming the underlying column.
    const after = await listMigrationFiles(migrationsDir);
    const created = after.filter((f) => !before.has(f));
    expect(created).toHaveLength(1);

    const migration = await fs.readFile(path.join(migrationsDir, created[0]), 'utf8');
    expect(migration).toMatch(/renameColumn/);
    expect(migration).toContain("'dogs'");
    expect(migration).toContain("'age'");
    expect(migration).toContain("'age_in_years'");
    // Guarded for fresh-database safety.
    expect(migration).toMatch(/hasTable/);
    expect(migration).toMatch(/hasColumn/);

    const plainOut = stripAnsi(stdout);
    expect(plainOut).toMatch(/Renamed "age" to "ageInYears" on api::dog\.dog/);
    expect(plainOut).toMatch(/Generated migration/);
  });
});
