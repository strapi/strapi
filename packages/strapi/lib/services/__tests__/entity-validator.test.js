'use strict';

const createEntityValidator = require('../entity-validator');

describe('Entity validator', () => {
  describe('Published input', () => {
    describe('General Errors', () => {
      it('Throws a badRequest error on invalid input', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

        const model = {
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: 1234 };

        expect.hasAssertions();

        await entityValidator.validateEntity(model, input).catch(() => {
          expect(errors.badRequest).toHaveBeenCalledWith('ValidationError', expect.any(Object));
        });
      });

      it('Returns data on valid input', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

        const model = {
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: 'test Title' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntity(model, input);
        expect(data).toEqual(input);
      });

      it('Returns casted data when possible', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

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

        const data = await entityValidator.validateEntity(model, input);
        expect(data).toEqual({
          title: 'Test',
          number: 123,
        });
      });

      test('Throws on required not respected', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

        const model = {
          attributes: {
            title: {
              type: 'string',
              required: true,
            },
          },
        };

        expect.hasAssertions();

        await entityValidator.validateEntity(model, {}).catch(() => {
          expect(errors.badRequest).toHaveBeenCalledWith('ValidationError', {
            errors: { title: [expect.stringMatching('must be defined')] },
          });
        });

        await entityValidator.validateEntity(model, { title: null }).catch(() => {
          expect(errors.badRequest).toHaveBeenCalledWith('ValidationError', {
            errors: { title: [expect.stringMatching('must be defined')] },
          });
        });
      });
    });

    describe('String validator', () => {
      test('Throws on min length not respected', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

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

        await entityValidator.validateEntity(model, input).catch(() => {
          expect(errors.badRequest).toHaveBeenCalledWith('ValidationError', {
            errors: { title: [expect.stringMatching('at least 10 characters')] },
          });
        });
      });

      test('Throws on max length not respected', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

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

        await entityValidator.validateEntity(model, input).catch(() => {
          expect(errors.badRequest).toHaveBeenCalledWith('ValidationError', {
            errors: { title: [expect.stringMatching('at most 2 characters')] },
          });
        });
      });

      test('Allows empty strings even when required', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

        const model = {
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: '' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntity(model, input);
        expect(data).toEqual(input);
      });

      test('Assign default values', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

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

        await expect(entityValidator.validateEntity(model, {})).resolves.toMatchObject({
          title: 'New',
          type: 'test',
          testDate: '2020-04-01T04:00:00.000Z',
          testJSON: {
            foo: 1,
            bar: 2,
          },
        });
      });
    });
  });

  describe('Draft input', () => {
    describe('General Errors', () => {
      it('Throws a badRequest error on invalid input', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

        const model = {
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: 1234 };

        expect.hasAssertions();

        await entityValidator.validateEntity(model, input, { isDraft: true }).catch(() => {
          expect(errors.badRequest).toHaveBeenCalledWith('ValidationError', expect.any(Object));
        });
      });

      it('Returns data on valid input', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

        const model = {
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: 'test Title' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntity(model, input, { isDraft: true });
        expect(data).toEqual(input);
      });

      it('Returns casted data when possible', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

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

        const data = await entityValidator.validateEntity(model, input, { isDraft: true });
        expect(data).toEqual({
          title: 'Test',
          number: 123,
        });
      });

      test('Does not throws on required not respected', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

        const model = {
          attributes: {
            title: {
              type: 'string',
              required: true,
            },
          },
        };

        expect.hasAssertions();

        let data = await entityValidator.validateEntity(model, {}, { isDraft: true });
        expect(data).toEqual({});

        data = await entityValidator.validateEntity(model, { title: null }, { isDraft: true });
        expect(data).toEqual({ title: null });
      });
    });

    describe('String validator', () => {
      test('Does not throws on min length not respected', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

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

        const data = await entityValidator.validateEntity(model, input, { isDraft: true });
        expect(data).toEqual(input);
      });

      test('Throws on max length not respected', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

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

        await entityValidator.validateEntity(model, input, { isDraft: true }).catch(() => {
          expect(errors.badRequest).toHaveBeenCalledWith('ValidationError', {
            errors: { title: [expect.stringMatching('at most 2 characters')] },
          });
        });
      });

      test('Allows empty strings even when required', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

        const model = {
          attributes: {
            title: {
              type: 'string',
            },
          },
        };

        const input = { title: '' };

        expect.hasAssertions();

        const data = await entityValidator.validateEntity(model, input, { isDraft: true });
        expect(data).toEqual(input);
      });

      test('Assign default values', async () => {
        const errors = {
          badRequest: jest.fn(),
        };

        const entityValidator = createEntityValidator({
          strapi: {
            errors,
          },
        });

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
          entityValidator.validateEntity(model, {}, { isDraft: true })
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
    });
  });
});
