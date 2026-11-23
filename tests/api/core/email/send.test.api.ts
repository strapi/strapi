import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createContentAPIRequest } from 'api-tests/request';

const validBody = {
  to: 'recipient@example.com',
  subject: 'Hello',
  text: 'Hello world',
};

// The route is a pass-through: every object body reaches the provider unchanged,
// including shapes outside the documented `SendOptions` contract
const passedBodies = [
  ['a text body', validBody],
  ['an html-only body', { to: 'recipient@example.com', subject: 'Hello', html: '<p>Hello</p>' }],
  [
    'recipient arrays',
    {
      ...validBody,
      to: ['first@example.com', 'second@example.com'],
      cc: ['cc@example.com'],
      bcc: ['bcc@example.com'],
    },
  ],
  [
    'non-string provider options',
    {
      ...validBody,
      attachments: [{ filename: 'hello.txt', content: 'Hello world' }],
      headers: { 'X-Custom': 'value' },
    },
  ],
  ['neither `text` nor `html`', { to: 'recipient@example.com', subject: 'Hello' }],
  [
    'a SendGrid-style template-only body',
    {
      to: 'recipient@example.com',
      templateId: 'd-123',
      dynamicTemplateData: { name: 'Ada' },
    },
  ],
  [
    'a nodemailer `raw` body',
    { to: 'recipient@example.com', raw: 'Subject: Hello\r\n\r\nHello world' },
  ],
  [
    'null optional fields',
    { ...validBody, from: null, cc: null, bcc: null, replyTo: null, html: null },
  ],
  ['an address-object `to`', { ...validBody, to: { name: 'Ada', address: 'ada@example.com' } }],
  ['a `replyTo` array', { ...validBody, replyTo: ['first@example.com', 'second@example.com'] }],
  ['a body without `to`', { subject: 'Hello', text: 'Hello world' }],
  ['a numeric `subject`', { ...validBody, subject: 42 }],
  ['an object `text`', { ...validBody, text: { value: 'Hello world' } }],
] as const;

// Sent as raw JSON text so the request carries exactly this payload. The strict JSON body
// parser rejects top-level primitives before the controller; the controller rejects arrays.
const nonObjectBodies = [
  ['an array', JSON.stringify([validBody]), 'ValidationError'],
  ['a string', JSON.stringify('hello'), 'SyntaxError'],
  ['a null', JSON.stringify(null), 'SyntaxError'],
] as const;

describe('Email - POST /email', () => {
  let strapi;
  let originalProvider;
  const send = jest.fn();

  const routes = [
    ['content API', '/email', () => createContentAPIRequest({ strapi })],
    ['admin', '/email', () => createAuthRequest({ strapi })],
  ] as const;

  beforeAll(async () => {
    strapi = await createStrapiInstance();

    // Replace the provider so no real email is sent
    originalProvider = strapi.plugin('email').provider;
    strapi.plugin('email').provider = { send };
  });

  afterAll(async () => {
    strapi.plugin('email').provider = originalProvider;
    await strapi.destroy();
  });

  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue(undefined);
  });

  describe.each(routes)('%s route', (_, url, createRequest) => {
    let rq;

    beforeAll(async () => {
      rq = await createRequest();
    });

    test.each(passedBodies)('sends %s to the provider', async (__, body) => {
      const res = await rq({ method: 'POST', url, body });

      expect(res.statusCode).toBe(200);
      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith(body);
    });

    test.each(nonObjectBodies)('answers 400 for %s body', async (__, body, errorName) => {
      const res = await rq({ method: 'POST', url, body });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({ name: errorName, status: 400 });
      expect(send).not.toHaveBeenCalled();
    });
  });
});
