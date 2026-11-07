'use strict';

/**
 * DROP-IN FIX for dynamic-zone.team not persisting + Team API 403
 *
 * 1. Copy this file to your Strapi project: src/utils/dz-team-complete-fix.js
 * 2. In src/index.ts (or src/index.js):
 *
 *    const dzTeamFix = require('./utils/dz-team-complete-fix');
 *    module.exports = {
 *      register({ strapi }) { dzTeamFix.register({ strapi }); },
 *      async bootstrap({ strapi }) { await dzTeamFix.bootstrap({ strapi }); },
 *    };
 *
 * 3. Restart Strapi, save/publish a Page with Team block, check debug-ab0d43.log in project root
 */

const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(process.cwd(), 'debug-ab0d43.log');

const log = (message, data, hypothesisId, runId = 'fix') => {
  const line = JSON.stringify({
    sessionId: 'ab0d43',
    location: 'dz-team-complete-fix.js',
    message,
    data,
    timestamp: Date.now(),
    hypothesisId,
    runId,
  });
  fs.appendFileSync(LOG_PATH, `${line}\n`);
  console.log(`[dz-team-fix] ${message}`, data);
};

const TEAM_ACTIONS = ['api::team.team.find', 'api::team.team.findOne'];
const PAGE_ACTIONS = ['api::page.page.find', 'api::page.page.findOne'];

async function ensurePermission(strapi, roleId, action) {
  const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
    where: { action, role: roleId },
  });
  if (!existing) {
    await strapi.db.query('plugin::users-permissions.permission').create({
      data: { action, role: roleId },
    });
    return 'created';
  }
  return 'exists';
}

async function seedPublicPermissions(strapi) {
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });
  if (!publicRole) {
    log('No public role found', {}, 'H1');
    return;
  }
  const result = {};
  for (const action of [...TEAM_ACTIONS, ...PAGE_ACTIONS]) {
    result[action] = await ensurePermission(strapi, publicRole.id, action);
  }
  log('Public permissions seeded', { roleId: publicRole.id, result }, 'H1', 'post-fix');
}

function registerDocumentMiddleware(strapi) {
  strapi.documents.use(async (context, next) => {
    const uid = context.contentType?.uid;
    if (uid !== 'api::page.page') {
      return next();
    }
    if (!['create', 'update', 'publish'].includes(context.action)) {
      return next();
    }

    const dz = context.params?.data?.dynamic_zone ?? context.params?.data?.contentSections;
    const dzField = context.params?.data?.dynamic_zone ? 'dynamic_zone' : 'contentSections';

    log(
      `documents.${context.action} BEFORE`,
      {
        action: context.action,
        dzField,
        dzLength: Array.isArray(dz) ? dz.length : null,
        dzComponents: Array.isArray(dz) ? dz.map((c) => c?.__component) : null,
        teamBlocks: Array.isArray(dz)
          ? dz.filter((c) => c?.__component === 'dynamic-zone.team')
          : null,
      },
      'H2-H5'
    );

    const result = await next();

    const outDz = result?.dynamic_zone ?? result?.contentSections;
    log(
      `documents.${context.action} AFTER`,
      {
        action: context.action,
        dzLength: Array.isArray(outDz) ? outDz.length : null,
        dzComponents: Array.isArray(outDz) ? outDz.map((c) => c?.__component) : null,
      },
      'H2-H5',
      'post-fix'
    );

    return result;
  });
}

async function verifySchema(strapi) {
  const page = strapi.contentTypes['api::page.page'];
  const teamComp = strapi.components['dynamic-zone.team'];
  const dz = page?.attributes?.dynamic_zone ?? page?.attributes?.contentSections;

  log(
    'Schema verification',
    {
      pageLoaded: !!page,
      teamComponentLoaded: !!teamComp,
      dzComponents: dz?.components ?? null,
      teamInDz: dz?.components?.includes('dynamic-zone.team') ?? false,
      teamRelation: teamComp?.attributes?.teams ?? null,
    },
    'H2'
  );

  if (page && dz && !dz.components?.includes('dynamic-zone.team')) {
    strapi.log.warn(
      '[dz-team-fix] FIX REQUIRED: Add "dynamic-zone.team" to Page dynamic_zone.components in schema.json'
    );
  }
}

async function verifyDatabase(strapi) {
  try {
    const rows = await strapi.db
      .connection('components_dynamic_zone_teams')
      .select('id', 'title', 'subtitle')
      .limit(5);
    log('DB components_dynamic_zone_teams', { count: rows.length, rows }, 'H2-H5');
  } catch (e) {
    log('DB check failed', { error: e.message }, 'H2-H5');
  }
}

module.exports = {
  register({ strapi }) {
    registerDocumentMiddleware(strapi);
  },

  async bootstrap({ strapi }) {
    if (fs.existsSync(LOG_PATH)) {
      fs.unlinkSync(LOG_PATH);
    }
    log('Bootstrap started', { cwd: process.cwd() }, 'init');
    await verifySchema(strapi);
    await seedPublicPermissions(strapi);
    await verifyDatabase(strapi);
    log('Bootstrap complete — restart done, now save/publish Page in Admin', {}, 'init');
  },
};
