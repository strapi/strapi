'use strict';

const formData = require('form-data');
const Mailgun = require('mailgun.js');

const provider = require('../index');

describe('@strapi/provider-email-mailgun', () => {
  describe('.convertProviderOptions()', () => {
    it('returns an empty object', () => {
      expect(provider.convertProviderOptions({})).toEqual({});
    });

    it('returns the correct key', () => {
      expect(
        provider.convertProviderOptions({
          apiKey: 'foo',
        })
      ).toEqual({
        key: 'foo',
      });
    });

    it('passes through unknown options', () => {
      expect(
        provider.convertProviderOptions({
          username: 'foo',
        })
      ).toEqual({
        username: 'foo',
      });
    });

    it('correctly merges options objects with defaults', () => {
      const defaults = {
        username: 'api',
      };
      const providerOptions = {
        key: 'foo',
        username: 'bar',
        domain: 'baz.example.com',
      };
      expect({ ...defaults, ...provider.convertProviderOptions(providerOptions) }).toEqual(
        providerOptions
      );
    });
  });

  describe('Mailgun', () => {
    it('successfully creates a new Mailgun client', () => {
      const defaults = {
        username: 'api',
      };
      const providerOptions = {
        key: 'foo',
        username: 'bar',
        domain: 'baz.example.com',
      };
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({
        ...defaults,
        ...provider.convertProviderOptions(providerOptions),
      });
      expect(mg).toMatchObject({
        messages: {
          request: {
            headers: {},
            key: providerOptions.key,
            url: 'https://api.mailgun.net',
            username: providerOptions.username,
          },
        },
      });
    });

    it('fails to create a new Mailgun client due to missing key', () => {
      const defaults = {
        username: 'api',
      };
      const providerOptions = {
        username: 'bar',
        domain: 'baz.example.com',
      };
      const mailgun = new Mailgun(formData);
      expect(() => {
        mailgun.client({ ...defaults, ...provider.convertProviderOptions(providerOptions) });
      }).toThrowError('Parameter "key" is required');
    });
  });
});
