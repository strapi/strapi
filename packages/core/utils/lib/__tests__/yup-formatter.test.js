'use strict';

const yup = require('yup');
const { formatYupErrors } = require('../validators');

describe('Format yup errors', () => {
  test('Format single errors', async () => {
    expect.hasAssertions();
    return yup
      .object({
        name: yup.string().required('name is required'),
      })
      .validate({})
      .catch(err => {
        expect(formatYupErrors(err)).toMatchObject({
          name: ['name is required'],
        });
      });
  });

  test('Format multiple errors', async () => {
    expect.hasAssertions();
    return yup
      .object({
        name: yup
          .string()
          .min(2, 'min length is 2')
          .required(),
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
      .catch(err => {
        expect(formatYupErrors(err)).toMatchObject({
          name: ['min length is 2'],
        });
      });
  });

  test('Format multiple errors on multiple keys', async () => {
    expect.hasAssertions();
    return yup
      .object({
        name: yup
          .string()
          .min(2, 'min length is 2')
          .typeError('name must be a string')
          .required(),
        price: yup
          .number()
          .integer()
          .required('price is required'),
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
      .catch(err => {
        expect(formatYupErrors(err)).toMatchObject({
          price: ['price is required'],
          name: ['name must be a string'],
        });
      });
  });
});
