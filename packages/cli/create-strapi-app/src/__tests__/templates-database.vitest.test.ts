import fs from 'fs';
import path from 'path';
import { env } from '@strapi/utils';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Every scaffolded template ships a `config/database` file that validates the
 * `DATABASE_CLIENT` env var against the clients Strapi actually supports. These
 * tests load each template's database config (using the real `env` helper the
 * generated app runs with) and assert it fails loudly when an unsupported
 * client is provided, rather than silently building an invalid connection.
 */

const templatesDir = path.resolve(__dirname, '..', '..', 'templates');

const templates = fs
  .readdirSync(templatesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const loadDatabaseConfig = async (template: string) => {
  const configDir = path.join(templatesDir, template, 'config');
  const file = ['database.ts', 'database.js']
    .map((name) => path.join(configDir, name))
    .find((candidate) => fs.existsSync(candidate));

  if (!file) {
    throw new Error(`No database config found for template "${template}"`);
  }

  // Import through Vitest so `.ts` templates are transformed (native `require` would load them as ESM without `__dirname`)
  const mod = await import(file);

  return (mod.default ?? mod) as (ctx: { env: typeof env }) => unknown;
};

describe('create-strapi-app templates database config', () => {
  const originalEnv = {
    DATABASE_CLIENT: process.env.DATABASE_CLIENT,
    DATABASE_FILENAME: process.env.DATABASE_FILENAME,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('discovers at least one template', () => {
    expect(templates.length).toBeGreaterThan(0);
  });

  it.each(templates)('%s throws on an unsupported DATABASE_CLIENT', async (template) => {
    process.env.DATABASE_CLIENT = 'oracle';
    const config = await loadDatabaseConfig(template);

    expect(() => config({ env })).toThrow('Unsupported DATABASE_CLIENT');
  });

  it.each(templates)('%s builds a config for a supported DATABASE_CLIENT', async (template) => {
    process.env.DATABASE_CLIENT = 'sqlite';
    const config = await loadDatabaseConfig(template);

    expect(() => config({ env })).not.toThrow();
  });

  it.each(templates)(
    '%s falls back to .tmp/data.db when DATABASE_FILENAME is empty',
    async (template) => {
      process.env.DATABASE_CLIENT = 'sqlite';
      process.env.DATABASE_FILENAME = '';
      const config = await loadDatabaseConfig(template);

      const result = config({ env }) as { connection: { connection: { filename: string } } };

      expect(result.connection.connection.filename).toMatch(/[\\/]\.tmp[\\/]data\.db$/);
    }
  );
});
