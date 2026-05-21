import { describe, expect, it } from 'vitest';
import { SESClient } from '@aws-sdk/client-ses';

import {
  buildSendEmailCommandInput,
  DEFAULT_SES_ENDPOINT,
  getClientConfig,
  regionFromEndpoint,
  toAddressList,
} from '../utils';

const accessKeyId = 'AKIA_LEGACY_KEY';
const secretAccessKey = 'legacy-secret-key';

describe('@strapi/provider-email-amazon-ses utils', () => {
  describe('regionFromEndpoint', () => {
    it('parses region from the legacy README amazon URL', () => {
      expect(regionFromEndpoint('https://email.eu-west-1.amazonaws.com')).toBe('eu-west-1');
    });

    it('returns undefined for endpoints without email.<region>.amazonaws.com', () => {
      expect(regionFromEndpoint('http://localhost:4566')).toBeUndefined();
    });

    it('parses China partition hostnames (email.<region>.amazonaws.com.cn)', () => {
      expect(regionFromEndpoint('https://email.cn-north-1.amazonaws.com.cn')).toBe('cn-north-1');
    });
  });

  describe('toAddressList', () => {
    it('splits comma-separated addresses like node-ses string recipients', () => {
      expect(toAddressList('a@example.com, b@example.com')).toEqual([
        'a@example.com',
        'b@example.com',
      ]);
    });

    it('passes through arrays (node-ses bcc example)', () => {
      expect(toAddressList(['one@example.com', 'two@example.com'])).toEqual([
        'one@example.com',
        'two@example.com',
      ]);
    });

    it('returns undefined for empty values', () => {
      expect(toAddressList('')).toBeUndefined();
      expect(toAddressList(undefined)).toBeUndefined();
    });
  });

  describe('getClientConfig (legacy providerOptions rewrites)', () => {
    const expectResolvableSesClient = async (config: ReturnType<typeof getClientConfig>) => {
      const client = new SESClient(config);
      await expect(client.config.region()).resolves.toEqual(expect.any(String));
    };

    it('rewrites the published README config (key, secret, amazon)', async () => {
      const config = getClientConfig({
        key: accessKeyId,
        secret: secretAccessKey,
        amazon: 'https://email.us-east-1.amazonaws.com',
      });

      expect(config).toEqual({
        region: 'us-east-1',
        endpoint: 'https://email.us-east-1.amazonaws.com',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      await expectResolvableSesClient(config);
    });

    it('rewrites top-level key and secret only (node-ses default region)', async () => {
      const config = getClientConfig({
        key: accessKeyId,
        secret: secretAccessKey,
      });

      expect(config).toEqual({
        region: 'us-east-1',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      await expectResolvableSesClient(config);
    });

    it('rewrites nested credentials: { key, secret } (new README example)', async () => {
      const config = getClientConfig({
        region: 'ap-southeast-2',
        credentials: {
          key: accessKeyId,
          secret: secretAccessKey,
        },
      });

      expect(config).toEqual({
        region: 'ap-southeast-2',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      await expectResolvableSesClient(config);
    });

    it('passes through standard AWS credentials object', async () => {
      const config = getClientConfig({
        region: 'eu-central-1',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      expect(config).toEqual({
        region: 'eu-central-1',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      await expectResolvableSesClient(config);
    });

    it('includes sessionToken when provided in nested credentials', () => {
      const config = getClientConfig({
        region: 'us-east-1',
        credentials: {
          key: accessKeyId,
          secret: secretAccessKey,
          sessionToken: 'SESSION',
        },
      });

      expect(config.credentials).toEqual({
        accessKeyId,
        secretAccessKey,
        sessionToken: 'SESSION',
      });
    });

    it('supports IRSA-style config (region only, no static credentials)', async () => {
      const config = getClientConfig({
        region: 'us-west-2',
      });

      expect(config).toEqual({ region: 'us-west-2' });
      await expectResolvableSesClient(config);
    });

    it('prefers explicit region over region parsed from amazon', () => {
      const config = getClientConfig({
        key: accessKeyId,
        secret: secretAccessKey,
        region: 'ap-northeast-1',
        amazon: 'https://email.eu-west-1.amazonaws.com',
      });

      expect(config.region).toBe('ap-northeast-1');
      expect(config.endpoint).toBe('https://email.eu-west-1.amazonaws.com');
    });

    it('maps amazon alias to endpoint (documented legacy name)', () => {
      expect(
        getClientConfig({
          key: accessKeyId,
          secret: secretAccessKey,
          amazon: DEFAULT_SES_ENDPOINT,
        }).endpoint
      ).toBe(DEFAULT_SES_ENDPOINT);
    });

    it('does not inject us-east-1 when a custom endpoint has no parseable region', () => {
      const config = getClientConfig({
        key: accessKeyId,
        secret: secretAccessKey,
        endpoint: 'http://localhost:4566',
      });

      expect(config.region).toBeUndefined();
      expect(config.endpoint).toBe('http://localhost:4566');
    });

    it('defaults to us-east-1 when legacy amazon URL has no parseable region', () => {
      const config = getClientConfig({
        key: accessKeyId,
        secret: secretAccessKey,
        amazon: 'https://invalid-url.com',
      });

      expect(config).toEqual(
        expect.objectContaining({
          region: 'us-east-1',
          endpoint: 'https://invalid-url.com',
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        })
      );
    });
  });

  describe('buildSendEmailCommandInput (legacy send field mapping)', () => {
    const settings = {
      defaultFrom: 'noreply@example.com',
      defaultReplyTo: 'support@example.com',
    };

    it('maps html to Html and text to Text (node-ses message / altText)', () => {
      const input = buildSendEmailCommandInput(
        {
          to: 'recipient@example.com',
          subject: 'Hello',
          text: 'Plain body',
          html: '<p>Html body</p>',
        },
        settings
      );

      expect(input.Message?.Body).toEqual({
        Html: { Data: '<p>Html body</p>', Charset: 'UTF-8' },
        Text: { Data: 'Plain body', Charset: 'UTF-8' },
      });
    });

    it('uses settings.defaultFrom and defaultReplyTo when omitted', () => {
      const input = buildSendEmailCommandInput(
        {
          to: 'recipient@example.com',
          subject: 'Test',
          text: 'Body',
          html: '',
        },
        settings
      );

      expect(input.Source).toBe('noreply@example.com');
      expect(input.ReplyToAddresses).toEqual(['support@example.com']);
    });

    it('supports array defaultReplyTo from README', () => {
      const input = buildSendEmailCommandInput(
        {
          to: 'recipient@example.com',
          subject: 'Test',
          text: 'Body',
          html: '',
        },
        {
          ...settings,
          defaultReplyTo: ['support@example.com', 'billing@example.com'],
        }
      );

      expect(input.ReplyToAddresses).toEqual(['support@example.com', 'billing@example.com']);
    });

    it('maps Strapi-style cc/bcc strings to Destination lists', () => {
      const input = buildSendEmailCommandInput(
        {
          to: 'to@example.com',
          cc: 'cc@example.com',
          bcc: 'bcc1@example.com, bcc2@example.com',
          subject: 'Test',
          text: 'Body',
          html: '',
        },
        settings
      );

      expect(input.Destination).toEqual({
        ToAddresses: ['to@example.com'],
        CcAddresses: ['cc@example.com'],
        BccAddresses: ['bcc1@example.com', 'bcc2@example.com'],
      });
    });
  });
});
