import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createContentAPIRequest } from 'api-tests/request';

const validBody = {
  to: 'recipient@example.com',
  subject: 'Hello',
  text: 'Hello world',
};

const acceptedBodies = [
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
] as const;

const invalidBodies = [
  ['no `to`', { subject: 'Hello', text: 'Hello world' }],
  ['a numeric `subject`', { ...validBody, subject: 42 }],
  ['an object `text`', { ...validBody, text: { value: 'Hello world' } }],
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

    test.each(acceptedBodies)('sends %s to the provider', async (__, body) => {
      const res = await rq({ method: 'POST', url, body });

      expect(res.statusCode).toBe(200);
      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith(body);
    });

    test.each(invalidBodies)('answers 400 ValidationError for a body with %s', async (__, body) => {
      // A real provider fails on such input, which the controller turns into a 500
      send.mockRejectedValue(new Error('Invalid email options'));

      const res = await rq({ method: 'POST', url, body });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({ name: 'ValidationError', status: 400 });
      expect(send).not.toHaveBeenCalled();
    });
  });
});
