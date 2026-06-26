/**
 * Parity with `develop` (@strapi/provider-email-amazon-ses + node-ses) behavior.
 * Documents configs and send shapes that worked before the AWS SDK v3 migration.
 */
import { describe, expect, it } from 'vitest';
import { SESClient } from '@aws-sdk/client-ses';

import {
  buildSendEmailCommandInput,
  DEFAULT_SES_ENDPOINT,
  getClientConfig,
  toAddressList,
} from '../utils';

/** Exact `develop` README providerOptions shape. */
const DEVELOP_README_PROVIDER_OPTIONS = {
  key: 'AKIA_DEVELOP_KEY',
  secret: 'develop-secret-key',
  amazon: 'https://email.eu-west-1.amazonaws.com',
};

const DEVELOP_SETTINGS = {
  defaultFrom: 'shipper@example.com',
  defaultReplyTo: 'reply@example.com',
};

describe('backwards compatibility with develop / node-ses', () => {
  describe('providerOptions (develop config rewriting)', () => {
    it('maps the develop README example to a resolvable SES client config', async () => {
      const config = getClientConfig(DEVELOP_README_PROVIDER_OPTIONS);

      expect(config).toEqual({
        region: 'eu-west-1',
        endpoint: 'https://email.eu-west-1.amazonaws.com',
        credentials: {
          accessKeyId: 'AKIA_DEVELOP_KEY',
          secretAccessKey: 'develop-secret-key',
        },
      });

      const client = new SESClient(config);
      await expect(client.config.region()).resolves.toBe('eu-west-1');
    });

    it('maps key + secret only like node-ses default amazon host', async () => {
      const config = getClientConfig({
        key: 'AKIA_DEVELOP_KEY',
        secret: 'develop-secret-key',
      });

      expect(config).toEqual({
        region: 'us-east-1',
        endpoint: DEFAULT_SES_ENDPOINT,
        credentials: {
          accessKeyId: 'AKIA_DEVELOP_KEY',
          secretAccessKey: 'develop-secret-key',
        },
      });

      const client = new SESClient(config);
      await expect(client.config.region()).resolves.toBe('us-east-1');
    });

    it('does not pass unknown providerOptions keys that node-ses ignored', () => {
      const config = getClientConfig({
        key: 'k',
        secret: 's',
        amazon: 'https://email.us-east-1.amazonaws.com',
        // node-ses createClient only read key, secret, amazon
        timeout: 9999,
      } as Parameters<typeof getClientConfig>[0]);

      expect(config).not.toHaveProperty('timeout');
    });
  });

  describe('send options (develop + node-ses)', () => {
    it('maps Strapi html/text fields like develop (message / altText → Html / Text)', () => {
      const input = buildSendEmailCommandInput(
        {
          to: 'user@example.com',
          subject: 'Subject',
          text: 'Plain',
          html: '<b>Html</b>',
        },
        DEVELOP_SETTINGS
      );

      expect(input.Message?.Body).toEqual({
        Text: { Data: 'Plain', Charset: 'UTF-8' },
        Html: { Data: '<b>Html</b>', Charset: 'UTF-8' },
      });
    });

    it('passes string recipients as a single entry (node-ses extractRecipient)', () => {
      expect(toAddressList('a@example.com, b@example.com')).toEqual([
        'a@example.com, b@example.com',
      ]);
    });

    it('passes through recipient arrays (node-ses example)', () => {
      const input = buildSendEmailCommandInput(
        {
          to: ['one@example.com', 'two@example.com'],
          cc: ['cc@example.com'],
          bcc: ['bcc@example.com'],
          subject: 'Subject',
          text: 'Plain',
          html: '',
        },
        DEVELOP_SETTINGS
      );

      expect(input.Destination).toEqual({
        ToAddresses: ['one@example.com', 'two@example.com'],
        CcAddresses: ['cc@example.com'],
        BccAddresses: ['bcc@example.com'],
      });
    });

    it('omits cc/bcc when undefined (develop passed through to node-ses)', () => {
      const input = buildSendEmailCommandInput(
        {
          to: 'user@example.com',
          subject: 'Subject',
          text: 'Plain',
          html: '',
        },
        DEVELOP_SETTINGS
      );

      expect(input.Destination?.CcAddresses).toBeUndefined();
      expect(input.Destination?.BccAddresses).toBeUndefined();
    });

    it('supports defaultReplyTo as an array (develop README)', () => {
      const input = buildSendEmailCommandInput(
        {
          to: 'user@example.com',
          subject: 'Subject',
          text: 'Plain',
          html: '',
        },
        {
          ...DEVELOP_SETTINGS,
          defaultReplyTo: ['reply-a@example.com', 'reply-b@example.com'],
        }
      );

      expect(input.ReplyToAddresses).toEqual(['reply-a@example.com', 'reply-b@example.com']);
    });

    it('supports replyTo as an array on send', () => {
      const input = buildSendEmailCommandInput(
        {
          to: 'user@example.com',
          replyTo: ['reply-a@example.com', 'reply-b@example.com'],
          subject: 'Subject',
          text: 'Plain',
          html: '',
        },
        DEVELOP_SETTINGS
      );

      expect(input.ReplyToAddresses).toEqual(['reply-a@example.com', 'reply-b@example.com']);
    });

    it('maps node-ses configurationSet to ConfigurationSetName', () => {
      const input = buildSendEmailCommandInput(
        {
          to: 'user@example.com',
          subject: 'Subject',
          text: 'Plain',
          html: '',
          configurationSet: 'my-config-set',
        },
        DEVELOP_SETTINGS
      );

      expect(input.ConfigurationSetName).toBe('my-config-set');
      expect(input).not.toHaveProperty('configurationSet');
    });

    it('maps node-ses messageTags to Tags', () => {
      const input = buildSendEmailCommandInput(
        {
          to: 'user@example.com',
          subject: 'Subject',
          text: 'Plain',
          html: '',
          messageTags: [
            { name: 'campaign', value: 'welcome' },
            { name: 'segment', value: 'beta' },
          ],
        },
        DEVELOP_SETTINGS
      );

      expect(input.Tags).toEqual([
        { Name: 'campaign', Value: 'welcome' },
        { Name: 'segment', Value: 'beta' },
      ]);
      expect(input).not.toHaveProperty('messageTags');
    });

    it('skips empty html like node-ses (falsy message)', () => {
      const input = buildSendEmailCommandInput(
        {
          to: 'user@example.com',
          subject: 'Subject',
          text: 'Plain only',
          html: '',
        },
        DEVELOP_SETTINGS
      );

      expect(input.Message?.Body?.Text).toEqual({ Data: 'Plain only', Charset: 'UTF-8' });
      expect(input.Message?.Body?.Html).toBeUndefined();
    });

    it('skips empty text like node-ses (falsy altText)', () => {
      const input = buildSendEmailCommandInput(
        {
          to: 'user@example.com',
          subject: 'Subject',
          text: '',
          html: '<p>Html only</p>',
        },
        DEVELOP_SETTINGS
      );

      expect(input.Message?.Body?.Html).toEqual({ Data: '<p>Html only</p>', Charset: 'UTF-8' });
      expect(input.Message?.Body?.Text).toBeUndefined();
    });
  });
});
