import schema from '../utils/schema';

describe('schema', () => {
  it('should failed to validate', () => {
    expect(() =>
      schema.validateSync({
        email_confirmation: true,
        email_confirmation_redirection: '',
        email_reset_password: null,
      })
    ).toThrow();
  });

  it('should success to validate', () => {
    expect(() =>
      schema.validateSync({
        email_confirmation: true,
        email_confirmation_redirection: 'http://example.com/redirection',
        email_confirmation_error_redirection: 'http://example.com/redirection-error',
        email_reset_password: null,
      })
    ).not.toThrow();

    expect(() =>
      schema.validateSync({
        email_confirmation: true,
        email_confirmation_redirection: 'https://example.com/redirection',
        email_confirmation_error_redirection: 'http://example.com/redirection-error',
        email_reset_password: null,
      })
    ).not.toThrow();

    expect(() =>
      schema.validateSync({
        email_confirmation: true,
        email_confirmation_redirection: 'some://link',
        email_confirmation_error_redirection: 'some://link',
        email_reset_password: null,
      })
    ).not.toThrow();

    expect(() =>
      schema.validateSync({
        email_confirmation: true,
        email_confirmation_redirection: 'market://details?id=com.example.com',
        email_confirmation_error_redirection: 'market://details?id=com.example.com',
        email_reset_password: null,
      })
    ).not.toThrow();
  });
});
