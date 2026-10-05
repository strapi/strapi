import path from 'node:path';
import { Strategy } from 'passport-strategy';
import { describeOnCondition, createUtils } from 'api-tests/utils';
import { createStrapiInstance } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const PROVIDER = 'fake-sso';

type FakeOutcome = { error: Error } | { profile: Record<string, unknown> | null };

/** An SSO strategy that returns whatever the current test set, with no identity provider. */
class FakeSsoStrategy extends Strategy {
  name = PROVIDER;

  outcome: FakeOutcome = { profile: null };

  authenticate() {
    if ('error' in this.outcome) {
      this.error(this.outcome.error);
    } else {
      this.success(this.outcome.profile as any);
    }
  }
}

/** The passport instance @strapi/admin uses, so the strategy reaches its routes. */
const getAdminPassport = () => {
  const adminDir = path.dirname(require.resolve('@strapi/admin/package.json'));
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(require.resolve('koa-passport', { paths: [adminDir] }));
};

describeOnCondition(edition === 'EE')('Authentication events in audit logs (api)', () => {
  let strapi: Core.Strapi;
  let publicRq: ReturnType<typeof createRequest>;
  let utils: ReturnType<typeof createUtils>;
  let editorRoleId: number;
  let previousAuthSettings: unknown;
  const strategy = new FakeSsoStrategy();

  const password = 'Password123';
  const unknownActor = { type: 'unknown' };

  const findLogs = async (action: string) =>
    strapi.db.query('admin::audit-log').findMany({
      where: { action },
      populate: ['user'],
      orderBy: { id: 'asc' },
    });

  // The local login emits after its response, once the account lookup is done
  const waitForLogs = async (action: string, count = 1, attempts = 30) => {
    for (let i = 0; i < attempts; i += 1) {
      const logs = await findLogs(action);
      if (logs.length >= count) {
        return logs;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
    }
    return findLogs(action);
  };

  const expectNoSecret = (log: { payload: unknown }, ...values: string[]) => {
    const serialized = JSON.stringify(log.payload);
    expect(serialized).not.toMatch(
      /"password":|"error":|"message":|"stack":|resetPasswordToken|registrationToken|\$2[aby]\$/
    );
    for (const value of values) {
      expect(serialized).not.toContain(value);
    }
  };

  const adminStore = () => strapi.store({ type: 'core', name: 'admin' });

  const setSsoSettings = async (providers: Record<string, unknown>) => {
    const store = await adminStore();
    await store.set({
      key: 'auth',
      value: { providers: { autoRegister: false, defaultRole: null, ...providers } },
    });
  };

  const createAccount = async (email: string, overrides: Record<string, unknown> = {}) =>
    utils.createUser({
      email,
      firstname: 'Ana',
      lastname: 'Doe',
      password,
      isActive: true,
      roles: [editorRoleId],
      ...overrides,
    });

  const login = (email: string, pass: string) =>
    publicRq({ url: '/admin/login', method: 'POST', body: { email, password: pass } });

  const ssoLogin = (outcome: FakeOutcome) => {
    strategy.outcome = outcome;
    return publicRq({ url: `/admin/connect/${PROVIDER}`, method: 'GET' });
  };

  const failedLogin = (
    reason: string,
    provider: string,
    account?: { id: number; email: string }
  ) => ({
    action: 'admin.auth.error',
    date: expect.any(String),
    actor: unknownActor,
    origin: 'admin-panel',
    outcome: 'failure',
    ...(account ? { resource: { type: 'admin-user', id: account.id, email: account.email } } : {}),
    details: { provider, reason },
  });

  const deleteTestUsers = async () => {
    await strapi.db.query('admin::user').deleteMany({
      where: { email: { $endsWith: '@auth-audit.test' } },
    });
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    utils = createUtils(strapi);
    publicRq = createRequest({ strapi });

    const editorRole = await strapi.db
      .query('admin::role')
      .findOne({ where: { code: 'strapi-editor' } });
    editorRoleId = editorRole.id;

    // The provider registry refuses new providers after bootstrap; it is a Map
    const { providerRegistry } = strapi.service('admin::passport');
    providerRegistry.set(PROVIDER, { uid: PROVIDER, displayName: 'Fake SSO' });
    getAdminPassport().use(PROVIDER, strategy);

    previousAuthSettings = await (await adminStore()).get({ key: 'auth' });
  });

  afterAll(async () => {
    if (previousAuthSettings) {
      await (await adminStore()).set({ key: 'auth', value: previousAuthSettings });
    }
    strapi.service('admin::passport').providerRegistry.delete(PROVIDER);
    getAdminPassport().unuse(PROVIDER);
    await deleteTestUsers();
    await strapi.db.query('admin::audit-log').deleteMany();
    await strapi.destroy();
  });

  beforeEach(async () => {
    await deleteTestUsers();
    await setSsoSettings({});
    await strapi.db.query('admin::audit-log').deleteMany();
  });

  describe('admin.auth.error, local login', () => {
    test('records a wrong password with the account found by lowercased email', async () => {
      const account = await createAccount('ana@auth-audit.test');

      const res = await login('ANA@auth-audit.test', 'wrong-password-hunter2');
      expect(res.statusCode).toBe(400);

      const [log, ...rest] = await waitForLogs('admin.auth.error');
      expect(rest).toHaveLength(0);
      expect(log.user).toBeNull();
      expect(log.payload).toEqual(failedLogin('invalid_credentials', 'local', account));
      expectNoSecret(log, 'wrong-password-hunter2', 'Invalid credentials');
    });

    test('records nothing for an email with no account', async () => {
      const account = await createAccount('ana@auth-audit.test');

      expect((await login('nobody@auth-audit.test', password)).statusCode).toBe(400);
      // A recorded failure after it: once its row is there, the first one had its turn
      expect((await login(account.email, 'wrong')).statusCode).toBe(400);

      const logs = await waitForLogs('admin.auth.error');
      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
      expect(await findLogs('admin.auth.error')).toHaveLength(1);
      expect(logs[0].payload.resource).toEqual({
        type: 'admin-user',
        id: account.id,
        email: account.email,
      });
    });

    test('records the right password on an inactive account as account_inactive', async () => {
      const account = await createAccount('ana@auth-audit.test', { isActive: false });

      expect((await login(account.email, password)).statusCode).toBe(400);

      const [log] = await waitForLogs('admin.auth.error');
      expect(log.payload).toEqual(failedLogin('account_inactive', 'local', account));
      expectNoSecret(log, password);
    });

    test('records a login on an SSO-locked role as login_not_allowed', async () => {
      const account = await createAccount('ana@auth-audit.test');
      await setSsoSettings({ ssoLockedRoles: [String(editorRoleId)] });

      expect((await login(account.email, password)).statusCode).toBe(401);

      const [log] = await waitForLogs('admin.auth.error');
      expect(log.payload).toEqual(failedLogin('login_not_allowed', 'local', account));
      expectNoSecret(log, password);
    });

    test('records an unexpected error without its message', async () => {
      const account = await createAccount('ana@auth-audit.test');
      const authService = strapi.service('admin::auth');
      const { checkCredentials } = authService;
      authService.checkCredentials = async () => {
        throw new Error('db said: password hunter2 for ana@auth-audit.test');
      };

      try {
        expect((await login(account.email, password)).statusCode).toBe(501);
      } finally {
        authService.checkCredentials = checkCredentials;
      }

      const [log] = await waitForLogs('admin.auth.error');
      expect(log.payload).toEqual(failedLogin('unexpected_error', 'local', account));
      expectNoSecret(log, 'hunter2', 'db said');
    });
  });

  describe('admin.auth.error, SSO login', () => {
    test('records a deactivated account as account_inactive', async () => {
      const account = await createAccount('ana@auth-audit.test', { isActive: false });

      const res = await ssoLogin({ profile: { email: account.email } });
      expect(res.statusCode).toBe(302);

      const [log, ...rest] = await findLogs('admin.auth.error');
      expect(rest).toHaveLength(0);
      expect(log.payload).toEqual(failedLogin('account_inactive', PROVIDER, account));
      expectNoSecret(log, 'Deactivated user');
    });

    test('records a new user with auto-registration off, without a resource', async () => {
      await ssoLogin({ profile: { email: 'new@auth-audit.test', username: 'new' } });

      const [log, ...rest] = await findLogs('admin.auth.error');
      expect(rest).toHaveLength(0);
      expect(log.payload).toEqual(failedLogin('sso_registration_disabled', PROVIDER));
      expectNoSecret(log, 'new@auth-audit.test');
    });

    test('records a default role that does not exist as sso_role_misconfigured', async () => {
      await setSsoSettings({ autoRegister: true, defaultRole: 987654 });

      await ssoLogin({ profile: { email: 'new@auth-audit.test', username: 'new' } });

      const [log, ...rest] = await findLogs('admin.auth.error');
      expect(rest).toHaveLength(0);
      expect(log.payload).toEqual(failedLogin('sso_role_misconfigured', PROVIDER));
    });

    test('records a session that cannot be created with an unknown actor and the account', async () => {
      const account = await createAccount('ana@auth-audit.test');
      const originSessionManager = Object.getPrototypeOf(strapi.sessionManager('admin'));
      const generateRefreshToken = jest
        .spyOn(originSessionManager, 'generateRefreshToken')
        .mockRejectedValueOnce(new Error('session store down for ana@auth-audit.test'));

      try {
        const res = await ssoLogin({ profile: { email: account.email } });
        expect(res.statusCode).toBe(302);
        expect(res.headers.location).toMatch(/error/);
      } finally {
        generateRefreshToken.mockRestore();
      }

      const [log, ...rest] = await findLogs('admin.auth.error');
      expect(rest).toHaveLength(0);
      expect(log.user).toBeNull();
      expect(log.payload).toEqual(failedLogin('unexpected_error', PROVIDER, account));
      expectNoSecret(log, 'session store down');
      expect(await findLogs('admin.auth.success')).toHaveLength(0);
    });

    test('records nothing for a connection with no valid profile', async () => {
      const providerError = await ssoLogin({ error: new Error('idp unreachable') });
      const noEmail = await ssoLogin({ profile: { username: 'new' } });

      expect(providerError.statusCode).toBe(302);
      expect(noEmail.statusCode).toBe(302);
      expect(await findLogs('admin.auth.error')).toHaveLength(0);
    });
  });

  describe('admin.auth.autoRegistration', () => {
    test('records the new admin as actor and resource, with the provider and roles', async () => {
      await setSsoSettings({ autoRegister: true, defaultRole: editorRoleId });

      const res = await ssoLogin({
        profile: { email: 'new@auth-audit.test', firstname: 'New', lastname: 'Admin' },
      });
      expect(res.statusCode).toBe(302);

      const created = await strapi.db
        .query('admin::user')
        .findOne({ where: { email: 'new@auth-audit.test' } });
      expect(created).not.toBeNull();

      const [log, ...rest] = await findLogs('admin.auth.autoRegistration');
      expect(rest).toHaveLength(0);
      expect(log.user.id).toBe(created.id);
      expect(log.payload).toEqual({
        action: 'admin.auth.autoRegistration',
        date: expect.any(String),
        actor: {
          type: 'admin-user',
          user: { id: created.id, email: 'new@auth-audit.test', name: 'New Admin' },
        },
        origin: 'admin-panel',
        resource: { type: 'admin-user', id: created.id, email: 'new@auth-audit.test' },
        details: { provider: PROVIDER, roles: [editorRoleId] },
      });
      expectNoSecret(log);

      // The account itself is created before anyone is logged in
      const [createLog] = await findLogs('admin-user.create');
      expect(createLog.payload.actor).toEqual(unknownActor);
      expect(await findLogs('admin.auth.error')).toHaveLength(0);
    });
  });
});
