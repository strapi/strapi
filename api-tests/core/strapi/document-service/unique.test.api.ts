import { LoadedStrapi } from '@strapi/types';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { AUTHOR_UID } from './utils';

describe('Document Service', () => {
  let testUtils;
  let strapi: LoadedStrapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Unique fields', () => {
    it('tests document unique field values across the same publication state', async () => {
      const valueToTest = 'Author';
      const author = await strapi.documents(AUTHOR_UID).create({
        data: { name: valueToTest },
      });

      expect(author).toMatchObject({
        name: valueToTest,
        publishedAt: null,
      });

      // At this point we should not be able to repeat the unique field value as there is a draft author using the same value
      expect(async () => {
        await strapi.documents(AUTHOR_UID).create({
          data: { name: valueToTest },
        });
      }).rejects.toThrow();

      // Publish the original author
      const publishRes = strapi.documents(AUTHOR_UID).publish(author.documentId);
      await expect(publishRes).resolves.not.toThrowError();

      // Now we have both a draft and a published author with the same unique field value
      // We should be able to create a new author with a new unique field value and publish it
      const newValueToTest = `${valueToTest}-1`;

      const author2 = await strapi.documents(AUTHOR_UID).create({
        data: { name: newValueToTest },
      });

      expect(author2).toMatchObject({
        name: newValueToTest,
        publishedAt: null,
      });

      const publishRes2 = strapi.documents(AUTHOR_UID).publish(author2.documentId);
      await expect(publishRes2).resolves.not.toThrowError();
    });
  });
});
