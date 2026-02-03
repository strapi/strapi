const request = require('supertest');

// Set a global timeout of 2 minutes (120000ms) for this file
// This prevents "Timeout" errors if your PC is slow to start Strapi
jest.setTimeout(120000);

describe('Email Confirmation Flow', () => {
  let strapiInstance;

  beforeAll(async () => {
    // Check if Strapi is already running globally (some test runners do this)
    if (!global.strapi) {
      const { createStrapi } = require('@strapi/strapi');
      // Load Strapi without starting the HTTP server purely for DB access if needed,
      // but for supertest we usually need the server.
      strapiInstance = await createStrapi().load();
      await strapiInstance.server.mount(); // Start the HTTP server part
    }
  });

  afterAll(async () => {
    // Cleanup: Delete the test user so you can run the test again without "Email Taken" errors
    if (strapi && strapi.db) {
      await strapi.db.query('plugin::users-permissions.user').deleteMany({
        where: {
          email: { $contains: 'pr_test' },
        },
      });
    }

    // Force close the server to free up the port/DB lock
    if (strapiInstance) {
      await strapiInstance.destroy();
    }
  });

  it('should register a user and confirm them successfully', async () => {
    const mockUser = {
      username: `PR_Test_${Date.now()}`, // Unique name every time
      email: `pr_test_${Date.now()}@example.com`, // Unique email every time
      password: 'Password123',
    };

    // 1. Register User
    const registerRes = await request(strapi.server.httpServer)
      .post('/api/auth/local/register')
      .send(mockUser)
      .expect(200);

    expect(registerRes.body.user).toBeDefined();
    expect(registerRes.body.user.confirmed).toBe(false);

    // 2. Get Token from DB
    const userInDb = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email: mockUser.email },
      select: ['confirmationToken'],
    });

    expect(userInDb.confirmationToken).toBeTruthy();
    const token = userInDb.confirmationToken;

    // 3. Confirm User (Follow Redirects)
    await request(strapi.server.httpServer)
      .get(`/api/auth/email-confirmation?confirmation=${token}`)
      .expect((res) => {
        // We accept 200 (Success Page) or 302 (Redirect) as success
        const isSuccess = res.status === 200 || res.status === 302;
        if (!isSuccess) {
          throw new Error(
            `Expected status 200 or 302, but got ${res.status}. Body: ${JSON.stringify(res.body)}`
          );
        }
      });

    // 4. Verify in DB
    const confirmedUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email: mockUser.email },
      select: ['confirmed', 'confirmationToken'],
    });

    expect(confirmedUser.confirmed).toBe(true);
    expect(confirmedUser.confirmationToken).toBeNull();
  });
});
