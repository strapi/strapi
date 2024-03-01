/**
 * Connect relations:
 *  { connect: [ { id } ] }
 *  { connect: [ id ] }
 *  { connect: [ {
 *      id,
 *      position: {
 *        before: id,
 *        after: id,
 *        start: boolean,
 *        end: boolean
 *      }
 *  }]}
 */

import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../../../utils/builder-helper';
import resources from '../../resources/index';

describe('Connect relations', () => {
  let testUtils;
  let strapi: Core.LoadedStrapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  // { connect: [ id ] }
  it.todo('Can connect with shorthand syntax');

  // { connect: [ { id } ] }
  it.todo('Can connect with longhand syntax');

  // { connect: [ { id, position: { before: id } } ] }
  it.todo('Can connect with position before');

  // { connect: [ { id, position: { after: id } } ] }
  it.todo('Can connect with position after');
});
