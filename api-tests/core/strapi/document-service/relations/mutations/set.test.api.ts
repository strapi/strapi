/**
 * Set relations:
 *  { set: [ { id } ] }
 *  { set: [ id ] }
 *  [ id ]
 *  [ { id } ]
 */

import { LoadedStrapi } from '@strapi/types';
import { createTestSetup, destroyTestSetup } from '../../../../../utils/builder-helper';
import resources from '../../resources/index';

describe('Set disconnect', () => {
  let testUtils;
  let strapi: LoadedStrapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  // { set: [ id ] }
  it.todo('Can set with shorthand syntax');

  // { set: [ { id } ] }
  it.todo('Can set with longhand syntax');

  // [ id ]
  it.todo('Can set with array shorthand syntax');

  // [ { id } ]
  it.todo('Can set with array longhand syntax');
});
