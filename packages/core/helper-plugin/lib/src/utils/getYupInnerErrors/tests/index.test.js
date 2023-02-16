import getYupInnerErrors from '../index';

describe('getYupInnerErrors', () => {
  test('can extract relevant parameters from an error', () => {
    const maxError = {
      inner: [
        {
          path: 'Name',
          type: 'max',
          params: { max: 5 },
          message: 'components.Input.error.validation.maxLength',
        },
      ],
    };

    expect(getYupInnerErrors(maxError)).toMatchObject({
      Name: {
        id: 'components.Input.error.validation.maxLength',
        defaultMessage: 'components.Input.error.validation.maxLength',
        values: { max: 5 },
      },
    });
  });
});
