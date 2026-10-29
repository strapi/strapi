import { createStrapiInstance } from 'api-tests/strapi';
import { createContentAPIRequest } from 'api-tests/request';

const validBody = {
  to: 'recipient@example.com',
  subject: 'Hello',
  text: 'Hello world',
};

describe('Email Content API - POST /email', () => {
  let strapi;
  let rq;
  let originalProvider;
  const send = jest.fn();

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

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

  test('sends a valid body to the provider', async () => {
    const res = await rq({ method: 'POST', url: '/email', body: validBody });

    expect(res.statusCode).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(validBody);
  });

  test.each([
    ['no `to`', { subject: 'Hello', text: 'Hello world' }],
    ['a numeric `subject`', { ...validBody, subject: 42 }],
    ['an object `text`', { ...validBody, text: { value: 'Hello world' } }],
  ])('answers 400 ValidationError for a body with %s', async (_, body) => {
    // A real provider fails on such input, which the controller turns into a 500
    send.mockRejectedValue(new Error('Invalid email options'));

    const res = await rq({ method: 'POST', url: '/email', body });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatchObject({ name: 'ValidationError', status: 400 });
    expect(send).not.toHaveBeenCalled();
  });
});
