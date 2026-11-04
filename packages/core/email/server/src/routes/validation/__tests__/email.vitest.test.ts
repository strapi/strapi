import { describe, expect, it } from 'vitest';
import type { Core } from '@strapi/types';

import { EmailRouteValidator } from '../email';

const schema = new EmailRouteValidator({} as Core.Strapi).sendEmailInput;

const base = { to: 'recipient@example.com', subject: 'Hello' };

describe('EmailRouteValidator.sendEmailInput', () => {
  it.each([
    ['a text body', { ...base, text: 'Hello' }],
    ['an html-only body', { ...base, html: '<p>Hello</p>' }],
    ['neither `text` nor `html`', base],
    [
      'recipient arrays',
      { ...base, text: 'Hello', to: ['a@example.com'], cc: [], bcc: ['b@x.io'] },
    ],
    [
      'address objects',
      {
        ...base,
        text: 'Hello',
        from: { name: 'Sender', address: 'sender@example.com' },
        to: { name: 'Recipient', address: 'recipient@example.com' },
        cc: ['a@example.com', { address: 'b@example.com' }],
      },
    ],
    ['a `replyTo` array', { ...base, text: 'Hello', replyTo: ['a@example.com', 'b@example.com'] }],
    [
      'null optional fields',
      { ...base, from: null, cc: null, bcc: null, replyTo: null, text: null, html: '<p>Hi</p>' },
    ],
    [
      'a template-only body',
      { to: 'recipient@example.com', templateId: 'd-123', dynamicTemplateData: { name: 'Ada' } },
    ],
    ['a `raw` body', { to: 'recipient@example.com', raw: 'Subject: Hello\r\n\r\nHello' }],
    ['non-string provider options', { ...base, text: 'Hello', attachments: [{ filename: 'a' }] }],
  ])('accepts %s and keeps every key', (_, body) => {
    expect(schema.parse(body)).toEqual(body);
  });

  it.each([
    ['no `to`', { subject: 'Hello', text: 'Hello' }],
    ['a null `to`', { ...base, to: null, text: 'Hello' }],
    ['a numeric `subject`', { ...base, subject: 42, text: 'Hello' }],
    ['a numeric `to` entry', { ...base, text: 'Hello', to: ['a@example.com', 42] }],
    ['an address object without `address`', { ...base, text: 'Hello', to: { name: 'Ada' } }],
    ['an object `text`', { ...base, text: { value: 'Hello' } }],
  ])('rejects a body with %s', (_, body) => {
    expect(schema.safeParse(body).success).toBe(false);
  });
});
