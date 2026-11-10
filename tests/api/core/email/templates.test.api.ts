import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

const KEY = 'api-test.reset-password';

const definition = {
  defaults: {
    subject: 'Reset for {{ user.name }}',
    html: '<p>{{ url }}</p>',
    text: '{{ url }}',
  },
  variables: ['user.name', 'url'],
  description: 'API test template',
};

const SECRET_KEY = 'api-test.secret-link';

const secretDefinition = {
  defaults: {
    subject: 'Your link',
    html: '<p><a href="{{ url }}">Open</a></p>',
    text: '{{ url }}',
  },
  variables: [{ name: 'url', secret: true }],
  description: 'API test template with a secret variable',
};

// No existing API file covers the email plugin, so templates get their own file.
describe('Email templates (admin API)', () => {
  let strapi: Core.Strapi;
  let utils: ReturnType<typeof createUtils>;
  let admin: ReturnType<typeof createAuthRequest> extends Promise<infer R> ? R : never;
  let restricted: typeof admin;
  let send: jest.Mock;
  let role: { id: number };
  let user: { id: number };

  const restrictedUser = { email: 'email-templates-restricted@user.io', password: 'Restricted123' };

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      bootstrap: ({ strapi: instance }: { strapi: Core.Strapi }) => {
        const templates = instance.plugin('email').service('templates');

        templates.register(KEY, definition);
        templates.register(SECRET_KEY, secretDefinition);
      },
    });
    utils = createUtils(strapi);

    // The test never reaches a real mail provider.
    send = jest.fn().mockResolvedValue(undefined);
    strapi.plugin('email').provider = { send };

    role = await utils.createRole({ name: 'email-templates-restricted', description: '' });
    user = await utils.createUserIfNotExists({ ...restrictedUser, roles: [role.id] });

    admin = await createAuthRequest({ strapi });
    restricted = await createAuthRequest({ strapi, userInfo: restrictedUser });
  });

  afterAll(async () => {
    await strapi.db
      .query('plugin::email.template')
      .deleteMany({ where: { key: { $in: [KEY, SECRET_KEY] } } });
    await utils.deleteUserById((user as any)?.id);
    await utils.deleteRolesById([role.id]);
    await strapi.destroy();
  });

  test('an admin with templates.update edits a template and a GET returns it', async () => {
    const body = { subject: 'Hello {{ user.name }}', html: '<b>{{ url }}</b>', text: '{{ url }}' };

    const put = await admin({ method: 'PUT', url: `/email/templates/${KEY}?locale=en`, body });
    expect(put.statusCode).toBe(200);
    expect(put.body.data).toMatchObject({ key: KEY, locale: 'en', ...body, isDefault: false });
    expect(put.body.data).not.toHaveProperty('id');

    const get = await admin({ method: 'GET', url: `/email/templates/${KEY}?locale=en` });
    expect(get.statusCode).toBe(200);
    expect(get.body.data).toMatchObject({ ...body, variables: ['user.name', 'url'] });

    const list = await admin({ method: 'GET', url: '/email/templates?prefix=api-test.' });
    expect(list.statusCode).toBe(200);
    expect(list.body.data).toEqual([
      { key: KEY, description: 'API test template', locales: ['en'], customized: true },
      {
        key: SECRET_KEY,
        description: secretDefinition.description,
        locales: ['en'],
        customized: false,
      },
    ]);

    const reset = await admin({ method: 'DELETE', url: `/email/templates/${KEY}?locale=en` });
    expect(reset.statusCode).toBe(200);

    const after = await admin({ method: 'GET', url: `/email/templates/${KEY}?locale=en` });
    expect(after.body.data).toMatchObject({
      subject: definition.defaults.subject,
      isDefault: true,
    });
  });

  test('an admin without templates.update gets 403', async () => {
    const body = { subject: 's', html: 'h', text: 't' };

    const put = await restricted({ method: 'PUT', url: `/email/templates/${KEY}?locale=en`, body });
    expect(put.statusCode).toBe(403);

    const del = await restricted({ method: 'DELETE', url: `/email/templates/${KEY}?locale=en` });
    expect(del.statusCode).toBe(403);

    const test = await restricted({ method: 'POST', url: `/email/templates/${KEY}/test` });
    expect(test.statusCode).toBe(403);

    const get = await restricted({ method: 'GET', url: `/email/templates/${KEY}` });
    expect(get.statusCode).toBe(403);
  });

  test('POST /email/templates/:key/test sends to the admin with sample data', async () => {
    const res = await admin({ method: 'POST', url: `/email/templates/${KEY}/test?locale=en` });

    expect(res.statusCode).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@strapi.io',
        subject: 'Reset for [user.name]',
        html: '<p>[url]</p>',
        text: '[url]',
      })
    );
  });

  test('an unknown key is a 404', async () => {
    const res = await admin({ method: 'GET', url: '/email/templates/api-test.nope' });

    expect(res.statusCode).toBe(404);
  });
  describe('hardening', () => {
    const body = { subject: 'Your link', text: '{{ url }}' };

    afterEach(async () => {
      await strapi.db.query('plugin::email.template').deleteMany({ where: { key: SECRET_KEY } });
      send.mockClear();
    });

    test('refuses a secret variable in an image source and names it', async () => {
      const put = await admin({
        method: 'PUT',
        url: `/email/templates/${SECRET_KEY}?locale=en`,
        body: { ...body, html: '<p><img src="{{ url }}" alt=""></p>' },
      });

      expect(put.statusCode).toBe(400);
      expect(put.body.error.message).toContain('{{ url }}');

      const stored = await strapi.db
        .query('plugin::email.template')
        .findOne({ where: { key: SECRET_KEY } });
      expect(stored).toBeNull();
    });

    test('refuses a secret variable in an attribute other than the href of a link', async () => {
      const put = await admin({
        method: 'PUT',
        url: `/email/templates/${SECRET_KEY}?locale=en`,
        body: { ...body, html: '<a href="https://example.com" title="{{ url }}">Open</a>' },
      });

      expect(put.statusCode).toBe(400);
      expect(put.body.error.message).toContain('{{ url }}');
    });

    test('accepts a secret variable in text and in the href of a link', async () => {
      const html = '<p>{{ url }}</p><a href="{{ url }}">Open</a>';

      const put = await admin({
        method: 'PUT',
        url: `/email/templates/${SECRET_KEY}?locale=en`,
        body: { ...body, html },
      });

      expect(put.statusCode).toBe(200);
      expect(put.body.data.html).toBe(html);
    });

    test('strips a script element and an event handler when a template is saved', async () => {
      const put = await admin({
        method: 'PUT',
        url: `/email/templates/${KEY}?locale=en`,
        body: {
          subject: 'Hello',
          html: '<p onclick="steal()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>',
          text: '{{ url }}',
        },
      });

      expect(put.statusCode).toBe(200);
      expect(put.body.data.html).not.toMatch(/script|onclick|javascript:|alert/i);
      expect(put.body.data.html).toContain('Hi');

      const row = await strapi.db.query('plugin::email.template').findOne({ where: { key: KEY } });
      expect(row.html).toBe(put.body.data.html);

      await admin({ method: 'DELETE', url: `/email/templates/${KEY}?locale=en` });
    });

    test('sends the registered default when a stored template puts a secret where it could leak', async () => {
      // Written to the table, as a row saved before the checks, or by something other than the route, would be
      await strapi.db.query('plugin::email.template').create({
        data: {
          key: SECRET_KEY,
          locale: 'en',
          subject: 'Stored subject',
          html: '<p><img src="{{ url }}" alt=""></p>',
          text: '{{ url }}',
        },
      });
      const warn = jest.spyOn(strapi.log, 'warn').mockImplementation(() => strapi.log);

      try {
        const res = await admin({
          method: 'POST',
          url: `/email/templates/${SECRET_KEY}/test?locale=en`,
        });

        expect(res.statusCode).toBe(200);
        expect(send).toHaveBeenCalledTimes(1);

        const sent = send.mock.calls[0][0];
        expect(sent.subject).toBe(secretDefinition.defaults.subject);
        expect(sent.html).toContain('<a href=');
        expect(sent.html).not.toContain('<img');
        expect(warn).toHaveBeenCalledWith(expect.stringContaining(SECRET_KEY));
      } finally {
        warn.mockRestore();
      }
    });
  });
});
