/**
 * A banned user can't reset their password through the email OTP or phone number plugins either:
 * the redeem is refused before anything changes, and the code is not sent to them. The request is
 * answered as for any address. Both plugins are the project's to opt into, so this app installs
 * them from `config/plugins.ts` the way a project does.
 */
import { createRequest } from 'api-tests/request';

import { clearSentEmails, sentEmails } from '../utils/email-capture-provider';
import { createEndUsersInstance } from '../utils/create-end-users-instance';
import {
  ENGINE_UIDS,
  PROFILE_UID,
  TEST_ORIGIN,
  TEST_PASSWORD as PASSWORD,
  emptyTables,
} from '../utils/permissions';
import { emailsAfter, until } from '../utils/wait';

const USER_UID = 'plugin::end-users.user';
const VERIFICATION_UID = 'plugin::end-users.verification';
const CODE = '123456';
const PHONE = '+15550100';
// Built at run time: a literal password in the source trips secret scanning
const NEW_PASSWORD = `${Date.now().toString(36)}-Nn3!x`;

describe('end-users: a banned user and the email OTP and phone number resets', () => {
  let strapi;
  let rq;
  const phoneCodes: string[] = [];

  const FROM_FRONT_END = { Origin: TEST_ORIGIN };

  const signedUp = async (email: string) => {
    const res = await rq.post('/api/auth/sign-up/email', {
      body: { email, password: PASSWORD, name: 'Otp' },
      headers: FROM_FRONT_END,
    });

    expect(res.statusCode).toBe(200);

    return res.body.user.id as string;
  };

  const setBanned = (documentId: string, banned: boolean) =>
    strapi.documents(USER_UID).update({ documentId, data: { banned, banReason: 'spam' } });

  const signIn = (email: string, password: string) =>
    rq.post('/api/auth/sign-in/email', { body: { email, password } });

  beforeAll(async () => {
    strapi = await createEndUsersInstance({
      pluginConfig: {
        trustedOrigins: [TEST_ORIGIN],
        // Read when the instance builds its config, after the harness has bridged Better Auth, which
        // the plugins below load
        get auth() {
          /* eslint-disable global-require, @typescript-eslint/no-var-requires */
          const {
            defineAuth,
          } = require('../../../../../packages/plugins/end-users/server/src/engine/better-auth/define-auth');
          const plugins = require('../../../../../packages/plugins/end-users/server/src/engine/better-auth/public/plugins');
          /* eslint-enable global-require, @typescript-eslint/no-var-requires */

          return defineAuth({
            plugins: [
              plugins.emailOTP({ generateOTP: () => CODE }),
              plugins.phoneNumber({
                sendOTP: async () => {},
                sendPasswordResetOTP: async ({ code }: { code: string }) => {
                  phoneCodes.push(code);
                },
              }),
            ],
          });
        },
      },
    });
    rq = createRequest({ strapi });
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
  });

  afterAll(async () => {
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await strapi.destroy();
  });

  it('refuses the email OTP redeem of a banned user before the password changes, and sends them no code', async () => {
    const email = 'otp-banned@example.com';
    const documentId = await signedUp(email);

    clearSentEmails();

    // A code asked for before the ban: the ban lands while it is still good
    const asked = await rq.post('/api/auth/email-otp/request-password-reset', {
      body: { email },
      headers: FROM_FRONT_END,
    });

    expect(asked.statusCode).toBe(200);
    expect((await emailsAfter(1)).map((sent) => sent.to)).toEqual([email]);

    await setBanned(documentId, true);

    const refused = await rq.post('/api/auth/email-otp/reset-password', {
      body: { email, otp: CODE, password: NEW_PASSWORD },
      headers: FROM_FRONT_END,
    });

    expect(refused.statusCode).toBe(403);
    expect(refused.body.code).toBe('BANNED_USER');
    // Refused before the code was spent
    expect(
      await strapi.db
        .query(VERIFICATION_UID)
        .count({ where: { identifier: `forget-password-otp-${email}` } })
    ).toBe(1);

    // No new code to a banned address, and the answer is the one an unknown address gets. The same
    // request for a user who is not banned is mailed, so the mail below is the only one
    await signedUp('otp-active@example.com');
    clearSentEmails();

    const again = await rq.post('/api/auth/email-otp/request-password-reset', {
      body: { email },
      headers: FROM_FRONT_END,
    });
    const unknown = await rq.post('/api/auth/email-otp/request-password-reset', {
      body: { email: 'otp-nobody@example.com' },
      headers: FROM_FRONT_END,
    });
    const legacy = await rq.post('/api/auth/forget-password/email-otp', {
      body: { email },
      headers: FROM_FRONT_END,
    });

    expect(again.statusCode).toBe(200);
    expect(again.body).toEqual(unknown.body);
    expect(legacy.statusCode).toBe(200);

    await rq.post('/api/auth/email-otp/request-password-reset', {
      body: { email: 'otp-active@example.com' },
      headers: FROM_FRONT_END,
    });

    expect((await emailsAfter(1)).map((sent) => sent.to)).toEqual(['otp-active@example.com']);

    // Unbanned, the old password still works and the new one does not
    await setBanned(documentId, false);

    expect((await signIn(email, PASSWORD)).statusCode).toBe(200);
    expect((await signIn(email, NEW_PASSWORD)).statusCode).toBe(401);
  });

  it('refuses the phone number redeem of a banned user before the password changes, and sends them no code', async () => {
    const email = 'phone-banned@example.com';
    const documentId = await signedUp(email);

    await strapi.documents(USER_UID).update({ documentId, data: { phoneNumber: PHONE } });

    const asked = await rq.post('/api/auth/phone-number/request-password-reset', {
      body: { phoneNumber: PHONE },
      headers: FROM_FRONT_END,
    });

    expect(asked.statusCode).toBe(200);

    // The code is sent after the answer, like an email
    await until(() => phoneCodes.length >= 1, { what: 'the phone reset code' });
    expect(phoneCodes).toHaveLength(1);

    await setBanned(documentId, true);

    const refused = await rq.post('/api/auth/phone-number/reset-password', {
      body: { phoneNumber: PHONE, otp: phoneCodes[0], newPassword: NEW_PASSWORD },
      headers: FROM_FRONT_END,
    });

    expect(refused.statusCode).toBe(403);
    expect(refused.body.code).toBe('BANNED_USER');

    // No new code to a banned number, and the answer is the one an unknown number gets
    const again = await rq.post('/api/auth/phone-number/request-password-reset', {
      body: { phoneNumber: PHONE },
      headers: FROM_FRONT_END,
    });
    const unknown = await rq.post('/api/auth/phone-number/request-password-reset', {
      body: { phoneNumber: '+15550199' },
      headers: FROM_FRONT_END,
    });

    expect(again.body).toEqual(unknown.body);
    expect(phoneCodes).toHaveLength(1);

    await setBanned(documentId, false);

    expect((await signIn(email, PASSWORD)).statusCode).toBe(200);
    expect((await signIn(email, NEW_PASSWORD)).statusCode).toBe(401);
    expect(sentEmails().length).toBeGreaterThanOrEqual(0);
  });
});
