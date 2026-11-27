import { scaffoldContentType, type App, type Database } from '@strapi/tests-shared';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp, parseTable, runStrapi } from '../helpers';

let app: App;
let database: Database;

/** The rows of a `<what>:list` table. */
const list = async (command: string) => {
  const result = await runStrapi(app, [command], { database });
  expect(result.code, result.output).toBe(0);
  return parseTable(result.stdout);
};

const names = async (command: string) => (await list(command)).map((row) => row.Name);

describe('list commands', () => {
  beforeAll(async () => {
    ({ app, database } = await createApp((generated) => {
      scaffoldContentType(generated, {
        singularName: 'article',
        attributes: { title: { type: 'string' } },
      });
    }));
  });

  it('content-types:list lists the content types of the app and of the plugins', async () => {
    expect(await names('content-types:list')).toEqual(
      expect.arrayContaining(['api::article.article', 'plugin::upload.file', 'admin::user'])
    );
  });

  it('controllers:list lists the controllers of the app and of the plugins', async () => {
    expect(await names('controllers:list')).toEqual(
      expect.arrayContaining(['api::article.article', 'plugin::content-manager.collection-types'])
    );
  });

  it('services:list lists the services of the app and of the plugins', async () => {
    expect(await names('services:list')).toEqual(
      expect.arrayContaining(['api::article.article', 'plugin::content-manager.components'])
    );
  });

  it('routes:list lists the Content API routes of the app', async () => {
    const routes = await list('routes:list');

    for (const [method, path] of [
      ['GET', '/api/articles'],
      ['GET', '/api/articles/:id'],
      ['POST', '/api/articles'],
      ['PUT', '/api/articles/:id'],
      ['DELETE', '/api/articles/:id'],
    ]) {
      expect(
        routes.some((route) => route.Path === path && route.Method.split('|').includes(method)),
        `${method} ${path}`
      ).toBe(true);
    }
  });

  it('middlewares:list lists the core and plugin middlewares', async () => {
    expect(await names('middlewares:list')).toEqual(
      expect.arrayContaining([
        'strapi::errors',
        'strapi::security',
        'strapi::cors',
        'strapi::body',
        'admin::rateLimit',
      ])
    );
  });

  it('policies:list lists the policies', async () => {
    expect(await names('policies:list')).toMatchInlineSnapshot(`
      [
        "plugin::content-manager.hasPermissions",
        "admin::isAuthenticatedAdmin",
        "admin::hasPermissions",
        "admin::isTelemetryEnabled",
      ]
    `);
  });

  it('hooks:list lists the hooks', async () => {
    expect(await names('hooks:list')).toMatchInlineSnapshot(`
      [
        "strapi::content-types.beforeSync",
        "strapi::content-types.afterSync",
        "strapi::app.afterBootstrap",
      ]
    `);
  });
});
