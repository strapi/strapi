import fs from 'node:fs';
import path from 'node:path';

import { scaffoldContentType, type App, type Database } from '@strapi/tests-shared';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp, runStrapi } from '../helpers';

let app: App;
let database: Database;

const generate = (output: string, env?: NodeJS.ProcessEnv) =>
  runStrapi(app, ['openapi', 'generate', '-o', output], { database, env });

describe('openapi generate', () => {
  beforeAll(async () => {
    ({ app, database } = await createApp((generated) => {
      scaffoldContentType(generated, {
        singularName: 'article',
        attributes: { title: { type: 'string' } },
      });
    }));
  });

  it('writes an OpenAPI document of the Content API', async () => {
    const result = await generate('openapi.json');

    expect(result.code, result.output).toBe(0);
    expect(result.stdout).toMatch(/Generated an OpenAPI specification for .* in \d+ms/);
    expect(result.stderr).toMatch(/OpenAPI generation feature is currently experimental/);

    const spec = JSON.parse(fs.readFileSync(path.join(app.dir, 'openapi.json'), 'utf8'));

    expect(spec.openapi).toMatch(/^3\.\d+\.\d+$/);
    expect(spec.info).toMatchObject({ title: app.name, version: '0.1.0' });

    // The scaffolded content type, with its attribute.
    expect(Object.keys(spec.paths['/articles'])).toEqual(expect.arrayContaining(['get', 'post']));
    expect(Object.keys(spec.paths['/articles/{id}'])).toEqual(
      expect.arrayContaining(['get', 'put', 'delete'])
    );
    const listSchema =
      spec.paths['/articles'].get.responses['200'].content['application/json'].schema;
    expect(listSchema.properties.data.items.properties.title).toMatchObject({ type: 'string' });

    // The routes of the plugins every app has (i18n and users-permissions).
    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining([
        '/i18n/locales',
        '/auth/local',
        '/auth/local/register',
        '/auth/{provider}/callback',
        '/users',
        '/users/{id}',
      ])
    );
  });

  it('prints debug logs when DEBUG matches the OpenAPI namespaces', async () => {
    // The sub-loggers are strapi:core:openapi:<section>.
    const result = await generate('openapi-debug.json', { DEBUG: 'strapi:core:openapi*' });

    expect(result.code, result.output).toBe(0);
    expect(result.stderr).toMatch(/strapi:core:openapi:generator/);
    expect(result.stderr).toMatch(/generating a new OpenAPI document/);
  });
});
