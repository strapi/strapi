import { beforeEach, describe, expect, it, vi } from 'vitest';

import provider from '../index';

const { mockSend, MockSendEmailCommand, MockSESClient } = vi.hoisted(() => {
  const send = vi.fn();

  const SendEmailCommand = vi.fn(function SendEmailCommand(
    this: { input: unknown },
    input: unknown
  ) {
    this.input = input;
  });

  class SESClient {
    send = send;
  }

  return {
    mockSend: send,
    MockSendEmailCommand: SendEmailCommand,
    MockSESClient: vi.fn(SESClient),
  };
});

vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: MockSESClient,
  SendEmailCommand: MockSendEmailCommand,
}));

describe('@strapi/provider-email-amazon-ses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  const settings = {
    defaultFrom: 'default@example.com',
    defaultReplyTo: 'default-reply@example.com',
  };

  const legacyCredentials = {
    key: 'test-access-key',
    secret: 'test-secret-key',
  };

  const expectedLegacyCredentials = {
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
  };

  const createBaseEmailOptions = (overrides = {}) => ({
    to: 'recipient@example.com',
    subject: 'Test Subject',
    text: 'Plain text content',
    html: '<p>HTML content</p>',
    ...overrides,
  });

  describe('init', () => {
    describe('with legacy options', () => {
      it('creates SES client with credentials from key/secret', () => {
        provider.init(legacyCredentials, settings);

        expect(MockSESClient).toHaveBeenCalledWith(
          expect.objectContaining({
            region: 'us-east-1',
            endpoint: 'https://email.us-east-1.amazonaws.com',
            credentials: expectedLegacyCredentials,
          })
        );
      });

      it('extracts region from amazon URL', () => {
        provider.init(
          {
            ...legacyCredentials,
            amazon: 'https://email.eu-west-1.amazonaws.com',
          },
          settings
        );

        expect(MockSESClient).toHaveBeenCalledWith(
          expect.objectContaining({
            region: 'eu-west-1',
            endpoint: 'https://email.eu-west-1.amazonaws.com',
            credentials: expectedLegacyCredentials,
          })
        );
      });

      it('defaults to us-east-1 if amazon URL is invalid', () => {
        provider.init(
          {
            ...legacyCredentials,
            amazon: 'https://invalid-url.com',
          },
          settings
        );

        expect(MockSESClient).toHaveBeenCalledWith(
          expect.objectContaining({
            region: 'us-east-1',
            endpoint: 'https://invalid-url.com',
            credentials: expectedLegacyCredentials,
          })
        );
      });
    });

    describe('with SDK options', () => {
      it('creates SES client with region only (IAM role)', () => {
        provider.init({ region: 'ap-southeast-1' }, settings);

        expect(MockSESClient).toHaveBeenCalledWith({
          region: 'ap-southeast-1',
        });
      });

      it('creates SES client with explicit credentials', () => {
        const providerOptions = {
          region: 'us-west-2',
          credentials: {
            accessKeyId: 'explicit-key',
            secretAccessKey: 'explicit-secret',
          },
        };

        provider.init(providerOptions, settings);

        expect(MockSESClient).toHaveBeenCalledWith(providerOptions);
      });
    });
  });

  describe('send', () => {
    const initProvider = () => provider.init({ region: 'us-east-1' }, settings);

    it('sends email with all fields', async () => {
      const instance = initProvider();

      await instance.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        replyTo: 'reply@example.com',
        subject: 'Test Subject',
        text: 'Plain text content',
        html: '<p>HTML content</p>',
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(MockSendEmailCommand).toHaveBeenCalledWith({
        Source: 'sender@example.com',
        Destination: {
          ToAddresses: ['recipient@example.com'],
          CcAddresses: ['cc@example.com'],
          BccAddresses: ['bcc@example.com'],
        },
        Message: {
          Subject: { Data: 'Test Subject', Charset: 'UTF-8' },
          Body: {
            Text: { Data: 'Plain text content', Charset: 'UTF-8' },
            Html: { Data: '<p>HTML content</p>', Charset: 'UTF-8' },
          },
        },
        ReplyToAddresses: ['reply@example.com'],
      });
    });

    it('uses default from and replyTo from settings', async () => {
      const instance = initProvider();

      await instance.send(createBaseEmailOptions());

      expect(MockSendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Source: 'default@example.com',
          ReplyToAddresses: ['default-reply@example.com'],
        })
      );
    });

    it('handles array of recipients', async () => {
      const instance = initProvider();

      await instance.send(
        createBaseEmailOptions({
          to: ['recipient1@example.com', 'recipient2@example.com'],
          cc: ['cc1@example.com', 'cc2@example.com'],
          bcc: ['bcc1@example.com', 'bcc2@example.com'],
        })
      );

      expect(MockSendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Destination: {
            ToAddresses: ['recipient1@example.com', 'recipient2@example.com'],
            CcAddresses: ['cc1@example.com', 'cc2@example.com'],
            BccAddresses: ['bcc1@example.com', 'bcc2@example.com'],
          },
        })
      );
    });

    it('handles undefined cc and bcc', async () => {
      const instance = initProvider();

      await instance.send(createBaseEmailOptions());

      expect(MockSendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Destination: {
            ToAddresses: ['recipient@example.com'],
            CcAddresses: undefined,
            BccAddresses: undefined,
          },
        })
      );
    });

    it('handles text-only email', async () => {
      const instance = initProvider();

      await instance.send(createBaseEmailOptions({ html: '' }));

      expect(MockSendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.objectContaining({
            Body: {
              Text: { Data: 'Plain text content', Charset: 'UTF-8' },
            },
          }),
        })
      );
      const commandInput = MockSendEmailCommand.mock.calls.at(-1)?.[0] as {
        Message: { Body: { Html?: unknown } };
      };
      expect(commandInput.Message.Body.Html).toBeUndefined();
    });

    it('handles html-only email', async () => {
      const instance = initProvider();

      await instance.send(createBaseEmailOptions({ text: '' }));

      expect(MockSendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.objectContaining({
            Body: {
              Html: { Data: '<p>HTML content</p>', Charset: 'UTF-8' },
            },
          }),
        })
      );
      const commandInput = MockSendEmailCommand.mock.calls.at(-1)?.[0] as {
        Message: { Body: { Text?: unknown } };
      };
      expect(commandInput.Message.Body.Text).toBeUndefined();
    });

    it('throws when SES client fails', async () => {
      const errorMessage = 'Email address not verified';
      mockSend.mockRejectedValueOnce(new Error(errorMessage));

      const instance = initProvider();

      await expect(instance.send(createBaseEmailOptions())).rejects.toThrow(errorMessage);
    });

    it('maps node-ses configurationSet on send', async () => {
      const instance = initProvider();

      await instance.send({
        ...createBaseEmailOptions(),
        configurationSet: 'tracked-set',
      });

      expect(MockSendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ConfigurationSetName: 'tracked-set',
        })
      );
      const commandInput = MockSendEmailCommand.mock.calls.at(-1)?.[0] as Record<string, unknown>;
      expect(commandInput).not.toHaveProperty('configurationSet');
    });

    it('maps node-ses messageTags on send', async () => {
      const instance = initProvider();

      await instance.send({
        ...createBaseEmailOptions(),
        messageTags: [{ name: 'env', value: 'staging' }],
      });

      expect(MockSendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Tags: [{ Name: 'env', Value: 'staging' }],
        })
      );
    });
  });
});
