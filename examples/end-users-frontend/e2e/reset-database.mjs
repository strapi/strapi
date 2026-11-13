// Run by `playwright.config.ts` before it starts Strapi: removes the throwaway SQLite database the
// end-to-end run uses (`DATABASE_FILENAME`, relative to the Strapi application, the directory this
// is run from), so each run starts from an empty one and Strapi's bootstrap seeds it again. It also
// removes the conditions the admin specs created with the condition builder (see the end).
import { readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const filename = process.env.DATABASE_FILENAME;

// Never the development database: this deletes what it is told to, so it only accepts a name that
// says it is for e2e
if (!filename || !filename.includes('e2e')) {
  console.error(
    `DATABASE_FILENAME must name the e2e database (for example .tmp/e2e.db), not "${filename ?? ''}": nothing was deleted.`
  );
  process.exit(1);
}

// The same place `config/database.ts` puts it, and the files SQLite keeps beside it
for (const suffix of ['', '-journal', '-wal', '-shm']) {
  rmSync(path.join(process.cwd(), filename + suffix), { force: true });
}

// The condition builder writes a condition to the application's `src/end-users/conditions`, and
// Strapi loads every file there. The admin specs name theirs `e2e-<time>`, and the next run must not
// start with them: they would be listed and loaded on an empty database. (Strapi cleans and compiles
// `dist` itself when it starts, so the compiled copy goes with these.)
const conditionsDirectory = path.join(process.cwd(), 'src', 'end-users', 'conditions');

let conditionFiles = [];

try {
  conditionFiles = readdirSync(conditionsDirectory);
} catch (error) {
  // No condition was ever written: there is no folder
  if (error.code !== 'ENOENT') {
    throw error;
  }
}

for (const file of conditionFiles.filter((name) => /^e2e-.+\.json$/.test(name))) {
  rmSync(path.join(conditionsDirectory, file), { force: true });
}
