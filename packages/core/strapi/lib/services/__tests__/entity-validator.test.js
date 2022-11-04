'use strict';

const { sample } = require('lodash');
const { ValidationError } = require('@strapi/utils').errors;

const entityValidator = require('../entity-validator');

describe('Entity validator', () => {
  describe('Published input', () => {
    describe('General Errors', () => {
      let model;
      global.strapi = {
        errors: {
          badRequest: jest.fn(),
        },
        getModel: () => model,
      };

      it('Throws a badRequest error on invalid input', async () => {
        model = {
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: 1234 };

        expect.hasAssertions();

        try {
          await entityValidator.validateEntityCreation(model, input);
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be a `string` type, but the final value was: `1234`.',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be a `string` type, but the final value was: `1234`.',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }
      });

      it('Returns data on valid input', async () => {
        model = {
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: 'test Title' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input);
        expect(data).toEqual(input);
      });

      it('Returns casted data when possible', async () => {
        model = {
          attributes: {
            title: {
              type: 'string',
            },
            number: {
              type: 'integer',
            },
          },
        };

        const input = { title: 'Test', number: '123' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input);
        expect(data).toEqual({
          title: 'Test',
          number: 123,
        });
      });

      test('Throws on required not respected', async () => {
        model = {
          attributes: {
            title: {
              type: 'string',
              required: true,
            },
          },
        };

        expect.hasAssertions();

        try {
          await entityValidator.validateEntityCreation(model, {});
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be defined.',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be defined.',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }

        try {
          await entityValidator.validateEntityCreation(model, { title: null });
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be a `string` type, but the final value was: `null`.',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be a `string` type, but the final value was: `null`.',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }
      });

      it('Supports custom field types', async () => {
        model = {
          attributes: {
            uuid: {
              type: 'uuid',
            },
          },
        };

        const input = { uuid: '2479d6d7-2497-478d-8a34-a9e8ce45f8a7' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input);
        expect(data).toEqual({
          uuid: '2479d6d7-2497-478d-8a34-a9e8ce45f8a7',
        });
      });
    });

    describe('String validator', () => {
      test('Throws on min length not respected', async () => {
        global.strapi = {
          errors: {
            badRequest: jest.fn(),
          },
          getModel: () => model,
        };

        const model = {
          attributes: {
            title: {
              type: 'string',
              minLength: 10,
            },
          },
        };

        const input = { title: 'tooSmall' };

        expect.hasAssertions();

        try {
          await entityValidator.validateEntityCreation(model, input);
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be at least 10 characters',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be at least 10 characters',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }
      });

      test('Throws on max length not respected', async () => {
        const model = {
          attributes: {
            title: {
              type: 'string',
              maxLength: 2,
            },
          },
        };

        const input = { title: 'tooLong' };

        expect.hasAssertions();

        try {
          await entityValidator.validateEntityCreation(model, input);
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be at most 2 characters',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be at most 2 characters',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }
      });

      test('Allows empty strings even when required', async () => {
        const model = {
          attributes: {
            title: {
              type: 'string',
              required: true,
            },
          },
        };

        const input = { title: '' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input);
        expect(data).toEqual(input);
      });

      test('Assign default values', async () => {
        const model = {
          attributes: {
            title: {
              type: 'string',
              required: true,
              default: 'New',
            },
            type: {
              type: 'string',
              default: 'test',
            },
            testDate: {
              type: 'date',
              required: true,
              default: '2020-04-01T04:00:00.000Z',
            },
            testJSON: {
              type: 'date',
              required: true,
              default: {
                foo: 1,
                bar: 2,
              },
            },
          },
        };

        await expect(entityValidator.validateEntityCreation(model, {})).resolves.toMatchObject({
          title: 'New',
          type: 'test',
          testDate: '2020-04-01T04:00:00.000Z',
          testJSON: {
            foo: 1,
            bar: 2,
          },
        });
      });

      test("Don't assign default value if empty string", async () => {
        const model = {
          attributes: {
            title: {
              type: 'string',
              required: true,
              default: 'default',
            },
            content: {
              type: 'string',
              default: 'default',
            },
          },
        };

        await expect(
          entityValidator.validateEntityCreation(model, {
            title: '',
            content: '',
          })
        ).resolves.toMatchObject({
          title: '',
          content: '',
        });
      });
    });
  });

  describe('Draft input', () => {
    describe('General Errors', () => {
      it('Throws a badRequest error on invalid input', async () => {
        global.strapi = {
          errors: {
            badRequest: jest.fn(),
          },
          getModel: () => model,
        };

        const model = {
          uid: 'api::test.test',
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: 1234 };

        expect.hasAssertions();

        try {
          await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be a `string` type, but the final value was: `1234`.',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be a `string` type, but the final value was: `1234`.',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }
      });

      it('Returns data on valid input', async () => {
        const model = {
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: 'test Title' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        expect(data).toEqual(input);
      });

      it('Returns casted data when possible', async () => {
        const model = {
          attributes: {
            title: {
              type: 'string',
            },
            number: {
              type: 'integer',
            },
          },
        };

        const input = { title: 'Test', number: '123' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        expect(data).toEqual({
          title: 'Test',
          number: 123,
        });
      });

      test('Does not throws on required not respected', async () => {
        const model = {
          attributes: {
            title: {
              type: 'string',
              required: true,
            },
          },
        };

        expect.hasAssertions();

        let data = await entityValidator.validateEntityCreation(model, {}, { isDraft: true });
        expect(data).toEqual({});

        data = await entityValidator.validateEntityCreation(
          model,
          { title: null },
          { isDraft: true }
        );
        expect(data).toEqual({ title: null });
      });

      it('Supports custom field types', async () => {
        const model = {
          attributes: {
            uuid: {
              type: 'uuid',
            },
          },
        };

        const input = { uuid: '2479d6d7-2497-478d-8a34-a9e8ce45f8a7' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        expect(data).toEqual({
          uuid: '2479d6d7-2497-478d-8a34-a9e8ce45f8a7',
        });
      });
    });

    describe('String validator', () => {
      test('Does not throws on min length not respected', async () => {
        const model = {
          attributes: {
            title: {
              type: 'string',
              minLength: 10,
            },
          },
        };

        global.strapi = {
          errors: {
            badRequest: jest.fn(),
          },
          getModel: () => model,
        };

        const input = { title: 'tooSmall' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        expect(data).toEqual(input);
      });

      test('Throws on max length not respected', async () => {
        const model = {
          attributes: {
            title: {
              type: 'string',
              maxLength: 2,
            },
          },
        };

        const input = { title: 'tooLong' };

        expect.hasAssertions();

        try {
          await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        } catch (e) {
          expect(e).toMatchObject({
            name: 'ValidationError',
            message: 'title must be at most 2 characters',
            details: {
              errors: [
                {
                  path: ['title'],
                  message: 'title must be at most 2 characters',
                  name: 'ValidationError',
                },
              ],
            },
          });
        }
      });

      test('Allows empty strings even when required', async () => {
        const model = {
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: '' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntityCreation(model, input, { isDraft: true });
        expect(data).toEqual(input);
      });

      test('Assign default values', async () => {
        const model = {
          attributes: {
            title: {
              type: 'string',
              required: true,
              default: 'New',
            },
            type: {
              type: 'string',
              default: 'test',
            },
            testDate: {
              type: 'date',
              required: true,
              default: '2020-04-01T04:00:00.000Z',
            },
            testJSON: {
              type: 'date',
              required: true,
              default: {
                foo: 1,
                bar: 2,
              },
            },
          },
        };

        await expect(
          entityValidator.validateEntityCreation(model, {}, { isDraft: true })
        ).resolves.toMatchObject({
          title: 'New',
          type: 'test',
          testDate: '2020-04-01T04:00:00.000Z',
          testJSON: {
            foo: 1,
            bar: 2,
          },
        });
      });

      test("Don't assign default value if empty string", async () => {
        const model = {
          attributes: {
            title: {
              type: 'string',
              required: true,
              default: 'default',
            },
            content: {
              type: 'string',
              default: 'default',
            },
          },
        };

        await expect(
          entityValidator.validateEntityCreation(
            model,
            {
              title: '',
              content: '',
            },
            { isDraft: true }
          )
        ).resolves.toMatchObject({
          title: '',
          content: '',
        });
      });
    });
  });

  /**
   * Test that relations can be successfully validated and non existent relations
   * can be detected at every possible level: Attribute, Single/Repeatable
   * Component, Media or Dynamic Zone.
   */
  describe('Relations', () => {
    const models = new Map();
    models.set('api::dev.dev', {
      kind: 'collectionType',
      collectionName: 'devs',
      modelType: 'contentType',
      modelName: 'dev',
      connection: 'default',
      uid: 'api::dev.dev',
      apiName: 'dev',
      globalId: 'Dev',
      info: {
        singularName: 'dev',
        pluralName: 'devs',
        displayName: 'Dev',
        description: '',
      },
      attributes: {
        categories: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::category.category',
          inversedBy: 'devs',
        },
        sCom: {
          type: 'component',
          repeatable: false,
          component: 'basic.dev-compo',
        },
        rCom: {
          type: 'component',
          repeatable: true,
          component: 'basic.dev-compo',
        },
        DZ: {
          type: 'dynamiczone',
          components: ['basic.dev-compo'],
        },
        media: {
          allowedTypes: ['images', 'files', 'videos', 'audios'],
          type: 'media',
          multiple: true,
        },
        createdAt: {
          type: 'datetime',
        },
        updatedAt: {
          type: 'datetime',
        },
        publishedAt: {
          type: 'datetime',
          configurable: false,
          writable: true,
          visible: false,
        },
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
        },
        updatedBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          configurable: false,
          writable: false,
          visible: false,
          useJoinTable: false,
          private: true,
        },
      },
    });
    models.set('api::category.category', {
      kind: 'collectionType',
      collectionName: 'categories',
      modelType: 'contentType',
      modelName: 'category',
      connection: 'default',
      uid: 'api::category.category',
      apiName: 'category',
      globalId: 'Category',
      info: {
        displayName: 'Category',
        singularName: 'category',
        pluralName: 'categories',
        description: '',
        name: 'Category',
      },
      attributes: {
        name: {
          type: 'string',
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
        },
      },
    });
    models.set('basic.dev-compo', {
      collectionName: 'components_basic_dev_compos',
      uid: 'basic.dev-compo',
      category: 'basic',
      modelType: 'component',
      modelName: 'dev-compo',
      globalId: 'ComponentBasicDevCompo',
      info: {
        displayName: 'DevCompo',
        icon: 'allergies',
      },
      attributes: {
        categories: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::category.category',
        },
      },
    });
    models.set('plugin::upload.file', {
      collectionName: 'files',
      info: {
        singularName: 'file',
        pluralName: 'files',
        displayName: 'File',
        description: '',
      },
      attributes: {
        name: {
          type: 'string',
          configurable: false,
          required: true,
        },
      },
      kind: 'collectionType',
      modelType: 'contentType',
      modelName: 'file',
      connection: 'default',
      uid: 'plugin::upload.file',
      plugin: 'upload',
      globalId: 'UploadFile',
    });

    const IDsThatExist = [1, 2, 3, 4, 5, 6];
    const nonExistentIDs = [10, 11, 12, 13, 14, 15, 16];
    const strapi = {
      components: {
        'basic.dev-compo': {},
      },
      db: {
        query() {
          return {
            count: ({
              where: {
                id: { $in },
              },
            }) => IDsThatExist.filter((value) => $in.includes(value)).length,
          };
        },
      },
      errors: {
        badRequest: jest.fn(),
      },
      getModel: (uid) => models.get(uid),
    };

    describe('Attribute', () => {
      describe('Success', () => {
        const testData = [
          [
            'Connect',
            {
              categories: {
                disconnect: [],
                connect: [
                  {
                    id: sample(IDsThatExist),
                  },
                ],
              },
            },
          ],
          [
            'Set',
            {
              categories: {
                set: [
                  {
                    id: sample(IDsThatExist),
                  },
                ],
              },
            },
          ],
          [
            'Number',
            {
              categories: sample(IDsThatExist),
            },
          ],
          [
            'Array',
            {
              categories: IDsThatExist.slice(-Math.floor(IDsThatExist.length / 2)),
            },
          ],
        ];
        test.each(testData)('%s', async (__, input = {}) => {
          global.strapi = strapi;
          const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
            isDraft: true,
          });
          await expect(res).resolves.not.toThrowError();
        });
      });

      describe('Error', () => {
        const expectError = new ValidationError(
          `2 relation(s) of type api::category.category associated with this entity do not exist`
        );
        const testData = [
          [
            'Connect',
            {
              categories: {
                disconnect: [],
                connect: [sample(IDsThatExist), ...nonExistentIDs.slice(-2)].map((id) => ({
                  id,
                })),
              },
            },
          ],
          [
            'Set',
            {
              categories: {
                set: [sample(IDsThatExist), ...nonExistentIDs.slice(-2)].map((id) => ({ id })),
              },
            },
          ],
          [
            'Number',
            {
              categories: nonExistentIDs.slice(-2),
            },
          ],
        ];

        test.each(testData)('%s', async (__, input = {}) => {
          global.strapi = strapi;
          const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
            isDraft: true,
          });
          await expect(res).rejects.toThrowError(expectError);
        });
      });
    });

    describe('Single Component', () => {
      describe('Success', () => {
        const testData = [
          [
            'Connect',
            {
              sCom: {
                categories: {
                  disconnect: [],
                  connect: [
                    {
                      id: sample(IDsThatExist),
                    },
                  ],
                },
              },
            },
          ],
          [
            'Set',
            {
              sCom: {
                categories: {
                  set: [
                    {
                      id: sample(IDsThatExist),
                    },
                  ],
                },
              },
            },
          ],
          [
            'Number',
            {
              sCom: {
                categories: sample(IDsThatExist),
              },
            },
          ],
          [
            'Array',
            {
              sCom: {
                categories: IDsThatExist.slice(-3),
              },
            },
          ],
        ];

        test.each(testData)('%s', async (__, input = {}) => {
          global.strapi = strapi;
          const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
            isDraft: true,
          });
          await expect(res).resolves.not.toThrowError();
        });
      });

      describe('Error', () => {
        const expectedError = new ValidationError(
          `1 relation(s) of type api::category.category associated with this entity do not exist`
        );
        const testData = [
          [
            'Connect',
            {
              sCom: {
                categories: {
                  disconnect: [],
                  connect: [
                    {
                      id: sample(nonExistentIDs),
                    },
                  ],
                },
              },
            },
          ],
          [
            'Set',
            {
              sCom: {
                categories: {
                  set: [
                    {
                      id: sample(nonExistentIDs),
                    },
                  ],
                },
              },
            },
          ],
          [
            'Number',
            {
              sCom: {
                categories: sample(nonExistentIDs),
              },
            },
          ],
          [
            'Array',
            {
              sCom: {
                categories: [sample(nonExistentIDs)],
              },
            },
          ],
        ];

        test.each(testData)('%s', async (__, input = {}) => {
          global.strapi = strapi;
          const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
            isDraft: true,
          });
          await expect(res).rejects.toThrowError(expectedError);
        });
      });
    });

    describe('Repeatable Component', () => {
      describe('Success', () => {
        const testData = [
          [
            'Connect',
            {
              rCom: [
                {
                  categories: {
                    disconnect: [],
                    connect: [
                      {
                        id: sample(IDsThatExist),
                      },
                    ],
                  },
                },
              ],
            },
          ],
          [
            'Set',
            {
              rCom: [
                {
                  categories: {
                    set: IDsThatExist.slice(-Math.floor(IDsThatExist.length / 2)).map((id) => ({
                      id,
                    })),
                  },
                },
              ],
            },
          ],
          [
            'Number',
            {
              rCom: [
                {
                  categories: IDsThatExist[0],
                },
              ],
            },
          ],
          [
            'Array',
            {
              rCom: [
                {
                  categories: IDsThatExist.slice(-Math.floor(IDsThatExist.length / 2)),
                },
              ],
            },
          ],
        ];

        test.each(testData)('%s', async (__, input = {}) => {
          global.strapi = strapi;
          const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
            isDraft: true,
          });
          await expect(res).resolves.not.toThrowError();
        });
      });

      describe('Error', () => {
        const expectedError = new ValidationError(
          `4 relation(s) of type api::category.category associated with this entity do not exist`
        );
        const testData = [
          [
            'Connect',
            {
              rCom: [
                {
                  categories: {
                    disconnect: [],
                    connect: [sample(IDsThatExist), ...nonExistentIDs.slice(-4)].map((id) => ({
                      id,
                    })),
                  },
                },
              ],
            },
          ],
          [
            'Set',
            {
              rCom: [
                {
                  categories: {
                    set: [sample(IDsThatExist), ...nonExistentIDs.slice(-4)].map((id) => ({
                      id,
                    })),
                  },
                },
              ],
            },
          ],
          [
            'Array',
            {
              rCom: [
                {
                  categories: nonExistentIDs.slice(-4),
                },
              ],
            },
          ],
        ];

        test.each(testData)('%s', async (__, input = {}) => {
          global.strapi = strapi;
          const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
            isDraft: true,
          });
          await expect(res).rejects.toThrowError(expectedError);
        });
      });
    });

    describe('Dynamic Zones', () => {
      describe('Success', () => {
        const testData = [
          [
            'Connect',
            {
              DZ: [
                {
                  __component: 'basic.dev-compo',
                  categories: {
                    disconnect: [],
                    connect: IDsThatExist.slice(-3).map((id) => ({
                      id,
                    })),
                  },
                },
              ],
            },
          ],
          [
            'Set',
            {
              DZ: [
                {
                  __component: 'basic.dev-compo',
                  categories: {
                    set: IDsThatExist.slice(-3).map((id) => ({
                      id,
                    })),
                  },
                },
              ],
            },
          ],
          [
            'Number',
            {
              DZ: [
                {
                  __component: 'basic.dev-compo',
                  categories: IDsThatExist[0],
                },
              ],
            },
          ],
          [
            'Array',
            {
              DZ: [
                {
                  __component: 'basic.dev-compo',
                  categories: IDsThatExist.slice(-3),
                },
              ],
            },
          ],
        ];

        test.each(testData)('%s', async (__, input = {}) => {
          global.strapi = strapi;
          const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
            isDraft: true,
          });
          await expect(res).resolves.not.toThrowError();
        });
      });

      describe('Error', () => {
        const expectedError = new ValidationError(
          `2 relation(s) of type api::category.category associated with this entity do not exist`
        );
        const testData = [
          [
            'Connect',
            {
              DZ: [
                {
                  __component: 'basic.dev-compo',
                  categories: {
                    disconnect: [],
                    connect: [sample(IDsThatExist), ...nonExistentIDs.slice(-2)].map((id) => ({
                      id,
                    })),
                  },
                },
              ],
            },
          ],
          [
            'Set',
            {
              DZ: [
                {
                  __component: 'basic.dev-compo',
                  categories: {
                    set: [sample(IDsThatExist), ...nonExistentIDs.slice(-2)].map((id) => ({
                      id,
                    })),
                  },
                },
              ],
            },
          ],
          [
            'Array',
            {
              DZ: [
                {
                  __component: 'basic.dev-compo',
                  categories: [sample(IDsThatExist), ...nonExistentIDs.slice(-2)].map((id) => ({
                    id,
                  })),
                },
              ],
            },
          ],
        ];

        test.each(testData)('%s', async (__, input = {}) => {
          global.strapi = strapi;
          const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
            isDraft: true,
          });
          await expect(res).rejects.toThrowError(expectedError);
        });
      });
    });

    describe('Media', () => {
      it('Success', async () => {
        global.strapi = strapi;
        const input = {
          media: [
            {
              id: sample(IDsThatExist),
              name: 'img.jpeg',
            },
          ],
        };

        const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
          isDraft: true,
        });
        await expect(res).resolves.not.toThrowError();
      });

      it('Error', async () => {
        global.strapi = strapi;
        const expectedError = new ValidationError(
          `1 relation(s) of type plugin::upload.file associated with this entity do not exist`
        );
        const input = {
          media: [
            {
              id: sample(nonExistentIDs),
              name: 'img.jpeg',
            },
            {
              id: sample(IDsThatExist),
              name: 'img.jpeg',
            },
          ],
        };

        const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
          isDraft: true,
        });
        await expect(res).rejects.toThrowError(expectedError);
      });
    });
  });
});
