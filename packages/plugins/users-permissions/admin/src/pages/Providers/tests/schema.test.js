import forms from '../utils/forms';

const { providers, providersWithSubdomain } = forms;

describe('schema without subdomain', () => {
  it('should fail to validate', () => {
    const invalidCallbacks = [
      'http:/example.com/callback',
      'example.com/callback',
      'example',
      'example.com',
    ];

    invalidCallbacks.forEach((callback) => {
      expect(() =>
        providers.schema.validateSync({
          enabled: true,
          key: 'example-key',
          secret: 'example-secret',
          callback,
        })
      ).toThrow();
    });

    expect(() =>
      providers.schema.validateSync({
        enabled: true,
        key: '',
        secret: '',
        callback: '',
      })
    ).toThrow();
  });

  it('should successfully validate', () => {
    const validCallbacks = [
      'http://example.com/callback',
      'https://example.com/callback',
      'http://localhost/callback',
      'http://127.0.0.1:8080/callback',
      'https://example.com:443/callback?param=value',
      'http://example.com/callback#fragment',
      'https://sub.example.com/path/to/callback',
      'http://example.com/callback?param1=value1&param2=value2',
      'http://localhost:1337/api/auth/example-provider/callback',
      'some://link',
    ];

    validCallbacks.forEach((callback) => {
      expect(() =>
        providers.schema.validateSync({
          enabled: true,
          key: 'example-key',
          secret: 'example-secret',
          callback,
        })
      ).not.toThrow();
    });

    expect(() =>
      providers.schema.validateSync({
        enabled: false,
        key: '',
        secret: '',
        callback: '',
      })
    ).not.toThrow();
  });
});

describe('schema with subdomain', () => {
  it('should fail to validate', () => {
    const invalidSubdomains = [
      'http://example.com',
      'https://example.com',
      ' example.com',
      'example.com ',
      'exam ple.com',
      '.example.com',
    ];

    invalidSubdomains.forEach((subdomain) => {
      expect(() =>
        providersWithSubdomain.schema.validateSync({
          enabled: true,
          key: 'example-key',
          secret: 'example-secret',
          subdomain,
          callback: 'http://example.com/callback',
        })
      ).toThrow();
    });

    expect(() =>
      providersWithSubdomain.schema.validateSync({
        enabled: true,
        key: '',
        secret: '',
        subdomain: '',
        callback: '',
      })
    ).toThrow();
  });

  it('should successfully validate', () => {
    const validSubdomains = [
      'example.com',
      'sub.example.com',
      'example-domain.com',
      'example123.co.io',
      'localhost',
      'sub-subdomain.example-domain.co.io',
      'sub.example-domain.com/example',
    ];

    validSubdomains.forEach((subdomain) => {
      expect(() =>
        providersWithSubdomain.schema.validateSync({
          enabled: true,
          key: 'example-key',
          secret: 'example-secret',
          subdomain,
          callback: 'http://example.com/callback',
        })
      ).not.toThrow();
    });

    expect(() =>
      providersWithSubdomain.schema.validateSync({
        enabled: false,
        key: '',
        secret: '',
        subdomain: '',
        callback: '',
      })
    ).not.toThrow();
  });
});
