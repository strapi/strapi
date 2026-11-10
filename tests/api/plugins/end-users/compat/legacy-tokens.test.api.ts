/**
 * Tokens issued by Users & Permissions (`{ id }` signed with its secret), accepted by the
 * Content API strategy while the compatibility mode is on, until the cut-off, and only once a
 * completed migration is recorded. The instance has compat on, the legacy secret and a cut-off in
 * the future; the migration record is written through the plugin store, as the migration will.
 */
import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { createAuthRequest, createRequest } from 'api-tests/request';

import { createEndUsersInstance } from '../utils/create-end-users-instance';
import { compatConfig, seedUpUser } from '../utils/compat';
import { makeLegacySecret, signLegacyJwt } from '../utils/legacy-tokens';
import {
  ENGINE_UIDS,
  PROFILE_UID,
  TEST_ORIGIN,
  bearer,
  emptyTables,
  resetRoles,
} from '../utils/permissions';
import { resetDatabase } from '../utils/reset-database';

const ROUTE = '/api/end-users-test/legacy';
const UNTIL_KEY = 'plugin::end-users.compat.legacyJwt.until';
const FUTURE = '2099-12-31';
const DAY_MS = 24 * 60 * 60 * 1000;

const LEGACY_SECRET = makeLegacySecret();

let strapi;
let rq;
let rqAdmin;

const store = () => strapi.store({ type: 'plugin', name: 'end-users' });

/** Writes the migration record and drops the cached read */
const recordMigration = async (record: Record<string, unknown> | null) => {
  if (record) {
    await store().set({ key: 'migration', value: record });
  } else {
    await store().delete({ key: 'migration' });
  }

  strapi.plugin('end-users').service('compat').clearCutoverCache();
};

const completedAt = (cutover: Date) => ({ status: 'completed', cutoverAt: cutover.toISOString() });

const call = (token: string) => rq.get(ROUTE, { headers: bearer(token) });

