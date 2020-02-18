'use strict';

const createEntityValidator = require('../entity-validator');

describe('Entity validator', () => {
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
          title: [expect.stringMatching('must be defined')],
        });
      });

      await entityValidator.validateEntity(model, { title: null }).catch(() => {
        expect(errors.badRequest).toHaveBeenCalledWith('ValidationError', {
          title: [expect.stringMatching('must be defined')],
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
          title: [expect.stringMatching('at least 10 characters')],
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

      const input = { title: 'tooSmall' };

      expect.hasAssertions();

      await entityValidator.validateEntity(model, input).catch(() => {
        expect(errors.badRequest).toHaveBeenCalledWith('ValidationError', {
          title: [expect.stringMatching('at most 2 characters')],
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
  });
});
