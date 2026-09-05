'use strict';

/**
 * Copy this file's logic into your Strapi project's src/index.js bootstrap hook,
 * or require it from bootstrap: require('../../path/to/dz-team-bootstrap')({ strapi })
 *
 * Fixes:
 * - Enables Public role find/findOne on api::team.team (resolves 403)
 * - Logs schema + DB state to debug-ab0d43.log for DZ persistence debugging
 */

const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(process.cwd(), 'debug-ab0d43.log');

const log = (message, data, hypothesisId, runId = 'bootstrap') => {
  const entry = JSON.stringify({
    sessionId: 'ab0d43',
    location: 'dz-team-bootstrap.js',
    message,
    data,
    timestamp: Date.now(),
    hypothesisId,
    runId,
  });
  fs.appendFileSync(LOG_PATH, `${entry}\n`);
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

module.exports = async function dzTeamBootstrap({ strapi }) {
  const pageModel = strapi.contentTypes['api::page.page'];
  const teamComponent = strapi.components['dynamic-zone.team'];

  const dzAttr = pageModel?.attributes?.dynamic_zone;
  log(
    'Schema check on bootstrap',
    {
      pageExists: !!pageModel,
      teamComponentExists: !!teamComponent,
      dzAllowedComponents: dzAttr?.components ?? null,
      teamInDz: dzAttr?.components?.includes('dynamic-zone.team') ?? false,
    },
    'H2'
  );

  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  if (publicRole) {
    const teamPerms = {};
    for (const action of TEAM_ACTIONS) {
      teamPerms[action] = await ensurePermission(strapi, publicRole.id, action);
    }
    for (const action of PAGE_ACTIONS) {
      await ensurePermission(strapi, publicRole.id, action);
    }
    log('Public role permissions for Team/Page', { roleId: publicRole.id, teamPerms }, 'H1');
  }

  try {
    const rows = await strapi.db.connection('components_dynamic_zone_teams').select('*').limit(5);
    log('DB sample components_dynamic_zone_teams', { count: rows.length, rows }, 'H2-H5');
  } catch (e) {
    log('DB table check', { error: e.message }, 'H2-H5');
  }

  // Verify Public can access teams after permission seed
  try {
    const publicPerms = await strapi.db.query('plugin::users-permissions.permission').findMany({
      where: { role: publicRole?.id, action: { $contains: 'team' } },
    });
    log(
      'Post-bootstrap team permissions',
      { actions: publicPerms.map((p) => p.action) },
      'H1',
      'post-fix'
    );
  } catch (e) {
    log('Permission verify failed', { error: e.message }, 'H1');
  }
};
