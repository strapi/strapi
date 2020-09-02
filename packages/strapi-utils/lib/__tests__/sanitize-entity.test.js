'use strict';

const _ = require('lodash');
const sanitizeEntity = require('../sanitize-entity');

describe('Sanitize Entity', () => {
  const input = {
    email: 'foo@bar.com',
    firstname: 'foo',
    lastname: 'bar',
    password: 'qwerty',
  };

  const article = {
    name: 'foobar',
    content: 'lorem ipsum',
    secret: 'very-secret',
  };

  const inputWithRelation = {
    ...input,
    article,
  };

  const inputWithDz = {
    ...input,
    dz: [
      {
        __component: 'article',
        name: 'foo',
        content: 'bar',
        secret: 'secret-foobar',
      },
    ],
  };

  const userModel = {
    primaryKey: 'id',
    options: {
      timestamps: ['created_at', 'updated_at'],
    },
    attributes: {
      email: {
        type: 'text',
        private: true,
      },
      firstname: {
        type: 'text',
      },
      lastname: {
        type: 'text',
      },
      password: {
        type: 'password',
      },
    },
  };

  const userRelModel = {
    ...userModel,
    attributes: {
      ...userModel.attributes,
      article: {
        collection: 'article',
      },
    },
  };

  const userDzModel = {
    ...userModel,
    attributes: {
      ...userModel.attributes,
      dz: {
        type: 'dynamiczone',
        components: ['article'],
      },
    },
  };

  const articleModel = {
    primaryKey: 'id',
    options: {
      timestamps: ['created_at', 'updated_at'],
    },
    attributes: {
      name: {
        type: 'text',
      },
      content: {
        type: 'text',
      },
      secret: {
        type: 'text',
        private: true,
      },
    },
  };

  const models = {
    user: userModel,
    article: articleModel,
    userRel: userRelModel,
    userDz: userDzModel,
  };

  global.strapi = {
    getModel(name) {
      return models[name];
    },
  };

  describe('Basic', () => {
    const tests = [
      [
        { withPrivate: false, isOutput: true, includeFields: null },
        _.pick(input, ['firstname', 'lastname']),
      ],
      [{ withPrivate: false, isOutput: false, includeFields: null }, input],
      [
        { withPrivate: false, isOutput: true, includeFields: ['firstname'] },
        _.pick(input, ['firstname']),
      ],
      [
        { withPrivate: false, isOutput: true, includeFields: ['email', 'firstname'] },
        _.pick(input, ['firstname']),
      ],
      [{ withPrivate: false, isOutput: true, includeFields: ['password'] }, {}],
      [
        { withPrivate: true, isOutput: true, includeFields: null },
        _.pick(input, ['email', 'firstname', 'lastname']),
      ],
      [{ withPrivate: true, isOutput: false, includeFields: null }, input],
      [
        { withPrivate: true, isOutput: true, includeFields: ['firstname'] },
        _.pick(input, ['firstname']),
      ],
      [
        { withPrivate: true, isOutput: true, includeFields: ['email', 'firstname'] },
        _.pick(input, ['email', 'firstname']),
      ],
      [{ withPrivate: true, isOutput: true, includeFields: ['password'] }, {}],
      [
        { withPrivate: true, isOutput: false, includeFields: ['firstname'] },
        _.pick(input, ['firstname']),
      ],
      [
        { withPrivate: true, isOutput: false, includeFields: ['email', 'firstname'] },
        _.pick(input, ['email', 'firstname']),
      ],
      [
        { withPrivate: true, isOutput: false, includeFields: ['password'] },
        _.pick(input, ['password']),
      ],
    ];

    test.each(tests)(`Test n°%#`, (options, expected) => {
      const { user: model } = models;
      expect(sanitizeEntity(input, { ...options, model })).toStrictEqual(expected);
    });
  });

  describe('With relation', () => {
    const tests = [
      [
        inputWithRelation,
        { withPrivate: false, isOutput: true, includeFields: null },
        {
          ..._.pick(inputWithRelation, ['firstname', 'lastname']),
          article: _.pick(inputWithRelation.article, ['name', 'content']),
        },
      ],
      [
        inputWithRelation,
        { withPrivate: false, isOutput: true, includeFields: ['firstname', 'lastname'] },
        _.pick(inputWithRelation, ['firstname', 'lastname']),
      ],
      [
        inputWithRelation,
        { withPrivate: false, isOutput: true, includeFields: ['article'] },
        {
          article: _.pick(inputWithRelation.article, ['name', 'content']),
        },
      ],
      [
        inputWithRelation,
        { withPrivate: false, isOutput: true, includeFields: ['article.name'] },
        _.pick(inputWithRelation, ['article.name']),
      ],
      [
        inputWithRelation,
        { withPrivate: true, isOutput: true, includeFields: null },
        _.pick(inputWithRelation, ['email', 'firstname', 'lastname', 'article']),
      ],
      [
        { ...inputWithRelation, article: _.times(3, () => _.clone(article)) },
        { withPrivate: false, isOutput: true, includeFields: null },
        {
          ..._.pick(inputWithRelation, 'firstname', 'lastname'),
          article: _.times(3, () => _.pick(article, ['name', 'content'])),
        },
      ],
    ];

    test.each(tests)(`Test n°%#`, (source, options, expected) => {
      const { userRel: model } = models;
      expect(sanitizeEntity(source, { ...options, model })).toStrictEqual(expected);
    });
  });

  describe('With Dynamic Zone', () => {
    test('Dynamic zone null', () => {
      const { userDz: model } = models;
      const dataSource = { ...inputWithDz, dz: null };

      const expected = _.pick(dataSource, ['firstname', 'lastname', 'dz']);

      expect(sanitizeEntity(dataSource, { model })).toStrictEqual(expected);
    });

    test('Dynamic zone with a basic component', () => {
      const { userDz: model } = models;

      const expected = {
        ..._.pick(inputWithDz, ['firstname', 'lastname']),
        dz: inputWithDz.dz.map(comp => _.pick(comp, ['__component', 'name', 'content'])),
      };

      expect(sanitizeEntity(inputWithDz, { model })).toStrictEqual(expected);
    });
  });

  describe('Edge cases', () => {
    test('It returns null if the model is nil', () => {
      expect(sanitizeEntity(input, { model: null })).toBeNull();
      expect(sanitizeEntity(input, { model: undefined })).toBeNull();
    });

    test(`It returns the input data as-is if it's not an object or an array`, () => {
      const { user: model } = models;
      expect(sanitizeEntity('foobar', { model })).toBe('foobar');
      expect(sanitizeEntity(undefined, { model })).toBeUndefined();
      expect(sanitizeEntity(null, { model })).toBeNull();
    });

    test('It sanitizes all entries if the input is an array', () => {
      const dataSource = [_.clone(input), _.clone(input)];

      const expected = [
        _.pick(input, 'firstname', 'lastname'),
        _.pick(input, 'firstname', 'lastname'),
      ];

      const { user: model } = models;

      expect(sanitizeEntity(dataSource, { model })).toStrictEqual(expected);
    });

    test(`It should put the relation value as-is if it's nil'`, () => {
      const dataSource = { ...inputWithRelation, article: null };
      const expected = _.omit(dataSource, ['email', 'password']);

      const { userRel: model } = models;

      expect(sanitizeEntity(dataSource, { model })).toStrictEqual(expected);
    });

    test(`It should make sure that legacy data parsing returns an object`, () => {
      const dataSource = {
        toJSON: jest.fn(() => input),
      };

      const invalidDataSource = {
        toJSON: jest.fn(() => null),
      };

      const { user: model } = models;

      expect(sanitizeEntity(dataSource, { model })).toStrictEqual(
        _.omit(input, ['email', 'password'])
      );
      expect(dataSource.toJSON).toHaveBeenCalled();

      expect(sanitizeEntity(invalidDataSource, { model })).toBeNull();
      expect(invalidDataSource.toJSON).toHaveBeenCalled();
    });

    test('It should handle custom fields', () => {
      const dataSource = { ...input, foo: 'bar' };
      const expected = _.omit(dataSource, ['email', 'password']);
      const { user: model } = models;

      expect(sanitizeEntity(dataSource, { model })).toStrictEqual(expected);
    });
  });
});
