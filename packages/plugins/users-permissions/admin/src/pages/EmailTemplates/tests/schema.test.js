import schema from '../utils/schema';

describe('schema', () => {
  it('should fail to validate', () => {
    expect(() =>
      schema.validateSync({
        options: {
          from: {
            name: 'example-name',
            email: 'invalid-email',
          },
          response_email: 'invalid-email',
          object: 'example-object',
          message: 'example-message',
        },
      })
    ).toThrow();

    expect(() =>
      schema.validateSync({
        options: {
          from: {
            name: '',
            email: '',
          },
          response_email: '',
          object: '',
          message: '',
        },
      })
    ).toThrow();
  });

  it('should successfully  validate', () => {
    expect(() =>
      schema.validateSync({
        options: {
          from: {
            name: 'example-name',
            email: 'hi@strapi.io',
          },
          response_email: 'hi@strapi.io',
          object: 'example-object',
          message: 'example-message',
        },
      })
    ).not.toThrow();

    expect(() =>
      schema.validateSync({
        options: {
          from: {
            name: 'example-name',
            email: 'hi@strapi.io',
          },
          response_email: '',
          object: 'example-object',
          message: 'example-message',
        },
      })
    ).not.toThrow();
  });
});
