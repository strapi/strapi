/**
 * Compares the runtime shape of the `admin::role`, `admin::user`, `admin::permission` and
 * `admin::api-token` service results with their types under strict types. `probe.ts` makes the calls
 * an application makes; each result's runtime shape must match the type of its variable, read from a
 * strict program over the built declarations (`tests/api/utils/shapes.ts`). Build the packages first.
 */
import path from 'node:path';
import { createStrapiInstance } from 'api-tests/strapi';
import type { Core } from '@strapi/types';
import { compareShapes, describeShape, typedShapes } from '../../utils/shapes';
import { probeAdminServices, resultNames } from './admin-service-shapes/probe';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const probeFile = path.join(__dirname, 'admin-service-shapes/probe.ts');

describe(`Admin service result shapes (api, ${edition})`, () => {
  let strapi: Core.Strapi;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('each result matches the type an application reads with strict types', async () => {
    const results = await probeAdminServices(strapi, `${Date.now()}`);
    const runtime = Object.fromEntries(
      Object.entries(results).map(([name, value]) => [name, describeShape(value)])
    );
    const { shapes, errors } = typedShapes(probeFile, [...resultNames]);

    expect(errors).toEqual([]);
    expect(Object.keys(shapes).sort()).toEqual([...resultNames].sort());
    const rows = compareShapes(shapes, runtime);
    // Runtime keys the type leaves out (`untyped-key`) are allowed: a type may omit a key.
    expect(rows.filter((row) => row.verdict !== 'ok' && row.verdict !== 'untyped-key')).toEqual([]);
  });
});
