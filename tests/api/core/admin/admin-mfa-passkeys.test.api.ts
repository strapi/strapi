'use strict';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import { base32Decode, generateTotp } from '@strapi/utils';
import { resetSharedMfaState } from './utils/mfa-state';

jest.setTimeout(300_000);

const RP_ID = 'localhost';
const ORIGIN = 'http://localhost:1337';

const totpFor = (secret: string) =>
  generateTotp({ secret: base32Decode(secret), step: 30, digits: 6 });

/** The account-wide replay guard consumes a TOTP step per accepted code; wait out the current one. */
const waitForNextTotpStep = () =>
  new Promise((resolve) => setTimeout(resolve, (31 - (Math.floor(Date.now() / 1000) % 30)) * 1000));

const base64url = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');

describe('Admin MFA passkeys', () => {
  let strapi: any;
  let rq: any; // super admin, authenticated
  let utils: any;
  let editorRole: any;
  let editor: any;
  const editorPassword = 'Password123';
  let editorRecoveryCodes: string[] = [];
  let editorSecret: string;
  let superAdminId: number;

  const nextRecoveryCode = () => {
    const code = editorRecoveryCodes.shift();
    if (!code) throw new Error('test budget of recovery codes exhausted');
    return code;
  };

  const editorBearer = async () => {
    const { token } = await utils.login({ email: editor.email });
    return { Authorization: `Bearer ${token}` };
  };

  const editorRq = async (url: string, method: string, body?: Record<string, unknown>) =>
    createRequest({ strapi })({ url: `/admin${url}`, method, body, headers: await editorBearer() });

  const loginEditor = () =>
    createRequest({ strapi }).post('/admin/login', {
      body: { email: editor.email, password: editorPassword },
    });

  const putSettings = (body: Record<string, unknown>) =>
    rq({ url: '/admin/security-settings', method: 'PUT', body });

  const passkeyRows = (userId: number | string) =>
    strapi.db.query('admin::mfa-passkey').findMany({ where: { userId: String(userId) } });

  /** A stored credential, inserted directly: registering one for real needs an authenticator. */
  const seedPasskey = (userId: number | string, index: number) =>
    strapi.db.query('admin::mfa-passkey').create({
      data: {
        userId: String(userId),
        credentialId: `seeded-credential-${userId}-${index}`,
        publicKey: 'AQIDBA',
        counter: 0,
        transports: 'internal',
        name: `Seeded ${index}`,
        lastUsedAt: null,
      },
    });

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      async bootstrap({ strapi: s }: { strapi: any }) {
        s.config.set('features.future.unstableAdminMfa', true);
        s.config.set('admin.rateLimit.enabled', false);
        // The test app runs on HOST=0.0.0.0 with NODE_ENV=test, so `admin.absoluteUrl` is
        // `http://0.0.0.0:1337/admin` -- an IP literal, which is not a valid relying-party id.
        // This is the production default the spec warns about, and setting the override here is
        // exactly what such a deployment has to do. One test below clears it again.
        s.config.set('admin.auth.mfa.webauthn.rpId', RP_ID);
        s.config.set('admin.auth.mfa.webauthn.origins', [ORIGIN]);
      },
    });
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    const me = await rq({ url: '/admin/users/me', method: 'GET' });
    superAdminId = me.body.data.id;

    await resetSharedMfaState(strapi, { userIds: [superAdminId] });

    editorRole = await utils.createRole({ name: 'mfa_passkeys_editor', description: 'test' });
    editor = await utils.createUser({
      email: 'mfa-passkeys-editor@strapi.io',
      firstname: 'Ed',
      lastname: 'Itor',
      password: editorPassword,
      roles: [editorRole.id],
    });

    // Enrol the editor over HTTP; keep the secret and the recovery codes for later gates.
    const headers = await editorBearer();
    const enrol = await createRequest({ strapi }).post('/admin/mfa/enrol', {
      body: { password: editorPassword },
      headers,
    });
    expect(enrol.statusCode).toBe(200);
    editorSecret = enrol.body.data.secret;
    const verify = await createRequest({ strapi }).post('/admin/mfa/enrol/verify', {
      body: { code: totpFor(editorSecret) },
      headers,
    });
    expect(verify.statusCode).toBe(200);
    editorRecoveryCodes = verify.body.data.recoveryCodes;
    expect(editorRecoveryCodes).toHaveLength(10);
  });

  afterAll(async () => {
    await utils.deleteUsersById([editor.id]);
    await utils.deleteRolesById([editorRole.id]);
    await resetSharedMfaState(strapi, { userIds: [superAdminId] });
    await strapi.destroy();
  });

  test('defaults: passkeys enabled', async () => {
    const res = await rq({ url: '/admin/security-settings', method: 'GET' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.passkeys).toEqual({ enabled: true });
  });

  test('/mfa/me reports passkeysEnabled', async () => {
    const res = await editorRq('/mfa/me', 'GET');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.passkeysEnabled).toBe(true);
  });

  test('every passkey route 404s while the future flag is off, whatever the body', async () => {
    strapi.config.set('features.future.unstableAdminMfa', false);
    try {
      const headers = await editorBearer();
      const authenticated = [
        ['POST', '/admin/mfa/passkeys/options', { nonsense: true }],
        ['POST', '/admin/mfa/passkeys', {}],
        ['GET', '/admin/mfa/passkeys', undefined],
        ['DELETE', '/admin/mfa/passkeys/1', undefined],
      ] as const;

      for (const [method, url, body] of authenticated) {
        // eslint-disable-next-line no-await-in-loop
        const res = await createRequest({ strapi })({ url, method, body, headers });
        // 404, not 400: the flag is checked before body validation, so a malformed body and a
        // well-formed one are indistinguishable.
        expect(res.statusCode).toBe(404);
      }

      // Both administrator routes for this resource share the one path, distinguished only by
      // method -- so there is exactly one URL to cover here, not a loop over it.
      const administratorPasskeysUrl = `/admin/mfa/users/${editor.id}/passkeys`;
      expect((await rq({ url: administratorPasskeysUrl, method: 'GET' })).statusCode).toBe(404);
      expect((await rq({ url: administratorPasskeysUrl, method: 'DELETE' })).statusCode).toBe(404);

      const options = await createRequest({ strapi }).post('/admin/login/mfa/webauthn/options', {
        body: { nonsense: true },
      });
      expect(options.statusCode).toBe(404);
      const verify = await createRequest({ strapi }).post('/admin/login/mfa/webauthn', {
        body: {},
      });
      expect(verify.statusCode).toBe(404);
    } finally {
      strapi.config.set('features.future.unstableAdminMfa', true);
    }
  });

  test('a caller with no authenticator app cannot register a passkey', async () => {
    // The super admin is unenrolled after the reset.
    const res = await rq({
      url: '/admin/mfa/passkeys/options',
      method: 'POST',
      body: { password: superAdmin.loginInfo.password, code: '123456' },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.body)).toContain(
      'Set up an authenticator app before adding a passkey.'
    );
  });

  test('a wrong password is refused without spending a factor attempt', async () => {
    // The account-scoped throttle (`isAccountThrottled`) is a count of `challenge_failed`
    // `admin::mfa-event` rows for this user. `assertPasswordAndFactor` throws on a bad password
    // before `assertFactor` -- the only place that records one -- ever runs, so that count must
    // not move. Reading it directly is the actual mechanism, not a proxy for it.
    const countChallengeFailures = () =>
      strapi.db
        .query('admin::mfa-event')
        .count({ where: { userId: String(editor.id), type: 'challenge_failed' } });

    const before = await countChallengeFailures();

    const res = await editorRq('/mfa/passkeys/options', 'POST', {
      password: 'not-the-password',
      code: '123456',
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.body)).toContain('Invalid credentials');
    expect(await countChallengeFailures()).toBe(before);
  });

  test('a password with no code is refused', async () => {
    // The registration gate is password *and* a live second factor; a code-less body must be
    // refused even though this fails at the yup layer (`code` is `.required()`) rather than the
    // semantic check `assertPasswordAndFactor` makes -- a password alone must never authorise a
    // new second factor.
    const res = await editorRq('/mfa/passkeys/options', 'POST', {
      password: editorPassword,
    });

    expect(res.statusCode).toBe(400);
  });

  test('a wrong code is refused', async () => {
    const res = await editorRq('/mfa/passkeys/options', 'POST', {
      password: editorPassword,
      code: '000000',
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.body)).toContain('Invalid code');
  });

  test('the password and a live factor buy a real ceremony, whose consume then rejects a junk response', async () => {
    await waitForNextTotpStep();
    const options = await editorRq('/mfa/passkeys/options', 'POST', {
      password: editorPassword,
      code: totpFor(editorSecret),
    });

    expect(options.statusCode).toBe(200);
    expect(options.body.data.rp).toEqual({ id: RP_ID, name: 'Strapi' });
    expect(typeof options.body.data.challenge).toBe('string');
    expect(options.body.data.authenticatorSelection).toMatchObject({
      residentKey: 'preferred',
      userVerification: 'preferred',
    });

    // The challenge really is stored against the user, and never leaves as anything else.
    const row = await strapi.db.query('admin::user').findOne({ where: { id: editor.id } });
    expect(row.mfaPasskeyChallenge).toBe(options.body.data.challenge);

    // A structurally plausible response carrying the real challenge gets past the consume and
    // fails at verification -- one generic message, and the ceremony is spent either way.
    const registration = {
      id: 'api-suite-credential',
      rawId: 'api-suite-credential',
      type: 'public-key',
      clientExtensionResults: {},
      response: {
        clientDataJSON: base64url(
          JSON.stringify({
            type: 'webauthn.create',
            challenge: options.body.data.challenge,
            origin: ORIGIN,
          })
        ),
        attestationObject: base64url('not-a-real-attestation'),
      },
    };

    const register = await editorRq('/mfa/passkeys', 'POST', {
      name: 'API suite key',
      registration,
    });

    expect(register.statusCode).toBe(400);
    expect(JSON.stringify(register.body)).toContain('That passkey could not be verified.');
    expect(await passkeyRows(editor.id)).toHaveLength(0);

    // Spent: replaying it is the same generic message.
    const replay = await editorRq('/mfa/passkeys', 'POST', {
      name: 'API suite key',
      registration,
    });
    expect(replay.statusCode).toBe(400);
  });

  test.each([
    ['', 400],
    ['   ', 400],
    ['x'.repeat(51), 400],
  ])('the name %p is rejected', async (name, status) => {
    const res = await editorRq('/mfa/passkeys', 'POST', {
      name,
      registration: { id: 'x', response: {} },
    });
    expect(res.statusCode).toBe(status);
  });

  test('the cap is refused with the limit named', async () => {
    for (let i = 0; i < 10; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await seedPasskey(editor.id, i);
    }

    await waitForNextTotpStep();
    const res = await editorRq('/mfa/passkeys/options', 'POST', {
      password: editorPassword,
      code: totpFor(editorSecret),
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.body)).toContain('You can register at most 10 passkeys.');
  });

  test('the list carries four fields and nothing else', async () => {
    const res = await editorRq('/mfa/passkeys', 'GET');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(10);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(
      ['createdAt', 'id', 'lastUsedAt', 'name'].sort()
    );
    const serialised = JSON.stringify(res.body);
    expect(serialised).not.toContain('AQIDBA');
    expect(serialised).not.toContain('seeded-credential');
  });

  test('the challenge response advertises passkeyAvailable', async () => {
    const res = await loginEditor();
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({ mfaRequired: true, passkeyAvailable: true });
  });

  test("deleting a passkey: a non-numeric id, a foreign row and the caller's own", async () => {
    const malformed = await editorRq('/mfa/passkeys/not-a-number', 'DELETE');
    expect(malformed.statusCode).toBe(404);

    const foreignRow = await seedPasskey(superAdminId, 99);
    const foreign = await editorRq(`/mfa/passkeys/${foreignRow.id}`, 'DELETE');
    // Ownership, not just existence: the row is real, it is simply not the caller's.
    expect(foreign.statusCode).toBe(404);
    expect(await passkeyRows(superAdminId)).toHaveLength(1);

    const mine = (await passkeyRows(editor.id))[0];
    const deleted = await editorRq(`/mfa/passkeys/${mine.id}`, 'DELETE');
    expect(deleted.statusCode).toBe(204);
    expect(deleted.body).toEqual({});
    expect(await passkeyRows(editor.id)).toHaveLength(9);
  });

  test('the administrator routes are gated by the users permissions, and 404 an unknown user', async () => {
    const asAdmin = await rq({ url: `/admin/mfa/users/${editor.id}/passkeys`, method: 'GET' });
    expect(asAdmin.statusCode).toBe(200);
    expect(asAdmin.body.data).toEqual({ count: 9 });

    const unknown = await rq({ url: '/admin/mfa/users/999999/passkeys', method: 'GET' });
    expect(unknown.statusCode).toBe(404);

    // The editor's role holds neither users.read nor users.update.
    const readAsEditor = await editorRq(`/mfa/users/${editor.id}/passkeys`, 'GET');
    expect(readAsEditor.statusCode).toBe(403);
    const deleteAsEditor = await editorRq(`/mfa/users/${superAdminId}/passkeys`, 'DELETE');
    expect(deleteAsEditor.statusCode).toBe(403);

    const unknownDelete = await rq({ url: '/admin/mfa/users/999999/passkeys', method: 'DELETE' });
    expect(unknownDelete.statusCode).toBe(404);

    const removed = await rq({
      url: `/admin/mfa/users/${editor.id}/passkeys`,
      method: 'DELETE',
    });
    expect(removed.statusCode).toBe(204);
    expect(removed.body).toEqual({});
    expect(await passkeyRows(editor.id)).toHaveLength(0);

    // And the notice the removal recorded is on the target's feed, not the administrator's.
    const notices = await editorRq('/mfa/notices', 'GET');
    expect(notices.body.data.some((notice: any) => notice.type === 'passkey_removed')).toBe(true);
  });

  test('the login ceremony refuses an unusable challenge token, and a challenge with no passkeys', async () => {
    const bogus = await createRequest({ strapi }).post('/admin/login/mfa/webauthn/options', {
      body: { challengeToken: 'f'.repeat(64) },
    });
    expect(bogus.statusCode).toBe(400);
    expect(JSON.stringify(bogus.body)).toContain('Could not verify that passkey.');

    const challenge = await loginEditor();
    const noRows = await createRequest({ strapi }).post('/admin/login/mfa/webauthn/options', {
      body: { challengeToken: challenge.body.data.challengeToken },
    });
    // The editor holds no passkey any more, and the message is the same one.
    expect(noRows.statusCode).toBe(400);
    expect(JSON.stringify(noRows.body)).toContain('Could not verify that passkey.');

    const junk = await createRequest({ strapi }).post('/admin/login/mfa/webauthn', {
      body: {
        challengeToken: challenge.body.data.challengeToken,
        assertion: { id: 'nope', response: {} },
      },
    });
    expect(junk.statusCode).toBe(400);
    expect(JSON.stringify(junk.body)).toContain('Could not verify that passkey.');
  });

  test('with no rpId configured the authenticated route names the config key and the login route does not', async () => {
    await seedPasskey(editor.id, 500);
    const challenge = await loginEditor();
    strapi.config.set('admin.auth.mfa.webauthn.rpId', undefined);
    strapi.config.set('admin.auth.mfa.webauthn.origins', undefined);

    try {
      await waitForNextTotpStep();
      const authenticated = await editorRq('/mfa/passkeys/options', 'POST', {
        password: editorPassword,
        code: totpFor(editorSecret),
      });
      expect(authenticated.statusCode).toBe(400);
      expect(JSON.stringify(authenticated.body)).toContain(
        'Passkeys are not configured for this deployment. Set admin.auth.mfa.webauthn.rpId.'
      );

      const login = await createRequest({ strapi }).post('/admin/login/mfa/webauthn/options', {
        body: { challengeToken: challenge.body.data.challengeToken },
      });
      expect(login.statusCode).toBe(400);
      // Deployment information is not something the holder of a challenge token gets to learn.
      expect(JSON.stringify(login.body)).toContain('Could not verify that passkey.');
      expect(JSON.stringify(login.body)).not.toContain('admin.auth.mfa.webauthn.rpId');
    } finally {
      strapi.config.set('admin.auth.mfa.webauthn.rpId', RP_ID);
      strapi.config.set('admin.auth.mfa.webauthn.origins', [ORIGIN]);
    }
  });

  test('the settings round-trip: turning passkeys off needs credentials and deletes every row', async () => {
    await seedPasskey(editor.id, 600);
    await seedPasskey(superAdminId, 601);

    const noCredentials = await putSettings({ passkeys: { enabled: false } });
    expect(noCredentials.statusCode).toBe(400);
    expect(JSON.stringify(noCredentials.body)).toContain('change two-factor settings');
    // And it must not say the operator is lowering two-factor requirements.
    expect(JSON.stringify(noCredentials.body)).not.toContain('lower two-factor');

    const off = await putSettings({
      passkeys: { enabled: false },
      password: superAdmin.loginInfo.password,
    });
    expect(off.statusCode).toBe(200);
    expect(off.body.data.passkeys).toEqual({ enabled: false });
    expect(await passkeyRows(editor.id)).toHaveLength(0);
    expect(await passkeyRows(superAdminId)).toHaveLength(0);

    // While off: the list reads empty, the administrator count reads zero, and the challenge
    // stops advertising the passkey path.
    expect((await editorRq('/mfa/passkeys', 'GET')).body.data).toEqual([]);
    expect(
      (await rq({ url: `/admin/mfa/users/${editor.id}/passkeys`, method: 'GET' })).body.data
    ).toEqual({ count: 0 });
    expect((await loginEditor()).body.data.passkeyAvailable).toBe(false);
    expect((await editorRq('/mfa/me', 'GET')).body.data.passkeysEnabled).toBe(false);

    const registering = await editorRq('/mfa/passkeys/options', 'POST', {
      password: editorPassword,
      code: '123456',
    });
    expect(registering.statusCode).toBe(400);
    expect(JSON.stringify(registering.body)).toContain('Passkeys are disabled');

    // Removing a credential is never the dangerous direction (the service's own reasoning for
    // `deletePasskey`/`clearPasskeys`), so both delete routes must keep working while the policy
    // is off. A row can only exist here through a direct seed -- registration is refused above --
    // and while it exists the caller's list and the administrator count still agree with each
    // other (both stay empty/zero), never disagreeing about what is really in the table.
    const offRowForSelfDelete = await seedPasskey(editor.id, 800);
    expect((await editorRq('/mfa/passkeys', 'GET')).body.data).toEqual([]);
    expect(
      (await rq({ url: `/admin/mfa/users/${editor.id}/passkeys`, method: 'GET' })).body.data
    ).toEqual({ count: 0 });

    const selfDeleteWhileOff = await editorRq(`/mfa/passkeys/${offRowForSelfDelete.id}`, 'DELETE');
    expect(selfDeleteWhileOff.statusCode).toBe(204);
    expect(selfDeleteWhileOff.body).toEqual({});
    expect(await passkeyRows(editor.id)).toHaveLength(0);

    await seedPasskey(editor.id, 801);
    const adminDeleteWhileOff = await rq({
      url: `/admin/mfa/users/${editor.id}/passkeys`,
      method: 'DELETE',
    });
    expect(adminDeleteWhileOff.statusCode).toBe(204);
    expect(adminDeleteWhileOff.body).toEqual({});
    expect(await passkeyRows(editor.id)).toHaveLength(0);

    // Turning them back on needs nothing: it strengthens the second factor and destroys nothing.
    const on = await putSettings({ passkeys: { enabled: true } });
    expect(on.statusCode).toBe(200);
    expect(on.body.data.passkeys).toEqual({ enabled: true });
  });

  test('a body with none of the three objects names all three', async () => {
    const res = await putSettings({ password: superAdmin.loginInfo.password });
    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.body)).toContain('Provide mfa, trustedDevices or passkeys');
  });

  test.each([[{ enabled: 'yes' }], [{}], [{ enabled: true, extra: 1 }]])(
    'the passkeys object %p is rejected by the validator',
    async (passkeys) => {
      const res = await putSettings({ passkeys });
      expect(res.statusCode).toBe(400);
    }
  );

  test('disabling the second factor takes the passkeys with it', async () => {
    await seedPasskey(editor.id, 700);
    await waitForNextTotpStep();

    const res = await editorRq('/mfa/disable', 'POST', {
      password: editorPassword,
      code: totpFor(editorSecret),
    });

    expect(res.statusCode).toBe(204);
    expect(await passkeyRows(editor.id)).toHaveLength(0);
    const row = await strapi.db.query('admin::user').findOne({ where: { id: editor.id } });
    expect(row.mfaPasskeyChallenge).toBeNull();
    expect(row.mfaPasskeyChallengeExpiresAt).toBeNull();
  });
});
