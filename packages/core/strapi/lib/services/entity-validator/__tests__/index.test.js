'use strict';

const entityValidator = require('..');

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
});
