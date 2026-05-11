#!/usr/bin/env node
/**
 * Seeds one `Basic` entry through the Content REST API, then reads it back with GET.
 * Run from `examples/complex` (e.g. `yarn seed:rest`). Requires a working DB (same as `yarn seed:v5`).
 *
 * Uses a random localhost port unless `SEED_REST_PORT` is set. Temporarily opens Public
 * permissions on `api::basic.basic` (find / findOne / create) for this process only.
 */

const { createStrapi, compileStrapi } = require('@strapi/strapi');

const BASIC_ACTIONS = [
  'api::basic.basic.find',
  'api::basic.basic.findOne',
  'api::basic.basic.create',
];

async function ensurePublicPermission(strapi, roleId, action) {
  const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
    where: { action, role: roleId },
  });

  if (existing) {
    return;
  }

  await strapi.db.query('plugin::users-permissions.permission').create({
    data: { action, role: roleId },
  });
}

async function grantPublicBasicApi(strapi) {
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  if (!publicRole) {
    throw new Error('users-permissions public role not found (bootstrap incomplete?)');
  }

  for (const action of BASIC_ACTIONS) {
    await ensurePublicPermission(strapi, publicRole.id, action);
  }
}

async function main() {
  if (!process.env.PORT) {
    process.env.PORT = process.env.SEED_REST_PORT || '0';
  }
  if (!process.env.HOST) {
    process.env.HOST = '127.0.0.1';
  }

  let strapi;

  try {
    const appContext = await compileStrapi();
    strapi = createStrapi(appContext);
    strapi.log.level = 'error';

    await strapi.load();
    await grantPublicBasicApi(strapi);
    await strapi.listen();

    const addr = strapi.server.httpServer.address();
    const listenPort =
      typeof addr === 'object' && addr ? addr.port : strapi.config.get('server.port');
    const listenHost = '127.0.0.1';
    const apiPrefix = strapi.config.get('api.rest.prefix') || '/api';
    const base = `http://${listenHost}:${listenPort}${apiPrefix}`;

    const label = `rest-seed-${Date.now()}`;
    const createRes = await fetch(`${base}/basics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          stringField: label,
          textField: 'Created via examples/complex/scripts/seed-rest-api.js',
        },
      }),
    });

    const createText = await createRes.text();
    let createJson;
    try {
      createJson = JSON.parse(createText);
    } catch {
      throw new Error(`POST /basics expected JSON, got ${createRes.status}: ${createText}`);
    }

    if (!createRes.ok) {
      throw new Error(`POST /basics failed ${createRes.status}: ${createText}`);
    }

    const documentId = createJson.data?.documentId ?? createJson.data?.id ?? createJson.documentId;
    if (!documentId) {
      throw new Error(`Unexpected POST body (no documentId): ${createText}`);
    }

    console.log(`POST /api/basics → ${createRes.status} documentId=${documentId}`);

    const listUrl = new URL(`${base}/basics`);
    listUrl.searchParams.set('pagination[pageSize]', '5');
    listUrl.searchParams.set('sort', 'createdAt:desc');
    const listRes = await fetch(listUrl);
    const listText = await listRes.text();
    if (!listRes.ok) {
      throw new Error(`GET /basics failed ${listRes.status}: ${listText}`);
    }

    const listJson = JSON.parse(listText);
    const count = Array.isArray(listJson.data) ? listJson.data.length : 0;
    console.log(`GET /api/basics → ${listRes.status} (first page ${count} item(s))`);

    const oneRes = await fetch(`${base}/basics/${documentId}`);
    const oneText = await oneRes.text();
    if (!oneRes.ok) {
      throw new Error(`GET /basics/:id failed ${oneRes.status}: ${oneText}`);
    }

    const oneJson = JSON.parse(oneText);
    const readBack = oneJson.data?.stringField ?? oneJson.data?.attributes?.stringField;
    console.log(`GET /api/basics/${documentId} → ${oneRes.status} stringField=${readBack}`);

    console.log('\n✅ REST seed + query completed');
  } finally {
    if (strapi) {
      await strapi.destroy();
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
