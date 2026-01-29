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
        replyTo: 'support@example.com',
        subject: 'Test Subject',
        text: 'Test content',
        html: '<p>Test content</p>',
        cc: undefined,
        bcc: undefined,
        attachments: undefined,
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

    it('passes additional options to sendMail', async () => {
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
});
