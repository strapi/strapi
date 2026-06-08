'use strict';

import { createRequest } from 'api-tests/request';
import { createStrapiInstance } from 'api-tests/strapi';

type StrapiInstance = Awaited<ReturnType<typeof createStrapiInstance>>;
type TestRequest = ReturnType<typeof createRequest>;
type TestResponse = {
  statusCode: number;
  body: {
    data?: unknown;
    error?: {
      name?: string;
      message?: string;
    };
  };
};

describe('First admin registration', () => {
  let rq: TestRequest;
  let strapi: StrapiInstance;

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      ensureSuperAdmin: false,
    });
    rq = createRequest({ strapi });

    await strapi.db.query('admin::user').deleteMany({});
  });

  afterAll(async () => {
    await strapi.db.query('admin::user').deleteMany({});
    await strapi.destroy();
  });

  test('applies the default admin rate limit to repeated registration attempts', async () => {
    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        rq({
          url: '/admin/register-admin',
          method: 'POST',
          body: {
            email: 'attacker@example.com',
            firstname: 'Admin',
            lastname: 'User',
            password: 'short',
          },
        })
      )
    );

    expect(responses.slice(0, 5).map((res: TestResponse) => res.statusCode)).toEqual([
      400, 400, 400, 400, 400,
    ]);
    expect(responses[5].statusCode).toBe(429);
    expect(responses[5].body.error).toMatchObject({
      name: 'RateLimitError',
      message: 'Too many requests, please try again later.',
    });
  });

  test('allows the first registerer to create the super admin', async () => {
    const firstRegisterer = {
      email: 'first-registerer@example.com',
      firstname: 'Admin',
      lastname: 'User',
      password: 'Attacker1!',
    };

    const res = await rq({
      url: '/admin/register-admin',
      method: 'POST',
      body: firstRegisterer,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      token: expect.any(String),
      accessToken: expect.any(String),
      user: {
        email: firstRegisterer.email,
        firstname: firstRegisterer.firstname,
        lastname: firstRegisterer.lastname,
        isActive: true,
      },
    });

    const nextRes = await rq({
      url: '/admin/register-admin',
      method: 'POST',
      body: {
        email: 'owner@example.com',
        firstname: 'Real',
        lastname: 'Owner',
        password: 'Owner123!',
      },
    });

    expect(nextRes.statusCode).toBe(400);
    expect(nextRes.body.error.message).toBe('You cannot register a new super admin');
  });
});

describe('First admin registration race protection', () => {
  let rq: TestRequest;
  let strapi: StrapiInstance;

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      ensureSuperAdmin: false,
    });
    rq = createRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('only allows one super admin when concurrent requests observe no existing admin', async () => {
    const originalQuery = strapi.db.query.bind(strapi.db);
    const pendingCreates: Array<() => void> = [];

    strapi.db.query = ((uid: string) => {
      const query = originalQuery(uid);

      if (uid !== 'admin::user') {
        return query;
      }

      return new Proxy(query, {
        get(target, prop: string | symbol) {
          if (prop !== 'create') {
            const value = target[prop];
            return typeof value === 'function' ? value.bind(target) : value;
          }

          return async (...args: unknown[]) => {
            await new Promise((resolve) => {
              pendingCreates.push(resolve as () => void);

              if (pendingCreates.length === 2) {
                pendingCreates.forEach((release) => release());
                return;
              }

              setTimeout(resolve, 50);
            });

            return target.create(...args);
          };
        },
      });
    }) as typeof strapi.db.query;

    try {
      const responses = await Promise.all([
        rq({
          url: '/admin/register-admin',
          method: 'POST',
          body: {
            email: 'attacker-a@example.com',
            firstname: 'Admin',
            lastname: 'A',
            password: 'Attacker1!',
          },
        }),
        rq({
          url: '/admin/register-admin',
          method: 'POST',
          body: {
            email: 'attacker-b@example.com',
            firstname: 'Admin',
            lastname: 'B',
            password: 'Attacker1!',
          },
        }),
      ]);

      expect(responses.map((res: TestResponse) => res.statusCode).sort()).toEqual([200, 400]);

      const adminUsers = await strapi.db.query('admin::user').findMany({
        where: {
          email: {
            $in: ['attacker-a@example.com', 'attacker-b@example.com'],
          },
        },
        populate: ['roles'],
      });

      expect(adminUsers).toHaveLength(1);
      expect(
        adminUsers.every(
          (user: { roles: Array<{ code: string }> }) => user.roles[0].code === 'strapi-super-admin'
        )
      ).toBe(true);
    } finally {
      strapi.db.query = originalQuery;
    }
  });
});
