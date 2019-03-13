const Query = require('../lib/query');

const bookshelfQueryInstance = {
  find: jest.fn(),
  count: jest.fn(),
  thru: jest.fn(),
  where: jest.fn(),
  populate: jest.fn(),
  execute: jest.fn(),
};

const mongooseQueryInstance = {
  find: jest.fn(),
  count: jest.fn(),
  thru: jest.fn(),
  where: jest.fn(),
  populate: jest.fn(),
  execute: jest.fn(),
};

describe('Query', () => {
  test('Returns an instance of the right orm Query builder', () => {
    const strapi = {
      hook: {
        bookshelf: {
          load() {
            return {
              Query: function(model) {
                return bookshelfQueryInstance;
              },
            };
          },
        },
        mongoose: {
          load() {
            return {
              Query: function(model) {
                return mongooseQueryInstance;
              },
            };
          },
        },
      },
    };

    const bookShelfQuery = new Query(
      {
        orm: 'bookshelf',
      },
      { strapi }
    );

    expect(bookShelfQuery).toBe(bookshelfQueryInstance);
    expect(bookShelfQuery).not.toBe(mongooseQueryInstance);

    const mongooseQuery = new Query(
      {
        orm: 'mongoose',
      },
      { strapi }
    );

    expect(mongooseQuery).toBe(mongooseQueryInstance);
    expect(mongooseQuery).not.toBe(bookshelfQueryInstance);
  });
});
