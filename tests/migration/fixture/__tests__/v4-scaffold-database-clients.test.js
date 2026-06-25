'use strict';

const fs = require('fs');
const path = require('path');

/** Strapi v4 sqlite/postgres use these client names; mysql uses the mysql2 Knex driver directly. */
const VALID_V4_DB_CLIENTS = new Set(['sqlite', 'postgres', 'mysql2']);

const INVALID_KNEX_DRIVER_NAMES = ['better-sqlite3', 'pg', 'sqlite3'];

const setupScriptPath = path.resolve(
  __dirname,
  '../../../../examples/complex/scripts/setup-v4-project.js'
);

describe('setup-v4-project generated database.js', () => {
  const source = fs.readFileSync(setupScriptPath, 'utf8');

  test('uses only supported database client names in the embedded database template', () => {
    const templateMatch = source.match(/const databaseConfig = `([\s\S]*?)`;/);
    expect(templateMatch).not.toBeNull();
    const template = templateMatch[1];

    const clients = [...template.matchAll(/client:\s*'([^']+)'/g)].map((m) => m[1]);
    expect(clients.length).toBeGreaterThan(0);

    for (const client of clients) {
      expect(VALID_V4_DB_CLIENTS.has(client)).toBe(true);
    }
  });

  test.each(INVALID_KNEX_DRIVER_NAMES)('does not embed Knex driver name %s as client', (driver) => {
    const templateMatch = source.match(/const databaseConfig = `([\s\S]*?)`;/);
    const template = templateMatch[1];
    expect(template).not.toMatch(new RegExp(`client:\\s*'${driver}'`));
  });

  test('mysql2 driver is listed in v4 scaffold dependencies', () => {
    expect(source).toMatch(/mysql2:\s*'/);
  });
});
