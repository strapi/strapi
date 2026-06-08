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

type RestorableAdminRole = {
  id: string | number;
};

type RestorableAdminUser = {
  id: string | number;
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
  email: string;
  password?: string | null;
  resetPasswordToken?: string | null;
  registrationToken?: string | null;
  isActive?: boolean | null;
  blocked?: boolean | null;
  preferedLanguage?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  roles?: RestorableAdminRole[];
};

let originalAdminUsers: RestorableAdminUser[] | null = null;

const snapshotAdminUsers = async (strapi: StrapiInstance) => {
  if (originalAdminUsers !== null) {
    return;
  }

  originalAdminUsers = (await strapi.db.query('admin::user').findMany({
    populate: ['roles'],
  })) as RestorableAdminUser[];
};

const clearAdminUsers = async (strapi: StrapiInstance) => {
  await strapi.db.query('admin::user').deleteMany({});
};

const restoreOriginalAdminUsers = async (strapi: StrapiInstance) => {
  await clearAdminUsers(strapi);

  for (const { roles = [], ...user } of originalAdminUsers ?? []) {
    await strapi.db.query('admin::user').create({
      data: {
        ...user,
        roles: roles.map((role) => role.id),
      },
    });
  }
};

describe('First admin registration', () => {
  let rq: TestRequest;
  let strapi: StrapiInstance;

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      ensureSuperAdmin: false,
    });
    rq = createRequest({ strapi });

    await snapshotAdminUsers(strapi);
    await clearAdminUsers(strapi);
  });

  afterAll(async () => {
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

    const statusCodes = responses.map((res: TestResponse) => res.statusCode);
    expect(statusCodes.filter((code) => code === 400)).toHaveLength(5);
    expect(statusCodes.filter((code) => code === 429)).toHaveLength(1);

    const rateLimitedResponse = responses.find((res: TestResponse) => res.statusCode === 429);
    expect(rateLimitedResponse?.body.error).toMatchObject({
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

    await clearAdminUsers(strapi);
  });

  afterAll(async () => {
    await restoreOriginalAdminUsers(strapi);
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
