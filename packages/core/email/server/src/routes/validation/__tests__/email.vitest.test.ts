import { describe, expect, it } from 'vitest';
import type { Core } from '@strapi/types';

import { EmailRouteValidator } from '../email';

const schema = new EmailRouteValidator({} as Core.Strapi).sendEmailInput;

const base = { to: 'recipient@example.com', subject: 'Hello' };

describe('EmailRouteValidator.sendEmailInput', () => {
  it.each([
    ['a text body', { ...base, text: 'Hello' }],
    ['an html-only body', { ...base, html: '<p>Hello</p>' }],
    [
      'recipient arrays',
      { ...base, text: 'Hello', to: ['a@example.com'], cc: [], bcc: ['b@x.io'] },
    ],
    ['non-string provider options', { ...base, text: 'Hello', attachments: [{ filename: 'a' }] }],
  ])('accepts %s and keeps every key', (_, body) => {
    expect(schema.parse(body)).toEqual(body);
  });

  it.each([
    ['no `to`', { subject: 'Hello', text: 'Hello' }],
    ['no `subject`', { to: 'recipient@example.com', text: 'Hello' }],
    ['neither `text` nor `html`', base],
    ['a numeric `to` entry', { ...base, text: 'Hello', to: ['a@example.com', 42] }],
    ['an object `text`', { ...base, text: { value: 'Hello' } }],
  ])('rejects a body with %s', (_, body) => {
    expect(schema.safeParse(body).success).toBe(false);
  });
});
