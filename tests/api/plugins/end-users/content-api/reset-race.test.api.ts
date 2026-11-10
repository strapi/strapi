/**
 * A password reset token redeemed by several requests at once: one wins, the rest are told the
 * token is invalid. Repeated, since the databases differ in how a lost race surfaces (a unique
 * violation, a deadlock, a lock wait), and an answer other than 400 is a server error.
 */
import { createRequest } from 'api-tests/request';

import { createEndUsersInstance } from '../utils/create-end-users-instance';
import {
  ENGINE_UIDS,
  PROFILE_UID,
  TEST_ORIGIN,
  TEST_PASSWORD,
  emptyTables,
} from '../utils/permissions';

const VERIFICATION_UID = 'plugin::end-users.verification';
const ROUNDS = 5;
const CONTENDERS = 4;

describe('end-users: redeeming a password reset token at the same time', () => {
  let strapi;
  let rq;

  beforeAll(async () => {
    strapi = await createEndUsersInstance({ pluginConfig: { trustedOrigins: [TEST_ORIGIN] } });
    rq = createRequest({ strapi });
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
  });

  afterAll(async () => {
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await strapi.destroy();
  });

  it('answers 200 to one request and 400 to every other', async () => {
    const signedUp = await rq.post('/api/auth/sign-up/email', {
      body: { email: 'reset-race@example.com', password: TEST_PASSWORD, name: 'Race' },
      headers: { Origin: TEST_ORIGIN },
    });

    expect(signedUp.statusCode).toBe(200);

    const documentId = signedUp.body.user.id as string;

    for (let round = 0; round < ROUNDS; round += 1) {
      const token = `token-race-${round}`;

      // eslint-disable-next-line no-await-in-loop
      await strapi.documents(VERIFICATION_UID).create({
        data: {
          identifier: `reset-password:${token}`,
          value: documentId,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // eslint-disable-next-line no-await-in-loop
      const results = await Promise.all(
        Array.from({ length: CONTENDERS }, (_, index) =>
          rq.post('/api/auth/reset-password', {
            body: { token, newPassword: `Race-password-long-${round}-${index}` },
          })
        )
      );

      expect(results.map(({ statusCode }) => statusCode).sort()).toEqual([
        200,
        ...Array(CONTENDERS - 1).fill(400),
      ]);
    }
  });
});
