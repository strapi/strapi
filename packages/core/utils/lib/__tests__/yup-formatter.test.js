'use strict';

const { yup } = require('../validators');
const { formatYupErrors } = require('../format-yup-error');
const { YupValidationError } = require('../errors');

describe('formatYupErrors', () => {
  test('Error message is sanitized', async () => {
    const schema = yup.object().shape({
      name: yup.string().required(),
    });

    try {
      await schema.validateSync({ name: null });
    } catch (e) {
      const formattedError = new YupValidationError(e);
      expect(formattedError.message).toEqual(
        'name must be a `string` type, but the final value was: `null`.'
      );
    }
  });

  test('Format single errors', async () => {
    expect.hasAssertions();
    return yup
      .object({
        name: yup.string().required('name is required'),
      })
      .validate({})
      .catch((err) => {
        expect(formatYupErrors(err)).toMatchObject({
          errors: [
            {
              message: 'name is required',
              name: 'ValidationError',
              path: ['name'],
            },
          ],
          message: 'name is required',
        });
      });
  });

  test('Format multiple errors', async () => {
    expect.hasAssertions();
    return yup
      .object({
        name: yup.string().min(2, 'min length is 2').required(),
      })
      .validate(
        {
          name: '1',
        },
        {
          strict: true,
          abortEarly: false,
        }
      )
      .catch((err) => {
        expect(formatYupErrors(err)).toMatchObject({
          errors: [
            {
              message: 'min length is 2',
              name: 'ValidationError',
              path: ['name'],
            },
          ],
          message: 'min length is 2',
        });
      });
  });

  test('Format multiple errors on multiple keys', async () => {
    expect.hasAssertions();
    return yup
      .object({
        name: yup.string().min(2, 'min length is 2').typeError('name must be a string').required(),
        price: yup.number().integer().required('price is required'),
      })
      .validate(
        {
          name: 12,
        },
        {
          strict: true,
          abortEarly: false,
        }
      )
      .catch((err) => {
        expect(formatYupErrors(err)).toMatchObject({
          errors: [
            {
              message: 'name must be a string',
              name: 'ValidationError',
              path: ['name'],
            },
            {
              message: 'price is required',
              name: 'ValidationError',
              path: ['price'],
            },
          ],
          message: '2 errors occurred',
        });
      });
  });
});
