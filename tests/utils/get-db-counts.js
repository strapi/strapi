'use strict';

/**
 * Outputs JSON with table counts and sample IDs for the export/import roundtrip test.
 * Run with cwd = test app path (so .tmp/data.db and node_modules/better-sqlite3 are found).
 */
const path = require('path');

const dbPath = path.join(process.cwd(), '.tmp', 'data.db');

let output;
try {
  // eslint-disable-next-line import/no-extraneous-dependencies -- run in test app context
  const Database = require('better-sqlite3');
  const db = new Database(dbPath, { readonly: true });
  const articles = db.prepare('SELECT COUNT(*) as c FROM articles').get();
  const categories = db.prepare('SELECT COUNT(*) as c FROM categories').get();
  const articleIds = db
    .prepare('SELECT id FROM articles ORDER BY id')
    .all()
    .map((r) => r.id);
  const categoryIds = db
    .prepare('SELECT id FROM categories ORDER BY id')
    .all()
    .map((r) => r.id);
  db.close();
  output = {
    articles: articles.c,
    categories: categories.c,
    articleIds,
    categoryIds,
  };
} catch (err) {
  output = { error: err.message };
}
console.log(JSON.stringify(output));
