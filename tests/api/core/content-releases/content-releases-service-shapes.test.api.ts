/**
 * Compares the runtime shape of the `plugin::content-releases.release` and
 * `plugin::content-releases.release-action` service results with their types under strict types.
 * `probe.ts` makes the calls an application makes; each result's runtime shape must match the type
 * of its variable, read from a strict program over the built declarations
 * (`tests/api/utils/shapes.ts`). Build the packages first. The services need the
 * `cms-content-releases` license feature, so the test runs in EE only.
 */
import path from 'node:path';
import { createStrapiInstance } from 'api-tests/strapi';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition } from 'api-tests/utils';
import type { Core } from '@strapi/types';
import { compareShapes, describeShape, typedShapes } from '../../utils/shapes';
import { probeContentReleasesServices, resultNames } from './content-releases-service-shapes/probe';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const probeFile = path.join(__dirname, 'content-releases-service-shapes/probe.ts');

const productUID = 'api::shapes-product.shapes-product';
const model = {
  draftAndPublish: true,
  singularName: 'shapes-product',
  pluralName: 'shapes-products',
  displayName: 'Shapes product',
  kind: 'collectionType',
  attributes: {
    name: { type: 'string' },
  },
};

describeOnCondition(edition === 'EE')('Content releases service result shapes (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;

  beforeAll(async () => {
    await builder.addContentTypes([model]).build();
    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.db.query(productUID).deleteMany({});
    await strapi.destroy();
    await builder.cleanup();
  });

  test('each result matches the type an application reads with strict types', async () => {
    const [first, second] = await Promise.all([
      strapi.documents(productUID).create({ data: { name: 'First' } }),
      strapi.documents(productUID).create({ data: { name: 'Second' } }),
    ]);
    const results = await probeContentReleasesServices(strapi, `${Date.now()}`, {
      contentType: productUID,
      documentIds: [first.documentId, second.documentId],
    });
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
