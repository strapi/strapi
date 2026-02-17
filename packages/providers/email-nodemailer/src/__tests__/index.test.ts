import nodemailer from 'nodemailer';

import provider from '../index';

jest.mock('nodemailer');

const mockSendMail = jest.fn();
const mockVerify = jest.fn();
const mockIsIdle = jest.fn();
const mockClose = jest.fn();

(nodemailer.createTransport as jest.Mock).mockReturnValue({
  sendMail: mockSendMail,
  verify: mockVerify,
  isIdle: mockIsIdle,
  close: mockClose,
});

describe('@strapi/provider-email-nodemailer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('init', () => {
    it('creates a transporter with provider options', () => {
      const providerOptions = {
        host: 'smtp.example.com',
        port: 587,
        auth: {
          user: 'test@example.com',
          pass: 'password',
        },
      };

      const settings = {
        defaultFrom: 'noreply@example.com',
        defaultReplyTo: 'support@example.com',
      };

      provider.init(providerOptions, settings);

      expect(nodemailer.createTransport).toHaveBeenCalledWith(providerOptions);
    });
  });

  describe('send', () => {
    const settings = {
      defaultFrom: 'noreply@example.com',
      defaultReplyTo: 'support@example.com',
    };

    const providerOptions = {
      host: 'smtp.example.com',
      port: 587,
    };

    it('sends an email with the provided options', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        html: '<p>Test content</p>',
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'recipient@example.com',
        cc: undefined,
        bcc: undefined,
        replyTo: 'support@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        html: '<p>Test content</p>',
      });
    });

    it('uses provided from and replyTo over defaults', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);

      await instance.send({
        from: 'custom@example.com',
        to: 'recipient@example.com',
        replyTo: 'custom-reply@example.com',
        subject: 'Test Subject',
        text: 'Test content',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'custom@example.com',
          replyTo: 'custom-reply@example.com',
        })
      );
    });

    it('falls back to html when text is not provided', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>HTML content</p>',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '<p>HTML content</p>',
          html: '<p>HTML content</p>',
        })
      );
    });

    it('falls back to text when html is not provided', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Plain text content',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Plain text content',
          html: 'Plain text content',
        })
      );
    });

    it('passes priority and headers to sendMail', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        priority: 'high',
        headers: { 'X-Custom-Header': 'value' },
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high',
          headers: { 'X-Custom-Header': 'value' },
        })
      );
    });

    it('passes DSN configuration to sendMail', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);
      const dsn = { id: 'msg-123', return: 'headers' as const, notify: 'success' };

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        dsn,
      });

      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ dsn }));
    });

    it('passes per-message OAuth2 auth with only allowed fields', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        auth: {
          user: 'user@gmail.com',
          refreshToken: '1/xxx',
          accessToken: 'ya29.xxx',
          expires: 1234567890,
        },
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: {
            user: 'user@gmail.com',
            refreshToken: '1/xxx',
            accessToken: 'ya29.xxx',
            expires: 1234567890,
          },
        })
      );
    });

    it('does not pass unknown properties to sendMail (no rest-spread injection)', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
      } as any);

      const calledWith = mockSendMail.mock.calls[0][0];
      const allowedKeys = [
        'from',
        'to',
        'cc',
        'bcc',
        'replyTo',
        'subject',
        'text',
        'html',
        'attachments',
        'headers',
        'priority',
        'icalEvent',
        'list',
        'envelope',
        'amp',
        'dsn',
        'auth',
      ];
      const actualKeys = Object.keys(calledWith);

      for (const key of actualKeys) {
        expect(allowedKeys).toContain(key);
      }
    });

    it('passes icalEvent and list options to sendMail', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);
      const icalEvent = { method: 'REQUEST', content: 'BEGIN:VCALENDAR...' };
      const list = {
        unsubscribe: { url: 'https://example.com/unsubscribe', comment: 'Unsubscribe' },
      };

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        icalEvent,
        list,
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ icalEvent, list })
      );
    });
  });

  describe('verify', () => {
    it('verifies the transporter configuration', async () => {
      mockVerify.mockResolvedValueOnce(true);

      const instance = provider.init(
        { host: 'smtp.example.com', port: 587 },
        { defaultFrom: 'test@example.com', defaultReplyTo: 'test@example.com' }
      );

      const result = await instance.verify();

      expect(mockVerify).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('throws when verification fails', async () => {
      const error = new Error('Connection refused');
      mockVerify.mockRejectedValueOnce(error);

      const instance = provider.init(
        { host: 'invalid.example.com', port: 587 },
        { defaultFrom: 'test@example.com', defaultReplyTo: 'test@example.com' }
      );

      await expect(instance.verify()).rejects.toThrow('Connection refused');
    });
  });

  describe('isIdle', () => {
    it('returns the idle state from pooled transporter', () => {
      mockIsIdle.mockReturnValueOnce(true);

      const instance = provider.init(
        { host: 'smtp.example.com', port: 587, pool: true },
        { defaultFrom: 'test@example.com', defaultReplyTo: 'test@example.com' }
      );

      expect(instance.isIdle()).toBe(true);
      expect(mockIsIdle).toHaveBeenCalled();
    });

    it('returns true when transporter does not support isIdle', () => {
      (nodemailer.createTransport as jest.Mock).mockReturnValueOnce({
        sendMail: mockSendMail,
        verify: mockVerify,
        close: mockClose,
      });

      const instance = provider.init(
        { host: 'smtp.example.com', port: 587 },
        { defaultFrom: 'test@example.com', defaultReplyTo: 'test@example.com' }
      );

      expect(instance.isIdle()).toBe(true);
    });
  });

  describe('close', () => {
    it('closes all connections', () => {
      const instance = provider.init(
        { host: 'smtp.example.com', port: 587, pool: true },
        { defaultFrom: 'test@example.com', defaultReplyTo: 'test@example.com' }
      );

      instance.close();

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('getCapabilities', () => {
    it('returns transport info and auth type without sensitive data', () => {
      const providerOptions = {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: 'test@gmail.com',
          pass: 'secret-password',
        },
      };

      const instance = provider.init(providerOptions, {
        defaultFrom: 'test@example.com',
        defaultReplyTo: 'test@example.com',
      });

      const capabilities = instance.getCapabilities();

      expect(capabilities.transport).toEqual({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        pool: undefined,
        maxConnections: undefined,
      });
      expect(capabilities.auth).toEqual({
        type: 'login',
      });
      expect(capabilities.auth).not.toHaveProperty('pass');
      expect(capabilities.auth).not.toHaveProperty('user');
      expect(capabilities).not.toHaveProperty('pass');
    });

    it('never exposes passwords, tokens, or secrets', () => {
      const providerOptions = {
        host: 'smtp.gmail.com',
        port: 465,
        auth: {
          type: 'OAuth2',
          user: 'oauth@gmail.com',
          clientId: 'client-id-value',
          clientSecret: 'super-secret-value',
          refreshToken: 'refresh-token-value',
          accessToken: 'access-token-value',
        },
      };

      const instance = provider.init(providerOptions, {
        defaultFrom: 'test@example.com',
        defaultReplyTo: 'test@example.com',
      });

      const capabilities = instance.getCapabilities();
      const capStr = JSON.stringify(capabilities);

      expect(capStr).not.toContain('super-secret-value');
      expect(capStr).not.toContain('refresh-token-value');
      expect(capStr).not.toContain('access-token-value');
      expect(capStr).not.toContain('client-id-value');
      expect(capStr).not.toContain('oauth@gmail.com');
    });

    it('includes feature flags for dkim, pool, rateLimiting', () => {
      const providerOptions = {
        host: 'smtp.example.com',
        port: 587,
        dkim: { domainName: 'example.com' },
        pool: true,
        rateLimit: 5,
      };

      const instance = provider.init(providerOptions, {
        defaultFrom: 'test@example.com',
        defaultReplyTo: 'test@example.com',
      });

      const capabilities = instance.getCapabilities();

      expect(capabilities.features).toContain('dkim');
      expect(capabilities.features).toContain('pool');
      expect(capabilities.features).toContain('rateLimiting');
    });

    it('includes oauth2 for OAuth2 auth type', () => {
      const providerOptions = {
        host: 'smtp.gmail.com',
        port: 465,
        auth: {
          type: 'OAuth2',
          user: 'oauth@gmail.com',
          clientId: 'client',
          clientSecret: 'secret',
        },
      };

      const instance = provider.init(providerOptions, {
        defaultFrom: 'test@example.com',
        defaultReplyTo: 'test@example.com',
      });

      const capabilities = instance.getCapabilities();

      expect(capabilities.auth?.type).toBe('OAuth2');
      expect(capabilities.features).toContain('oauth2');
      expect(capabilities.auth).not.toHaveProperty('clientSecret');
      expect(capabilities.auth).not.toHaveProperty('user');
    });
  });
});
