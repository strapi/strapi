import type { App, Database } from '@strapi/tests-shared';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp, runStrapi, strapiVersion } from '../helpers';

let app: App;
let database: Database;

describe('version', () => {
  beforeAll(async () => {
    ({ app, database } = await createApp());
  });

  it.each([['version'], ['--version']])('`strapi %s` prints the Strapi version', async (arg) => {
    const result = await runStrapi(app, [arg], { database });

    expect(result.code, result.output).toBe(0);
    expect(result.stdout.trim()).toBe(strapiVersion());
  });
});
