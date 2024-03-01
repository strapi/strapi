/**
 * Disconnect relations:
 *  { disconnect: [ { id } ] }
 *  { disconnect: [ id ] }
 */

import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../../../utils/builder-helper';
import resources from '../../resources/index';

describe('Disconnect disconnect', () => {
  let testUtils;
  let strapi: Core.LoadedStrapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  // { disconnect: [ id ] }
  it.todo('Can disconnect with shorthand syntax');

  // { disconnect: [ { id } ] }
  it.todo('Can disconnect with longhand syntax');
});
