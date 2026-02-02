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
    it('can create a draft document with a duplicated unique field value', async () => {
      await strapi.documents(CATEGORY_UID).create({
        data: { name: testName },
      });
    });

    it('can update a draft document to have a duplicated unique field value', async () => {
      const uniqueName = `${testName}-1`;

      const category: Category = await strapi.documents(CATEGORY_UID).create({
        data: { name: uniqueName },
      });
      createdCategory = category;

      await strapi.documents(CATEGORY_UID).update({
        documentId: category.documentId,
        data: { name: testName },
      });
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

    it('can save and publish multiple entries with an empty string in a unique field', async () => {
      // Create two categories with empty names (which is a unique field)
      const category = await strapi.documents(CATEGORY_UID).create({ data: { name: '' } });
      expect(category).toBeDefined();
      const category2 = await strapi.documents(CATEGORY_UID).create({ data: { name: '' } });
      expect(category2).toBeDefined();

      // Publish categories, no error should be thrown
      await strapi.documents(CATEGORY_UID).publish({ documentId: category.documentId });
      await strapi.documents(CATEGORY_UID).publish({ documentId: category2.documentId });
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
      options: { increment?: number; suffix?: string } = {
        increment: 1,
        suffix: 'different',
      }
    ) => {
      if (field.includes('Number')) {
        return (currentValue as number) + options.increment;
      }

      if (field.includes('Date')) {
        return (currentValue as string).replace(/(\d+)(?=\D*$)/, (match) => {
          const num = parseInt(match, 10) + options.increment;
          return num < 10 ? `0${num}` : num.toString();
        });
      }

      return `${currentValue}-${options.suffix}`;
    };

    type TestCase = {
      description: string;
      createData: (field: string, value: string | number, repeatTheSameValue?: boolean) => any;
    };

    for (const [field, value] of Object.entries(testValues)) {
      // We want to test the behaviour of component unique fields in different
      // contexts: component, repeatable component, and dynamic zones.
      const testCases: TestCase[] = [
        {
          description: 'identifiers',
          createData: (field, value) => ({ identifiers: { nestedUnique: { [field]: value } } }),
        },
        {
          description: 'repeatableIdentifiers',
          createData: (field, value, repeatTheSameValue = false) => ({
            repeatableIdentifiers: [
              { nestedUnique: { [field]: value } },
              {
                nestedUnique: {
                  [field]: repeatTheSameValue ? value : modifyToDifferentValue(field, value),
                },
              },
            ],
          }),
        },
        {
          description: 'identifiersDz',
          createData: (field, value) => ({
            identifiersDz: [{ __component: 'article.compo-unique-all', [field]: value }],
          }),
        },
      ];

      for (const { description, createData } of testCases) {
        it(`cannot create multiple entities with the same unique ${field} value in the same ${description}, locale and publication state`, async () => {
          const isRepeatable = description === 'repeatableIdentifiers';

          if (isRepeatable) {
            // When testing the repeatable component, we first need to ensure that the
            // unique field value must be unique within the current entity.
            const createdArticle = await strapi.documents(ARTICLE_UID).create({
              data: createData(field, value, true),
            });

            await expect(
              strapi.documents(ARTICLE_UID).publish({
                documentId: createdArticle.documentId,
              })
            ).rejects.toThrow('2 errors occurred');
          }

          // Create an article in the default locale and publish it.
          const article = await strapi.documents(ARTICLE_UID).create({
            data: createData(field, value),
          });
          await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

          // Create and publish an article in a different locale with the same
          // unique value as the first article. This should succeed as
          // validation only occurs within the same locale.
          const articleDifferentLocale = await strapi.documents(ARTICLE_UID).create({
            data: createData(field, value),
            locale: otherLocale,
          });

          expect(articleDifferentLocale).toBeDefined();
          await strapi
            .documents(ARTICLE_UID)
            .publish({ documentId: articleDifferentLocale.documentId, locale: otherLocale });

          // Attempt to create another article in the default locale with the same unique value.
          // The draft articles should collide and NOT trigger a uniqueness error, as this is a draft
          const createdArticle = await strapi.documents(ARTICLE_UID).create({
            data: isRepeatable
              ? // In testing the repeatable we now want to test that it is
                // validated against other entities and don't want to trigger a
                // validation error internal to the current entity.
                {
                  [description]: [createData(field, value)[description][0]],
                }
              : createData(field, value),
          });

          // Attempt to publish the draft article with the same unique value.
          // This should trigger a uniqueness error as the published article has the same value.
          await expect(
            strapi.documents(ARTICLE_UID).publish({ documentId: createdArticle.documentId })
          ).rejects.toThrow('This attribute must be unique');

          const modificationOptions = isRepeatable
            ? // When creating the first article with a repeatable field, we
              // already applied modifications to the value to ensure
              // uniqueness.
              // Here we want to apply a different modification to the value to
              // avoid collisions with the first article.
              {
                increment: 10,
                suffix: 'new-suffix',
              }
            : undefined;
          const differentValue = modifyToDifferentValue(field, value, modificationOptions);

          // Create an article in the same locale with a different unique value.
          const secondArticle = await strapi.documents(ARTICLE_UID).create({
            data: createData(field, differentValue),
          });
          expect(secondArticle).toBeDefined();
        });
      }
    }
  });
});
