import formData from 'form-data';
import Mailgun from 'mailgun.js';

describe('@strapi/provider-email-mailgun', () => {
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
        ...providerOptions,
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
        // @ts-expect-error - Testing invalid input
        mailgun.client({
          ...defaults,
          ...providerOptions,
        });
      }).toThrowError('Parameter "key" is required');
    });
  });
});
