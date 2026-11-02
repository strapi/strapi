import fs from 'node:fs/promises';
import path from 'node:path';

import coffee from 'coffee';
import stripAnsi from 'strip-ansi';

import { getTestApps } from '../../../../utils/get-test-apps';

const DOG_SCHEMA = 'src/api/dog/content-types/dog/schema.json';
const ARTICLE_SCHEMA = 'src/api/article/content-types/article/schema.json';
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

  const renameField = async (uid: string, oldName: string, newName: string) => {
    const result = await coffee
      .spawn('npm', ['run', '-s', 'strapi', '--', 'rename:field', uid, oldName, newName], {
        cwd: appPath,
      })
      .end();

    if (result.code !== 0) {
      throw new Error(
        `rename:field exited ${result.code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );
    }

    return result;
  };

  it('renames a scalar attribute in the schema and generates a data-preserving migration', async () => {
    const schemaPath = path.join(appPath, DOG_SCHEMA);
    const migrationsDir = path.join(appPath, MIGRATIONS_DIR);

    const before = new Set(await listMigrationFiles(migrationsDir));

    const { stdout } = await renameField('api::dog.dog', 'age', 'ageInYears');

    // The attribute is renamed in the schema file.
    const schema = await readJson(schemaPath);
    expect(schema.attributes).toHaveProperty('ageInYears');
    expect(schema.attributes).not.toHaveProperty('age');

    // Exactly one rename migration is written, renaming the underlying column.
    const after = await listMigrationFiles(migrationsDir);
    const created = after.filter((f) => !before.has(f));
    expect(created).toHaveLength(1);

    const migration = await fs.readFile(path.join(migrationsDir, created[0]), 'utf8');
    // The column is renamed through the guarded database helper (fresh-database
    // safety lives in the helper, not in the file).
    expect(migration).toContain(
      "db.schema.renameColumn(knex, { table: 'dogs', from: 'age', to: 'age_in_years' })"
    );

    const plainOut = stripAnsi(stdout);
    expect(plainOut).toMatch(/Renamed "age" to "ageInYears" on api::dog\.dog/);
    expect(plainOut).toMatch(/Generated migration/);
  });

  it('keeps a uid field attached to the field it is generated from', async () => {
    const schemaPath = path.join(appPath, ARTICLE_SCHEMA);

    expect((await readJson(schemaPath)).attributes.slug.targetField).toBe('title');

    await renameField('api::article.article', 'title', 'heading');

    const renamed = await readJson(schemaPath);
    expect(renamed.attributes).toHaveProperty('heading');
    expect(renamed.attributes).not.toHaveProperty('title');
    expect(renamed.attributes.slug.targetField).toBe('heading');

    // Rename back so the other tests sharing this app keep the template schema.
    await renameField('api::article.article', 'heading', 'title');

    const restored = await readJson(schemaPath);
    expect(restored.attributes).toHaveProperty('title');
    expect(restored.attributes.slug.targetField).toBe('title');
  });
});
