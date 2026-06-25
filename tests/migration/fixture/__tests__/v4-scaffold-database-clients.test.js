'use strict';

const fs = require('fs');
const path = require('path');

/** Must match @strapi/database connection.ts clientMap keys (Strapi-level aliases, not Knex drivers). */
const VALID_STRAPI_DB_CLIENTS = new Set(['sqlite', 'mysql', 'postgres']);

const INVALID_KNEX_DRIVER_NAMES = ['mysql2', 'better-sqlite3', 'pg', 'sqlite3'];

const setupScriptPath = path.resolve(
  __dirname,
  '../../../../examples/complex/scripts/setup-v4-project.js'
);

describe('setup-v4-project generated database.js', () => {
  const source = fs.readFileSync(setupScriptPath, 'utf8');

  test('uses only Strapi database client aliases in the embedded database template', () => {
    const templateMatch = source.match(/const databaseConfig = `([\s\S]*?)`;/);
    expect(templateMatch).not.toBeNull();
    const template = templateMatch[1];

    const clients = [...template.matchAll(/client:\s*'([^']+)'/g)].map((m) => m[1]);
    expect(clients.length).toBeGreaterThan(0);

    for (const client of clients) {
      expect(VALID_STRAPI_DB_CLIENTS.has(client)).toBe(true);
    }
  });

  test.each(INVALID_KNEX_DRIVER_NAMES)('does not embed Knex driver name %s as client', (driver) => {
    const templateMatch = source.match(/const databaseConfig = `([\s\S]*?)`;/);
    const template = templateMatch[1];
    expect(template).not.toMatch(new RegExp(`client:\\s*'${driver}'`));
  });
});