describe('end-users compat: legacy tokens', () => {
  beforeAll(async () => {
    strapi = await createEndUsersInstance({
      pluginConfig: {
        ...compatConfig({ legacyJwt: { secret: LEGACY_SECRET, until: FUTURE } }),
        trustedOrigins: [TEST_ORIGIN],
      },
      async register({ strapi: instance }) {
        instance.server.routes({
          type: 'content-api',
          routes: [
            {
              method: 'GET',
              path: '/end-users-test/legacy',
              handler(ctx) {
                ctx.body = { documentId: ctx.state.user.documentId };
              },
              config: {
                auth: {
                  strategies: ['users-permissions'],
                  scope: ['plugin::end-users.permissions.forCaller'],
                },
              },
            },
          ],
        });
      },
    });
    rq = createRequest({ strapi });
    rqAdmin = await createAuthRequest({ strapi });
  });

  beforeEach(async () => {
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await resetRoles(strapi);
    await recordMigration(completedAt(new Date(Date.now() + DAY_MS)));
  });

  afterAll(async () => {
    await recordMigration(null);
    await strapi.destroy();
    await resetDatabase();
  });

  it('accepts a legacy { id } token issued before the cut-off', async () => {
    const user = await seedUpUser(strapi, { email: 'legacy-ok@example.com' });

    const res = await call(signLegacyJwt(LEGACY_SECRET, { id: user.id }));

    expect(res.status).toBe(200);
    expect(res.body.documentId).toBe(user.documentId);
  });

  it('answers 401 for a token signed with another secret', async () => {
    const user = await seedUpUser(strapi, { email: 'legacy-bad@example.com' });

    const res = await call(signLegacyJwt(makeLegacySecret(), { id: user.id }));

    expect(res.status).toBe(401);
  });

  it('answers 401 for an expired token', async () => {
    const user = await seedUpUser(strapi, { email: 'legacy-expired@example.com' });

    const res = await call(signLegacyJwt(LEGACY_SECRET, { id: user.id }, { expiresIn: -60 }));

    expect(res.status).toBe(401);
  });

  it('answers 401 once the cut-off has passed, and works again when it is restored', async () => {
    const user = await seedUpUser(strapi, { email: 'legacy-until@example.com' });
    const token = signLegacyJwt(LEGACY_SECRET, { id: user.id });
    const original = strapi.config.get(UNTIL_KEY);

    strapi.config.set(UNTIL_KEY, '2000-01-01');

    try {
      expect((await call(token)).status).toBe(401);
    } finally {
      strapi.config.set(UNTIL_KEY, original);
    }

    expect((await call(token)).status).toBe(200);
  });

  it('answers 401 when no completed migration is recorded', async () => {
    const user = await seedUpUser(strapi, { email: 'legacy-none@example.com' });
    const token = signLegacyJwt(LEGACY_SECRET, { id: user.id });

    await recordMigration(null);
    expect((await call(token)).status).toBe(401);

    await recordMigration({ status: 'running', cutoverAt: new Date().toISOString() });
    expect((await call(token)).status).toBe(401);
  });

  it('answers 401 for a token issued after the cutover', async () => {
    const user = await seedUpUser(strapi, { email: 'legacy-late@example.com' });
    const token = signLegacyJwt(LEGACY_SECRET, { id: user.id });

    await recordMigration(completedAt(new Date(Date.now() - DAY_MS)));

    expect((await call(token)).status).toBe(401);
  });

  it('answers 401 for an unsigned token', async () => {
    const user = await seedUpUser(strapi, { email: 'legacy-none-alg@example.com' });
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      id: user.id,
      iat: Math.floor(Date.now() / 1000),
    })}.`;

    expect((await call(unsigned)).status).toBe(401);
    // The same claims signed with the secret are accepted, so it is the missing signature
    expect(
      (await call(jwt.sign({ id: user.id }, LEGACY_SECRET, { algorithm: 'HS256' }))).status
    ).toBe(200);
  });

  it('answers 401 for a token signed with the right secret and another algorithm', async () => {
    const user = await seedUpUser(strapi, { email: 'legacy-alg@example.com' });

    for (const algorithm of ['HS384', 'HS512'] as const) {
      // eslint-disable-next-line no-await-in-loop
      const res = await call(signLegacyJwt(LEGACY_SECRET, { id: user.id }, { algorithm }));

      expect({ algorithm, status: res.status }).toEqual({ algorithm, status: 401 });
    }
  });

  it('answers 401 for a token whose header names an asymmetric algorithm but is signed with the secret', async () => {
    const user = await seedUpUser(strapi, { email: 'legacy-confusion@example.com' });
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

    // The classic confusion: the server holds a key for RS256, the attacker signs with it as an
    // HMAC secret. Here the secret is the HMAC key, so only the algorithm in the header is wrong.
    for (const alg of ['RS256', 'ES256']) {
      const unsigned = `${encode({ alg, typ: 'JWT' })}.${encode({
        id: user.id,
        iat: Math.floor(Date.now() / 1000),
      })}`;
      const signature = createHmac('sha256', LEGACY_SECRET).update(unsigned).digest('base64url');

      // eslint-disable-next-line no-await-in-loop
      const res = await call(`${unsigned}.${signature}`);

      expect({ alg, status: res.status }).toEqual({ alg, status: 401 });
    }
  });

  it('answers 401 for a token with no issue date, which the cutover cannot place', async () => {
    const user = await seedUpUser(strapi, { email: 'legacy-noiat@example.com' });
    const token = jwt.sign({ id: user.id }, LEGACY_SECRET, {
      algorithm: 'HS256',
      noTimestamp: true,
    });

    expect((await call(token)).status).toBe(401);
  });

  it('refuses an unconfirmed user holding a valid token while confirmation is required, and lets them in when it is not', async () => {
    const settings = strapi.plugin('end-users').service('settings');
    const user = await seedUpUser(strapi, {
      email: 'legacy-unconfirmed@example.com',
      confirmed: false,
    });
    const token = signLegacyJwt(LEGACY_SECRET, { id: user.id });

    await settings.set({ signUp: { requireEmailVerification: true } });

    try {
      const refused = await call(token);

      expect(refused.status).toBe(403);
      expect(refused.body.error.details.code).toBe('EMAIL_NOT_VERIFIED');
    } finally {
      await settings.set({ signUp: { requireEmailVerification: false } });
    }

    expect((await call(token)).status).toBe(200);
  });

  it('refuses a banned user holding a valid token with 403 USER_BANNED', async () => {
    const user = await seedUpUser(strapi, { email: 'legacy-ban@example.com', blocked: true });

    const res = await call(signLegacyJwt(LEGACY_SECRET, { id: user.id }));

    expect(res.status).toBe(403);
    expect(res.body.error.details.code).toBe('USER_BANNED');
  });

  it('counts the hits on the Advanced summary', async () => {
    const user = await seedUpUser(strapi, { email: 'legacy-count@example.com' });
    const before = await rqAdmin.get('/end-users/settings');
    const { legacy } = before.body.meta.config.compat.legacyJwtHits;

    expect((await call(signLegacyJwt(LEGACY_SECRET, { id: user.id }))).status).toBe(200);

    const after = await rqAdmin.get('/end-users/settings');

    expect(after.body.meta.config.compat.legacyJwtHits.legacy).toBe(legacy + 1);
  });
});
