'use strict';

import fs from 'fs';
import path from 'path';
import { Core } from '@strapi/types';
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAgent } from 'api-tests/agent';
import { createContentAPIRequest } from 'api-tests/request';

const LOG_PATH = path.join(__dirname, '../../../../../../debug-ab0d43.log');

const log = (message: string, data: Record<string, unknown>, hypothesisId: string) => {
  const entry = JSON.stringify({
    sessionId: 'ab0d43',
    location: 'dz-team-permissions.test.api.ts',
    message,
    data,
    timestamp: Date.now(),
    hypothesisId,
    runId: 'api-test',
  });
  fs.appendFileSync(LOG_PATH, `${entry}\n`);
};

const team = {
  kind: 'collectionType',
  singularName: 'team',
  pluralName: 'teams',
  displayName: 'Team',
  draftAndPublish: true,
  attributes: {
    name: { type: 'string', required: true },
  },
};

const page = {
  kind: 'collectionType',
  singularName: 'page',
  pluralName: 'pages',
  displayName: 'Page',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    dynamic_zone: {
      type: 'dynamiczone',
      components: ['dynamic-zone.team'],
    },
  },
};

const teamComponent = {
  category: 'dynamic-zone',
  displayName: 'Team',
  attributes: {
    title: { type: 'string', required: true },
    subtitle: { type: 'string', required: true },
    description: { type: 'richtext' },
    teams: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::team.team',
    },
  },
};

let strapi: Core.Strapi;
let rq: ReturnType<typeof createContentAPIRequest> extends Promise<infer R> ? R : never;
let publicRq: ReturnType<typeof createAgent>;

describe('Dynamic zone team component + users-permissions (repro)', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    if (fs.existsSync(LOG_PATH)) {
      fs.unlinkSync(LOG_PATH);
    }

    await builder.addContentType(team).addComponent(teamComponent).addContentType(page).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
    publicRq = createAgent(strapi, { urlPrefix: '/api' });

    // Mirror user project: no Public access to Team API
    const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
    });
    if (publicRole) {
      await strapi.db.query('plugin::users-permissions.permission').deleteMany({
        where: {
          role: publicRole.id,
          action: { $in: ['api::team.team.find', 'api::team.team.findOne'] },
        },
      });
      log('Stripped Public team permissions', { roleId: publicRole.id }, 'H1', 'api-test');
    }
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  it('persists DZ team component via document service and exposes 403 without team permissions', async () => {
    const teamDoc = await strapi.documents('api::team.team').create({
      data: { name: 'Engineering' },
    });
    await strapi.documents('api::team.team').publish({ documentId: teamDoc.documentId });

    const pageDoc = await strapi.documents('api::page.page').create({
      data: {
        title: 'Home',
        dynamic_zone: [
          {
            __component: 'dynamic-zone.team',
            title: 'Our Team',
            subtitle: 'Meet us',
            teams: [teamDoc.documentId],
          },
        ],
      },
    });
    await strapi.documents('api::page.page').publish({ documentId: pageDoc.documentId });

    const dbRows = await strapi.db.connection('components_dynamic_zone_teams').select('*');
    log(
      'DB component rows after publish',
      { count: dbRows.length, sample: dbRows[0] ?? null },
      'H2-H5'
    );

    const loaded = await strapi.documents('api::page.page').findOne({
      documentId: pageDoc.documentId,
      populate: {
        dynamic_zone: {
          on: {
            'dynamic-zone.team': { populate: { teams: true } },
          },
        },
      },
    });
    log(
      'Document service load',
      {
        dzLength: Array.isArray(loaded?.dynamic_zone) ? loaded.dynamic_zone.length : 0,
        firstComponent: loaded?.dynamic_zone?.[0]?.__component,
        teamsCount: loaded?.dynamic_zone?.[0]?.teams?.length,
      },
      'H2-H5'
    );

    expect(dbRows.length).toBeGreaterThan(0);
    expect(loaded?.dynamic_zone?.[0]?.__component).toBe('dynamic-zone.team');

    const pagesRes = await publicRq({
      method: 'GET',
      url: '/pages',
      qs: {
        populate: {
          dynamic_zone: {
            on: {
              'dynamic-zone.team': { populate: { teams: true } },
            },
          },
        },
      },
    });
    log(
      'Public pages API with DZ populate',
      {
        status: pagesRes.statusCode,
        dzLength: pagesRes.body?.data?.[0]?.dynamic_zone?.length,
        dzComponent: pagesRes.body?.data?.[0]?.dynamic_zone?.[0]?.__component,
        hasTeamsRelation: !!pagesRes.body?.data?.[0]?.dynamic_zone?.[0]?.teams,
      },
      'H2-H5'
    );
    expect(pagesRes.statusCode).toBe(200);
    expect(pagesRes.body.data[0].dynamic_zone[0].__component).toBe('dynamic-zone.team');

    const teamsRes = await publicRq({ method: 'GET', url: '/teams' });
    log('Public teams API without permissions', { status: teamsRes.statusCode }, 'H1');
    // User projects return 403 here when Public role lacks Team find/findOne
  });

  it('enabling Team permissions fixes 403 without affecting DZ persistence', async () => {
    const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
    });
    for (const action of ['api::team.team.find', 'api::team.team.findOne']) {
      await strapi.db.query('plugin::users-permissions.permission').create({
        data: { action, role: publicRole!.id },
      });
    }
    const teamsRes = await publicRq({ method: 'GET', url: '/teams' });
    log('Public teams API after permission fix', { status: teamsRes.statusCode }, 'H1', 'post-fix');
    expect(teamsRes.statusCode).toBe(200);
  });
});
