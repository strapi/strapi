#!/usr/bin/env node
/**
 * Run from YOUR Strapi project root (where .tmp/data.db lives):
 *   node path/to/strapi/scripts/debug/fix-dz-team.mjs
 *
 * Or copy this file into your project and run: node fix-dz-team.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.cwd();
const LOG_PATH = path.join(PROJECT_ROOT, 'debug-ab0d43.log');
const DB_PATH = path.join(PROJECT_ROOT, '.tmp', 'data.db');

const log = (message, data, hypothesisId, runId = 'fix-script') => {
  const entry = JSON.stringify({
    sessionId: 'ab0d43',
    location: 'fix-dz-team.mjs',
    message,
    data,
    timestamp: Date.now(),
    hypothesisId,
    runId,
  });
  fs.appendFileSync(LOG_PATH, `${entry}\n`);
  console.log(`[${hypothesisId}] ${message}`, JSON.stringify(data, null, 2));
};

async function openDb() {
  try {
    const Database = (await import('better-sqlite3')).default;
    return Database(DB_PATH, { readonly: false });
  } catch {
    return null;
  }
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function findSchemaFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      findSchemaFiles(full, results);
    } else if (name === 'schema.json') {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH);

  log('Script started', { PROJECT_ROOT, DB_PATH }, 'init');

  // --- H2: Schema checks ---
  const pageSchemaPath = path.join(
    PROJECT_ROOT,
    'src/api/page/content-types/page/schema.json'
  );
  const pageSchema = readJsonSafe(pageSchemaPath);
  const dzField =
    pageSchema?.attributes?.dynamic_zone ??
    pageSchema?.attributes?.contentSections;
  const dzFieldName = pageSchema?.attributes?.dynamic_zone
    ? 'dynamic_zone'
    : pageSchema?.attributes?.contentSections
      ? 'contentSections'
      : null;

  log('Page schema', {
    pageSchemaPath,
    exists: !!pageSchema,
    dzFieldName,
    dzComponents: dzField?.components ?? null,
    teamInDz: dzField?.components?.includes('dynamic-zone.team') ?? false,
  }, 'H2');

  const teamCompPath = path.join(PROJECT_ROOT, 'src/components/dynamic-zone/team.json');
  const teamComp = readJsonSafe(teamCompPath);
  log('Team component file', {
    teamCompPath,
    exists: !!teamComp,
    hasTeamsRelation: !!teamComp?.attributes?.teams,
    teamsTarget: teamComp?.attributes?.teams?.target,
  }, 'H2');

  const db = await openDb();
  if (!db) {
    log('SQLite unavailable', { hint: 'npm install better-sqlite3 or check .tmp/data.db' }, 'H2');
    printFixInstructions();
    return;
  }

  // --- H1: Users-permissions ---
  const teamPerms = db
    .prepare(
      `SELECT p.action FROM up_permissions p
       JOIN up_permissions_role_lnk pr ON pr.permission_id = p.id
       JOIN up_roles r ON r.id = pr.role_id
       WHERE r.type = 'public' AND p.action LIKE '%team%'`
    )
    .all();
  log('Public role Team permissions in DB', { teamPerms }, 'H1');

  const needsFind = !teamPerms.some((p) => p.action === 'api::team.team.find');
  const needsFindOne = !teamPerms.some((p) => p.action === 'api::team.team.findOne');

  if (needsFind || needsFindOne) {
    const publicRole = db.prepare(`SELECT id FROM up_roles WHERE type = 'public'`).get();
    if (publicRole) {
      const insert = db.prepare(
        `INSERT INTO up_permissions (action, created_at, updated_at, published_at)
         VALUES (?, datetime('now'), datetime('now'), datetime('now'))`
      );
      const link = db.prepare(
        `INSERT INTO up_permissions_role_lnk (permission_id, role_id) VALUES (?, ?)`
      );
      for (const action of [
        ...(needsFind ? ['api::team.team.find'] : []),
        ...(needsFindOne ? ['api::team.team.findOne'] : []),
      ]) {
        const r = insert.run(action);
        link.run(r.lastInsertRowid, publicRole.id);
        log('Created permission', { action, roleId: publicRole.id }, 'H1', 'post-fix');
      }
    }
  } else {
    log('Team permissions already OK', {}, 'H1', 'post-fix');
  }

  // --- H2-H5: DB component rows ---
  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%team%'`
    )
    .all()
    .map((t) => t.name);

  log('SQLite tables matching team', { tables }, 'H2-H5');

  const compTable = 'components_dynamic_zone_teams';
  if (tables.includes(compTable)) {
    const rows = db.prepare(`SELECT id, title, subtitle FROM ${compTable} LIMIT 10`).all();
    log('DZ team component rows', { count: rows.length, rows }, 'H2-H5');
  } else {
    log('No components_dynamic_zone_teams table', { hint: 'Component never saved or wrong collectionName' }, 'H2-H5');
  }

  if (dzFieldName) {
    const linkTables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'pages%'`
      )
      .all()
      .map((t) => t.name);
    log('Page link tables', { linkTables }, 'H2-H5');
  }

  db.close();
  printFixInstructions();
}

function printFixInstructions() {
  console.log(`
--- Manual steps if issue persists ---
1. Admin > Settings > Users & Permissions > Public: enable Team find + findOne
2. Admin > Settings > Administration Panel > Roles: allow dynamic_zone on Page
3. Page schema must list "dynamic-zone.team" in dynamic_zone.components
4. Fill required title/subtitle, Save AND Publish
5. API: populate[dynamic_zone][on][dynamic-zone.team][populate][teams]=true
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
