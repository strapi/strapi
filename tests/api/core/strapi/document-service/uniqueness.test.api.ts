import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { ARTICLE_UID, CATEGORY_UID, Category } from './utils';

describe('Document Service', () => {
  let testUtils;
  let strapi: Core.Strapi;

  let testName;
  let createdCategory;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
    testName = testUtils.data.category[0].name;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Scalar unique fields', () => {
    it('cannot create a document with a duplicated unique field value in the same publication state', async () => {
      expect(async () => {
        await strapi.documents(CATEGORY_UID).create({
          data: { name: testName },
        });
      }).rejects.toThrow();
    });

    it('cannot update a document to have a duplicated unique field value in the same publication state', async () => {
      const uniqueName = `${testName}-1`;

      const category: Category = await strapi.documents(CATEGORY_UID).create({
        data: { name: uniqueName },
      });
      createdCategory = category;

      expect(async () => {
        await strapi.documents(CATEGORY_UID).update({
          documentId: category.documentId,
          data: { name: testName },
        });
      }).rejects.toThrow();
    });

    it('cannot publish a document to have a duplicated unique field value in the same publication state', async () => {
      const name = `unique-name`;

      const category = await strapi.documents(CATEGORY_UID).create({ data: { name } });

      // Publish that category
      const publishRes = strapi
        .documents(CATEGORY_UID)
        .publish({ documentId: category.documentId });
      await expect(publishRes).resolves.not.toThrowError();

      // Reset the name of the draft category
      await strapi
        .documents(CATEGORY_UID)
        .update({ documentId: category.documentId, data: { name: 'other-not-unique-name' } });

      // Now we can create a new category with the same name as the published category
      // When we try to publish it, it should throw an error
      const newCategory = await strapi.documents(CATEGORY_UID).create({ data: { name } });
      expect(
        strapi.documents(CATEGORY_UID).publish({ documentId: newCategory.documentId })
      ).rejects.toThrow();
    });
  });

  describe('Component unique fields', () => {
    const uniqueTextShort = 'unique-text-short';
    const uniqueTextLong = 'This is a unique long text used for testing purposes.';
    const uniqueNumberInteger = 42;
    const uniqueNumberDecimal = 3.14;
    const uniqueNumberBigInteger = 1234567890123;
    const uniqueNumberFloat = 6.28318;
    const uniqueEmail = 'unique@example.com';
    const uniqueDateDate = '2023-01-01';
    const uniqueDateDateTime = '2023-01-01T00:00:00.000Z';
    const uniqueDateTime = '12:00:00';

    const testValues = {
      ComponentTextShort: uniqueTextShort,
      ComponentTextLong: uniqueTextLong,
      ComponentNumberInteger: uniqueNumberInteger,
      ComponentNumberDecimal: uniqueNumberDecimal,
      ComponentNumberBigInteger: uniqueNumberBigInteger,
      ComponentNumberFloat: uniqueNumberFloat,
      ComponentEmail: uniqueEmail,
      ComponentDateDate: uniqueDateDate,
      ComponentDateDateTime: uniqueDateDateTime,
      ComponentDateTime: uniqueDateTime,
    };

    const otherLocale = 'fr';

    /**
     * Modifies the given value to ensure uniqueness based on the field type.
     * For 'Number' fields, it increments the value by a specified amount.
     * For 'Date' fields, it increments the last number found in the string representation of the date.
     * For other field types, it appends '-different' to the string representation of the value.
     */
    const modifyToDifferentValue = (
      field: string,
      currentValue: string | number,
      increment = 1
    ) => {
      if (field.includes('Number')) {
        return (currentValue as number) + increment;
      } else if (field.includes('Date')) {
        return (currentValue as string).replace(/(\d+)(?=\D*$)/, (match) => {
          const num = parseInt(match, 10) + increment;
          return num < 10 ? `0${num}` : num.toString();
        });
      }
      return `${currentValue}-different`;
    };

    for (const [field, value] of Object.entries(testValues)) {
      it(`cannot create multiple entities with the same unique ${field} value in the same locale and publication state`, async () => {
        // Create an article in the default locale and publish it
        const article = await strapi.documents(ARTICLE_UID).create({
          data: {
            identifiers: {
              nestedUnique: {
                [field]: value,
              },
            },
          },
        });
        await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

        // Create and publish an article in a different locale with the same
        // unique value as the first article
        const articleDifferentLocale = await strapi.documents(ARTICLE_UID).create({
          data: {
            identifiers: {
              nestedUnique: {
                [field]: value,
              },
            },
          },
          locale: otherLocale,
        });
        expect(articleDifferentLocale).toBeDefined();
        await strapi
          .documents(ARTICLE_UID)
          .publish({ documentId: articleDifferentLocale.documentId, locale: otherLocale });

        // Attempt to create another article in the default locale with the same unique value
        // The draft articles should collide and trigger a uniqueness error
        await expect(
          strapi.documents(ARTICLE_UID).create({
            data: {
              identifiers: {
                nestedUnique: {
                  [field]: value,
                },
              },
            },
          })
        ).rejects.toThrow('This attribute must be unique');

        const differentValue = modifyToDifferentValue(field, value);

        // Create an article in the same locale with a different unique value
        const secondArticle = await strapi.documents(ARTICLE_UID).create({
          data: {
            identifiers: {
              nestedUnique: {
                [field]: differentValue,
              },
            },
          },
        });
        expect(secondArticle).toBeDefined();
      });

      it(`cannot create an entity with repeated unique ${field} value within a repeatable component in the same locale and publication state`, async () => {
        // Attempt to create an article with the same unique value in a repeatable component.
        await expect(
          strapi.documents(ARTICLE_UID).create({
            data: {
              repeatableIdentifiers: [
                { nestedUnique: { [field]: value } },
                { nestedUnique: { [field]: value } },
              ],
            },
          })
        ).rejects.toThrow('2 errors occurred');

        let differentValue = modifyToDifferentValue(field, value);

        // Successfully create and publish an article with a unique value in a repeatable component and publish it.
        const firstArticle = await strapi.documents(ARTICLE_UID).create({
          data: {
            repeatableIdentifiers: [
              { nestedUnique: { [field]: value } },
              { nestedUnique: { [field]: differentValue } },
            ],
          },
        });
        expect(firstArticle).toBeDefined();
        await strapi.documents(ARTICLE_UID).publish({ documentId: firstArticle.documentId });

        // Successfully create and publish another article with the same unique value in a repeatable component in a different locale.
        const secondArticleDifferentLocale = await strapi.documents(ARTICLE_UID).create({
          data: {
            repeatableIdentifiers: [
              { nestedUnique: { [field]: differentValue } },
              { nestedUnique: { [field]: value } },
            ],
          },
          locale: otherLocale,
        });
        expect(secondArticleDifferentLocale).toBeDefined();

        differentValue = modifyToDifferentValue(field, differentValue);

        // Attempt to create another article with the same unique value in a repeatable component
        // This should fail because the value must be unique across all entries in the same locale.
        await expect(
          strapi.documents(ARTICLE_UID).create({
            data: {
              repeatableIdentifiers: [
                { nestedUnique: { [field]: differentValue } },
                { nestedUnique: { [field]: value } },
              ],
            },
          })
        ).rejects.toThrow('This attribute must be unique');

        differentValue = modifyToDifferentValue(field, differentValue);

        const secondArticleWithDifferentValues = await strapi.documents(ARTICLE_UID).create({
          data: {
            repeatableIdentifiers: [
              { nestedUnique: { [field]: differentValue } },
              {
                nestedUnique: {
                  [field]: modifyToDifferentValue(field, differentValue),
                },
              },
            ],
          },
        });

        // Verify that the article with different values was successfully created
        expect(secondArticleWithDifferentValues).toBeDefined();
      });
    }
  });
});
