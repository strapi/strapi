import { enable } from '../first-published-at';

describe('Migration - First Published At', () => {
  beforeAll(() => {
    global.strapi = {
      db: {
        transaction: jest.fn((cb) => cb()),
        query: jest.fn(),
        connection: {
          ref: jest.fn((value) => ({ test: value })),
        },
        queryBuilder: jest.fn(() => ({
          update: jest.fn(() => ({
            where: jest.fn(() => ({
              transacting: jest.fn(() => ({
                execute: jest.fn(),
              })),
            })),
          })),
        })),
      },
    } as any;
  });

  test('No change in FPA field', async () => {
    const oldContentType = {
      options: {
        firstPublishedAtField: false,
        draftAndPublish: true,
      },
    };
    const contentType = {
      options: {
        firstPublishedAtField: false,
        draftAndPublish: true,
      },
    };

    await enable({
      oldContentTypes: { test: oldContentType as any },
      contentTypes: { test: contentType as any },
    });

    expect(strapi.db.queryBuilder).not.toHaveBeenCalled();
  });

  test('Change in FPA field', async () => {
    const oldContentType = {
      options: {
        firstPublishedAtField: false,
        draftAndPublish: true,
      },
    };
    const contentType = {
      options: {
        firstPublishedAtField: true,
        draftAndPublish: true,
      },
    };

    await enable({
      oldContentTypes: { test: oldContentType as any },
      contentTypes: { test: contentType as any },
    });

    expect(strapi.db.queryBuilder).toHaveBeenCalled();
  });
});
