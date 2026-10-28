import { errors } from '@strapi/utils';

import { formatApplicationError } from '../errors';

describe('application errors', () => {
  it('formats conflicts with status 409', () => {
    expect(
      formatApplicationError(
        new errors.ConflictError('The document has changed since it was loaded', {
          expected: 'old',
          current: 'new',
        })
      )
    ).toEqual({
      status: 409,
      body: {
        data: null,
        error: {
          status: 409,
          name: 'ConflictError',
          message: 'The document has changed since it was loaded',
          details: {
            expected: 'old',
            current: 'new',
          },
        },
      },
    });
  });
});
