import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import emailProvider from '../index';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-ses', () => {
  const mockSend = jest.fn().mockResolvedValue({ MessageId: 'test-message-id' });
  return {
    SESClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    SendEmailCommand: jest.fn().mockImplementation((params) => params),
  };
});

describe('@strapi/provider-email-amazon-ses', () => {
  const mockSend = jest.fn().mockResolvedValue({ MessageId: 'test-message-id' });

  beforeEach(() => {
    jest.clearAllMocks();
    (SESClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
  });

  describe('init', () => {
    describe('with legacy options', () => {
      it('should create SES client with credentials from key/secret', () => {
        const providerOptions = {
          key: 'test-access-key',
          secret: 'test-secret-key',
        };

        const settings = {
          defaultFrom: 'from@example.com',
          defaultReplyTo: 'reply@example.com',
        };

        emailProvider.init(providerOptions, settings);

        expect(SESClient).toHaveBeenCalledWith({
          region: 'us-east-1',
          credentials: {
            accessKeyId: 'test-access-key',
            secretAccessKey: 'test-secret-key',
          },
        });
      });

      it('should extract region from amazon URL', () => {
        const providerOptions = {
          key: 'test-access-key',
          secret: 'test-secret-key',
          amazon: 'https://email.eu-west-1.amazonaws.com',
        };

        const settings = {
          defaultFrom: 'from@example.com',
          defaultReplyTo: 'reply@example.com',
        };

        emailProvider.init(providerOptions, settings);

        expect(SESClient).toHaveBeenCalledWith({
          region: 'eu-west-1',
          credentials: {
            accessKeyId: 'test-access-key',
            secretAccessKey: 'test-secret-key',
          },
        });
      });

      it('should default to us-east-1 if amazon URL is invalid', () => {
        const providerOptions = {
          key: 'test-access-key',
          secret: 'test-secret-key',
          amazon: 'https://invalid-url.com',
        };

        const settings = {
          defaultFrom: 'from@example.com',
          defaultReplyTo: 'reply@example.com',
        };

        emailProvider.init(providerOptions, settings);

        expect(SESClient).toHaveBeenCalledWith({
          region: 'us-east-1',
          credentials: {
            accessKeyId: 'test-access-key',
            secretAccessKey: 'test-secret-key',
          },
        });
      });
    });

    describe('with SDK options', () => {
      it('should create SES client with region only (IAM role)', () => {
        const providerOptions = {
          region: 'ap-southeast-1',
        };

        const settings = {
          defaultFrom: 'from@example.com',
          defaultReplyTo: 'reply@example.com',
        };

        emailProvider.init(providerOptions, settings);

        expect(SESClient).toHaveBeenCalledWith({
          region: 'ap-southeast-1',
        });
      });

      it('should create SES client with explicit credentials', () => {
        const providerOptions = {
          region: 'us-west-2',
          credentials: {
            accessKeyId: 'explicit-key',
            secretAccessKey: 'explicit-secret',
          },
        };

        const settings = {
          defaultFrom: 'from@example.com',
          defaultReplyTo: 'reply@example.com',
        };

        emailProvider.init(providerOptions, settings);

        expect(SESClient).toHaveBeenCalledWith({
          region: 'us-west-2',
          credentials: {
            accessKeyId: 'explicit-key',
            secretAccessKey: 'explicit-secret',
          },
        });
      });

      it('should default to us-east-1 if no region provided', () => {
        const providerOptions = {};

        const settings = {
          defaultFrom: 'from@example.com',
          defaultReplyTo: 'reply@example.com',
        };

        emailProvider.init(providerOptions, settings);

        expect(SESClient).toHaveBeenCalledWith({
          region: 'us-east-1',
        });
      });
    });
  });

  describe('send', () => {
    it('should send email with all fields', async () => {
      const providerOptions = { region: 'us-east-1' };
      const settings = {
        defaultFrom: 'default@example.com',
        defaultReplyTo: 'default-reply@example.com',
      };

      const provider = emailProvider.init(providerOptions, settings);

      await provider.send({
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
      expect(SendEmailCommand).toHaveBeenCalledWith({
        Source: 'sender@example.com',
        Destination: {
          ToAddresses: ['recipient@example.com'],
          CcAddresses: ['cc@example.com'],
          BccAddresses: ['bcc@example.com'],
        },
        Message: {
          Subject: {
            Data: 'Test Subject',
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: 'Plain text content',
              Charset: 'UTF-8',
            },
            Html: {
              Data: '<p>HTML content</p>',
              Charset: 'UTF-8',
            },
          },
        },
        ReplyToAddresses: ['reply@example.com'],
      });
    });

    it('should use default from and replyTo from settings', async () => {
      const providerOptions = { region: 'us-east-1' };
      const settings = {
        defaultFrom: 'default@example.com',
        defaultReplyTo: 'default-reply@example.com',
      };

      const provider = emailProvider.init(providerOptions, settings);

      await provider.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Plain text content',
        html: '<p>HTML content</p>',
      });

      expect(SendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Source: 'default@example.com',
          ReplyToAddresses: ['default-reply@example.com'],
        })
      );
    });

    it('should handle array of recipients', async () => {
      const providerOptions = { region: 'us-east-1' };
      const settings = {
        defaultFrom: 'default@example.com',
        defaultReplyTo: 'default-reply@example.com',
      };

      const provider = emailProvider.init(providerOptions, settings);

      await provider.send({
        to: ['recipient1@example.com', 'recipient2@example.com'],
        cc: ['cc1@example.com', 'cc2@example.com'],
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
        subject: 'Test Subject',
        text: 'Plain text content',
        html: '<p>HTML content</p>',
      });

      expect(SendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Destination: {
            ToAddresses: ['recipient1@example.com', 'recipient2@example.com'],
            CcAddresses: ['cc1@example.com', 'cc2@example.com'],
            BccAddresses: ['bcc1@example.com', 'bcc2@example.com'],
          },
        })
      );
    });

    it('should handle undefined cc and bcc', async () => {
      const providerOptions = { region: 'us-east-1' };
      const settings = {
        defaultFrom: 'default@example.com',
        defaultReplyTo: 'default-reply@example.com',
      };

      const provider = emailProvider.init(providerOptions, settings);

      await provider.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Plain text content',
        html: '<p>HTML content</p>',
      });

      expect(SendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Destination: {
            ToAddresses: ['recipient@example.com'],
            CcAddresses: undefined,
            BccAddresses: undefined,
          },
        })
      );
    });

    it('should handle text-only email', async () => {
      const providerOptions = { region: 'us-east-1' };
      const settings = {
        defaultFrom: 'default@example.com',
        defaultReplyTo: 'default-reply@example.com',
      };

      const provider = emailProvider.init(providerOptions, settings);

      await provider.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Plain text content',
        html: '',
      });

      expect(SendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.objectContaining({
            Body: {
              Text: {
                Data: 'Plain text content',
                Charset: 'UTF-8',
              },
              Html: undefined,
            },
          }),
        })
      );
    });

    it('should handle html-only email', async () => {
      const providerOptions = { region: 'us-east-1' };
      const settings = {
        defaultFrom: 'default@example.com',
        defaultReplyTo: 'default-reply@example.com',
      };

      const provider = emailProvider.init(providerOptions, settings);

      await provider.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: '',
        html: '<p>HTML content</p>',
      });

      expect(SendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.objectContaining({
            Body: {
              Text: undefined,
              Html: {
                Data: '<p>HTML content</p>',
                Charset: 'UTF-8',
              },
            },
          }),
        })
      );
    });

    it('should throw error when SES client fails', async () => {
      const errorMessage = 'Email address not verified';
      mockSend.mockRejectedValueOnce(new Error(errorMessage));

      const providerOptions = { region: 'us-east-1' };
      const settings = {
        defaultFrom: 'default@example.com',
        defaultReplyTo: 'default-reply@example.com',
      };

      const provider = emailProvider.init(providerOptions, settings);

      await expect(
        provider.send({
          to: 'recipient@example.com',
          subject: 'Test Subject',
          text: 'Plain text content',
          html: '<p>HTML content</p>',
        })
      ).rejects.toThrow(errorMessage);
    });

    it('should rethrow non-Error exceptions', async () => {
      mockSend.mockRejectedValueOnce('string error');

      const providerOptions = { region: 'us-east-1' };
      const settings = {
        defaultFrom: 'default@example.com',
        defaultReplyTo: 'default-reply@example.com',
      };

      const provider = emailProvider.init(providerOptions, settings);

      await expect(
        provider.send({
          to: 'recipient@example.com',
          subject: 'Test Subject',
          text: 'Plain text content',
          html: '<p>HTML content</p>',
        })
      ).rejects.toBe('string error');
    });
  });
});
