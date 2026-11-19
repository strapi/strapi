import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import createEmailService from '../email';

describe('Email service', () => {
  const providerSend = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    global.strapi = {
      plugin: vi.fn(() => ({ provider: { send: providerSend } })),
    } as unknown as Core.Strapi;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('sendTemplatedEmail', () => {
    const emailOptions = { to: 'user@example.com' };
    const data = {
      user: { email: 'user@example.com', firstname: 'Kai', lastname: 'Doe', username: 'kai' },
    };

    it('fills subject, text and html with the data', async () => {
      await createEmailService().sendTemplatedEmail(
        emailOptions,
        {
          subject: 'Hello <%= user.firstname %>',
          text: 'Text for <%= user.username %>',
          html: '<p>Html for <%= user.username %></p>',
        },
        data
      );

      expect(providerSend).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Hello Kai',
        text: 'Text for kai',
        html: '<p>Html for kai</p>',
      });
    });

    it('sends a template without html', async () => {
      await createEmailService().sendTemplatedEmail(
        emailOptions,
        { subject: 'Hello <%= user.firstname %>', text: 'Text for <%= user.username %>' },
        data
      );

      expect(providerSend).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Hello Kai',
        text: 'Text for kai',
      });
    });

    it('sends no subject or text when the template has them empty', async () => {
      await createEmailService().sendTemplatedEmail(
        emailOptions,
        { subject: '', text: '', html: '<p>Html for <%= user.username %></p>' },
        data
      );

      expect(providerSend).toHaveBeenCalledWith({
        to: 'user@example.com',
        html: '<p>Html for kai</p>',
      });
      expect(providerSend.mock.calls[0][0]).not.toHaveProperty('subject');
      expect(providerSend.mock.calls[0][0]).not.toHaveProperty('text');
    });

    it('throws when a required attribute is missing', () => {
      expect(() =>
        createEmailService().sendTemplatedEmail(
          emailOptions,
          // @ts-expect-error - text is required
          { subject: 'Hello' },
          data
        )
      ).toThrow('Following attributes are missing from your email template : text');
    });
  });
});
