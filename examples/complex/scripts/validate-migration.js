#!/usr/bin/env node

const { createStrapi, compileStrapi } = require('@strapi/strapi');
const { resolveContext } = require('../../../tests/migration/fixture/resolve-context');
const { runChecks } = require('../../../tests/migration/fixture/run-checks');

async function run() {
  const argv = process.argv.slice(2);
  const context = resolveContext(argv);

  console.log('🔍 Starting document-service validator (this will boot Strapi programmatically)...');
  console.log(`  multiplier: ${context.multiplier}`);
  console.log(`  profile: ${context.profile} (dataOrigin=${context.dataOrigin})`);

  const appContext = await compileStrapi();
  const strapi = await createStrapi(appContext).load();
  strapi.log.level = 'error';

  const dbConfig = strapi.config.get('database');
  const conn = dbConfig?.connection?.connection || {};
  const client = dbConfig?.connection?.client || '?';
  let dbDesc;
  if (conn.connectionString) {
    dbDesc = `${client} (from DATABASE_URL)`;
  } else if (client === 'sqlite' && conn.filename) {
    dbDesc = `sqlite ${conn.filename}`;
  } else {
    dbDesc = `${client} ${conn.host || 'localhost'}:${conn.port ?? (client === 'postgres' ? 5432 : 3306)}/${conn.database || 'strapi'}`;
  }
  console.log(`  database: ${dbDesc}`);

  try {
    const results = await runChecks({ ...context, strapi });

    console.log('\n✅ Validation summary:');
    if (results.errors.length === 0) {
      console.log('  All checks passed (no errors)');
    } else {
      console.log(`  Found ${results.errors.length} error(s):`);
      for (const e of results.errors.slice(0, 50)) console.log(`   - ${e}`);
      if (results.errors.length > 50) console.log(`   ...and ${results.errors.length - 50} more`);
    }

    console.log('\n📊 Count checks:');
    for (const c of results.checks) {
      console.log(`  - ${c.type}: actual=${c.actual} expected=${c.expected}`);
    }

    console.log('\n🧪 Validation sections:');
    for (const section of results.sections) {
      const status = section.errors.length === 0 ? 'ok' : `errors=${section.errors.length}`;
      console.log(`  - ${section.name}: ${status}`);
    }

    if (results.dbLines?.length > 0) {
      console.log('\n🔬 DB-level verification:');
      for (const line of results.dbLines) console.log(line);
    }

    if (results.errors.length > 0) {
      console.log(
        '\nExiting with code 2 (validation failed). Code 1 means this script crashed before finishing.'
      );
    }

    process.exit(results.errors.length === 0 ? 0 : 2);
  } catch (err) {
    console.error('Validator error:', err);
    process.exit(1);
  } finally {
    try {
      await strapi.destroy();
    } catch (_) {}
  }
}

if (require.main === module) {
  run();
}
