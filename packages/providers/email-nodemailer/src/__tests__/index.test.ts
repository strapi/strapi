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

    it('respects empty string for text without falling back to html', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: '',
        html: '<p>HTML only</p>',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '',
          html: '<p>HTML only</p>',
        })
      );
    });

    it('respects empty string for html without falling back to text', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Plain text',
        html: '',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Plain text',
          html: '',
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
        'sender',
        'subject',
        'text',
        'html',
        'watchHtml',
        'amp',
        'attachments',
        'alternatives',
        'headers',
        'priority',
        'messageId',
        'date',
        'xMailer',
        'inReplyTo',
        'references',
        'textEncoding',
        'encoding',
        'normalizeHeaderKey',
        'icalEvent',
        'list',
        'envelope',
        'dkim',
        'attachDataUrls',
        'disableUrlAccess',
        'disableFileAccess',
        'raw',
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

      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ icalEvent, list }));
    });

    it('passes threading options (inReplyTo, references)', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Re: Test Subject',
        text: 'Reply content',
        inReplyTo: '<original-msg-id@example.com>',
        references: ['<original-msg-id@example.com>', '<prev-msg-id@example.com>'],
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          inReplyTo: '<original-msg-id@example.com>',
          references: ['<original-msg-id@example.com>', '<prev-msg-id@example.com>'],
        })
      );
    });

    it('passes sender for "on behalf of" emails', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        sender: 'actual-sender@example.com',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ sender: 'actual-sender@example.com' })
      );
    });

    it('passes per-message DKIM options', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);
      const dkim = {
        domainName: 'example.com',
        keySelector: 'default',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\n...',
      };

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        dkim,
      });

      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ dkim }));
    });

    it('passes security flags (disableUrlAccess, disableFileAccess)', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        disableUrlAccess: true,
        disableFileAccess: true,
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          disableUrlAccess: true,
          disableFileAccess: true,
        })
      );
    });

    it('passes encoding and metadata options', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        messageId: '<custom-id@example.com>',
        date: new Date('2026-01-01T00:00:00Z'),
        textEncoding: 'base64',
        xMailer: false,
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: '<custom-id@example.com>',
          date: new Date('2026-01-01T00:00:00Z'),
          textEncoding: 'base64',
          xMailer: false,
        })
      );
    });

    it('passes raw MIME content', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);
      const rawMime =
        'From: sender@example.com\r\nTo: recipient@example.com\r\nSubject: Raw\r\n\r\nBody';

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        raw: rawMime,
      });

      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ raw: rawMime }));
    });

    it('passes alternatives and attachDataUrls', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: '<test@example.com>' });

      const instance = provider.init(providerOptions, settings);
      const alternatives = [{ contentType: 'text/x-web-markdown', content: '**Bold**' }];

      await instance.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        alternatives,
        attachDataUrls: true,
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ alternatives, attachDataUrls: true })
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
        user: 'test@gmail.com',
      });
      expect(capabilities.auth).not.toHaveProperty('pass');
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
      expect(capabilities.auth?.user).toBe('oauth@gmail.com');
    });

    it('includes feature flags for dkim, pool, rateLimiting, proxy', () => {
      const providerOptions = {
        host: 'smtp.example.com',
        port: 587,
        dkim: { domainName: 'example.com' },
        pool: true,
        rateLimit: 5,
        proxy: 'socks5://proxy.example.com:1080',
      };

      const instance = provider.init(providerOptions, {
        defaultFrom: 'test@example.com',
        defaultReplyTo: 'test@example.com',
      });

      const capabilities = instance.getCapabilities();

      expect(capabilities.features).toContain('dkim');
      expect(capabilities.features).toContain('pool');
      expect(capabilities.features).toContain('rateLimiting');
      expect(capabilities.features).toContain('proxy');
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
      expect(capabilities.auth?.user).toBe('oauth@gmail.com');
      expect(capabilities.features).toContain('oauth2');
      expect(capabilities.auth).not.toHaveProperty('clientSecret');
    });
  });
});
