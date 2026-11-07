/**
 * Database rehearsals for the end-users plugin, for a real Postgres or MySQL. Not part of CI.
 *
 * To run it, from the repository root, on a database that is not SQLite (Postgres on 5432 or MySQL on
 * 3306 with the strapi/strapi account, as `yarn test:api` expects):
 *
 *   yarn test:api --db postgres --testMatch '<rootDir>/packages/plugins/end-users/scripts/adapter-races.ts'
 *
 * CI runs the API tests on SQLite, Postgres and MySQL (CE and EE). Only the Postgres and MySQL legs
 * could ever fail these cases: SQLite has one connection and one writer, so the database itself puts
 * the calls in a row and every case below passes there whatever the plugin does. They rehearse the
 * database, not an API contract, so they are not API tests. Run this by hand on Postgres and MySQL
 * before a release, and after a change to the adapter,
 * the profile lock or the permission service. The unit tests show the same logic against a mock; this
 * file fires the calls at the real database, all at once. It loads the plugin's `dist/` build (the
 * adapter case builds the engine from it), so build the plugin first.
 *
 * The cases:
 *   1. consumeOne: of 20 callers racing for one row, exactly one gets it
 *   2. incrementOne: 20 increments of one counter are all counted, none twice
 *   3. incrementOne with a guard in the `where` (`count < 5`): exactly 5 get through
 *   4. consumeOne with a date guard in the `where` (`expiresAt > now`): an expired row is not taken
 *   5. the reset-password endpoint: of 10 simultaneous redemptions of one token, exactly one wins
 *   6. incrementOne with only a guard and a `set`, no increment (the window reset of Better Auth's
 *      rate limiter): of 20 callers racing to reset one old row, exactly one does
 *   7. the start's profile backfill: of 10 simultaneous runs of `ensureEveryUserHasAProfile` for a user
 *      who has no profile, exactly one makes it (the link table cannot carry a unique constraint, so a
 *      row lock on the user does it). Profiles come with their users, so nothing but
 *      this backfill, which two instances can run at once, creates one apart from the user's own create
 *   8. a role saved with 1,201 permissions: every row is stored, in chunks, and read back
 *
 * Case 5 is a wiring check, not a race check: Better Auth serialises the consumers of one token
 * inside the process (`withVerificationConsumeLock`, `db/internal-adapter.mjs`), so the ten requests
 * never reach the adapter at the same time. It shows that the endpoint, the lock and the adapter
 * agree, and that a lost request is refused for the token and for nothing else. Cases 1-3 are the
 * real proof that the database, and not the process, decides.
 */
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequest } from 'api-tests/request';
import { createEndUsersInstance } from '../../../../tests/api/plugins/end-users/utils/create-end-users-instance';
import {
  TEST_ORIGIN,
  TEST_PASSWORD as PASSWORD,
  createSignedInUser,
  row,
} from '../../../../tests/api/plugins/end-users/utils/permissions';

const USER_UID = 'plugin::end-users.user';
const ACCOUNT_UID = 'plugin::end-users.account';
const SESSION_UID = 'plugin::end-users.session';
const VERIFICATION_UID = 'plugin::end-users.verification';
const RATE_LIMIT_UID = 'plugin::end-users.rate-limit';

/** Better Auth's names for the two models these tests use. */
const VERIFICATION = 'verification';
const RATE_LIMIT = 'rateLimit';

/** Everything this file creates starts with this (and every email ends with the domain). */
const PREFIX = 'adapter-race-';
const EMAIL_DOMAIN = '@adapter-race.example.com';

const CALLERS = 20;
const HTTP_CALLERS = 10;
const GUARD = 5;
const HOUR = 60 * 60 * 1000;

type Row = Record<string, unknown>;

/** What of a supertest response these tests read. */
interface HttpResponse {
  statusCode: number;
  body: Record<string, any>;
}

interface Where {
  field: string;
  value: unknown;
  operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'ne';
}

/** The two calls under test, as Better Auth's `DBAdapter` has them. */
interface RaceAdapter {
  consumeOne(args: { model: string; where: Where[] }): Promise<Row | null>;
  incrementOne(args: {
    model: string;
    where: Where[];
    increment: Record<string, number>;
    set?: Record<string, unknown>;
  }): Promise<Row | null>;
}

/**
 * The adapter the plugin hands to Better Auth.
 *
 * `AuthEngine` does not expose it (the engine keeps Better Auth's context to itself), so it is made
 * the way Better Auth makes it, `options.database(options)`, from the options `createEngine` builds
 * (`buildAuthOptions`, with the project's `auth` option from `config/plugins.ts` as `createEngine` loads it). Nothing is
 * configured here: the same plugin configuration in, the same adapter out. The plugin's compiled
 * output is what Strapi loads, so that is what this loads too, and Jest hands back the instance the
 * plugin already runs.
 */
const createPluginAdapter = (strapi): RaceAdapter => {
  const engineModule = path.join(
    path.dirname(require.resolve('@strapi/plugin-end-users/package.json')),
    'dist',
    'server',
    'engine',
    'better-auth',
    'create-engine.js'
  );

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { buildAuthOptions, loadProjectAuth } = require(engineModule);
  const options = buildAuthOptions(strapi, loadProjectAuth(strapi));

  return options.database(options);
};

/** A value no other test (and no earlier run) has used. */
const unique = (label: string) => `${PREFIX}${label}-${randomUUID().slice(0, 8)}`;

/** Runs `run` `calls` times at once and waits for all of them. */
const concurrently = <T>(calls: number, run: (index: number) => Promise<T>) =>
  Promise.all(Array.from({ length: calls }, (_, index) => run(index)));

const ascending = (values: number[]) => [...values].sort((a, b) => a - b);

const oneTo = (last: number) => Array.from({ length: last }, (_, index) => index + 1);

describe('end-users: the adapter under concurrency', () => {
  let strapi;
  let rq;
  let adapter: RaceAdapter;

  const seedVerification = (identifier: string, expiresAt = new Date(Date.now() + HOUR)) =>
    strapi
      .documents(VERIFICATION_UID)
      .create({ data: { identifier, value: unique('value'), expiresAt } });

  const seedRateLimit = (key: string, count = 0, lastRequest = Date.now()) =>
    strapi.documents(RATE_LIMIT_UID).create({ data: { key, count, lastRequest } });

  const verificationsOf = (identifier: string): Promise<number> =>
    strapi.db.query(VERIFICATION_UID).count({ where: { identifier } });

  const rateLimitOf = (key: string) => strapi.db.query(RATE_LIMIT_UID).findOne({ where: { key } });

  /** Only what this file made: other test files share the database and the generated app. */
  const cleanUp = async () => {
    await strapi.db
      .query(VERIFICATION_UID)
      .deleteMany({ where: { identifier: { $contains: PREFIX } } });
    await strapi.db.query(RATE_LIMIT_UID).deleteMany({ where: { key: { $startsWith: PREFIX } } });

    const users = await strapi.db
      .query(USER_UID)
      .findMany({ where: { email: { $endsWith: EMAIL_DOMAIN } } });

    if (users.length > 0) {
      const userId = { $in: users.map((user) => user.documentId) };

      await strapi.db.query(SESSION_UID).deleteMany({ where: { userId } });
      await strapi.db.query(ACCOUNT_UID).deleteMany({ where: { userId } });
      await strapi.db.query(USER_UID).deleteMany({ where: { email: { $endsWith: EMAIL_DOMAIN } } });
    }
  };

  beforeAll(async () => {
    // The rate limit table only exists when the rate limit is kept in the database
    strapi = await createEndUsersInstance({ pluginConfig: { rateLimit: { storage: 'database' } } });
    rq = createRequest({ strapi });
    adapter = createPluginAdapter(strapi);
  });

  afterEach(async () => {
    if (strapi) {
      await cleanUp();
    }
  });

  afterAll(async () => {
    await strapi?.destroy();
  });

  describe('consumeOne', () => {
    // Better Auth consumes a verification value by its id; a caller can as well name the identifier
    it.each(['identifier', 'id'])(
      `gives the row to exactly one of ${CALLERS} simultaneous callers, selected by %s`,
      async (selectedBy) => {
        const identifier = unique('consume');
        const seeded = await seedVerification(identifier);
        const where: Where[] =
          selectedBy === 'id'
            ? [{ field: 'id', value: seeded.documentId }]
            : [{ field: 'identifier', value: identifier }];

        const results = await concurrently(CALLERS, () =>
          adapter.consumeOne({ model: VERIFICATION, where })
        );

        const winners = results.filter((row) => row !== null);

        expect(winners).toHaveLength(1);
        expect(results.filter((row) => row === null)).toHaveLength(CALLERS - 1);
        expect(winners[0]).toMatchObject({
          id: seeded.documentId,
          identifier,
          value: seeded.value,
        });
        expect(await verificationsOf(identifier)).toBe(0);
      }
    );

    // The adapter itself does not look at `expiresAt`; a `where` that does is a guard like any
    // other, and Better Auth checks the expiry of what it consumed afterwards (it deletes first).
    it('leaves a row that a date guard in the where excludes, and still hands a live one to one caller', async () => {
      const expired = unique('consume-expired');
      const live = unique('consume-live');

      await seedVerification(expired, new Date(Date.now() - HOUR));
      await seedVerification(live, new Date(Date.now() + HOUR));

      const now = new Date();
      const notExpired = (identifier: string): Where[] => [
        { field: 'identifier', value: identifier },
        { field: 'expiresAt', operator: 'gt', value: now },
      ];

      const [expiredResults, liveResults] = await Promise.all([
        concurrently(CALLERS, () =>
          adapter.consumeOne({ model: VERIFICATION, where: notExpired(expired) })
        ),
        concurrently(CALLERS, () =>
          adapter.consumeOne({ model: VERIFICATION, where: notExpired(live) })
        ),
      ]);

      expect(expiredResults).toEqual(Array(CALLERS).fill(null));
      expect(await verificationsOf(expired)).toBe(1);

      expect(liveResults.filter((row) => row !== null)).toHaveLength(1);
      expect(await verificationsOf(live)).toBe(0);
    });
  });

  describe('incrementOne', () => {
    it(`counts every one of ${CALLERS} simultaneous increments, and none twice`, async () => {
      const key = unique('increment');

      await seedRateLimit(key, 0);

      const results = await concurrently(CALLERS, () =>
        adapter.incrementOne({
          model: RATE_LIMIT,
          where: [{ field: 'key', value: key }],
          increment: { count: 1 },
        })
      );

      expect((await rateLimitOf(key)).count).toBe(CALLERS);

      // It returns the row as the increment left it, so each caller saw its own count
      expect(results).not.toContain(null);
      expect(results.map((row) => row?.key)).toEqual(Array(CALLERS).fill(key));
      expect(ascending(results.map((row) => Number(row?.count)))).toEqual(oneTo(CALLERS));
    });

    it(`lets exactly ${GUARD} of ${CALLERS} simultaneous callers through a count < ${GUARD} guard`, async () => {
      const key = unique('guard');

      await seedRateLimit(key, 0);

      const results = await concurrently(CALLERS, () =>
        adapter.incrementOne({
          model: RATE_LIMIT,
          where: [
            { field: 'key', value: key },
            { field: 'count', operator: 'lt', value: GUARD },
          ],
          increment: { count: 1 },
        })
      );

      const through = results.filter((row) => row !== null);

      expect(through).toHaveLength(GUARD);
      expect(results.filter((row) => row === null)).toHaveLength(CALLERS - GUARD);
      expect(ascending(through.map((row) => Number(row?.count)))).toEqual(oneTo(GUARD));
      expect((await rateLimitOf(key)).count).toBe(GUARD);
    });

    // What Better Auth's rate limiter does when a key's window is over (`api/rate-limiter/index.mjs`):
    // every request that saw the old `lastRequest` tries to start the new window, with a guard that
    // still holds only for the first, and a `set` where it has nothing to increment. If two got
    // through, the second would wipe the count of the requests the first had let in.
    it(`resets an old window for exactly one of ${CALLERS} simultaneous callers, with a guard and a set and no increment`, async () => {
      const key = unique('window');
      const oldRequest = Date.now() - HOUR;
      const now = Date.now();

      await seedRateLimit(key, 7, oldRequest);

      const results = await concurrently(CALLERS, () =>
        adapter.incrementOne({
          model: RATE_LIMIT,
          where: [
            { field: 'key', value: key },
            { field: 'lastRequest', operator: 'lte', value: oldRequest },
          ],
          increment: {},
          set: { count: 1, lastRequest: now },
        })
      );

      const winners = results.filter((row) => row !== null);

      expect(winners).toHaveLength(1);
      expect(results.filter((row) => row === null)).toHaveLength(CALLERS - 1);
      expect(winners[0]).toMatchObject({ key, count: 1 });
      expect(Number(winners[0]?.lastRequest)).toBe(now);

      const row = await rateLimitOf(key);

      expect(row.count).toBe(1);
      expect(Number(row.lastRequest)).toBe(now);
    });
  });

  // A wiring check, not the proof of atomicity (see the header): Better Auth serialises same-token
  // consumers in the process, so cases 1-3 are what show the database decides.
  describe('a reset-password token through the endpoint', () => {
    it(`is redeemed by exactly one of ${HTTP_CALLERS} simultaneous requests`, async () => {
      const email = `${unique('reset')}${EMAIL_DOMAIN}`;
      const signedUp = await rq.post('/api/auth/sign-up/email', {
        body: { email, password: PASSWORD, name: 'Race' },
      });

      expect(signedUp.statusCode).toBe(200);

      // The token Better Auth would have mailed. The email wiring sends it for real; the endpoint is the same.
      const token = unique('token');
      const identifier = `reset-password:${token}`;

      await strapi.documents(VERIFICATION_UID).create({
        data: { identifier, value: signedUp.body.user.id, expiresAt: new Date(Date.now() + HOUR) },
      });

      const passwords = Array.from(
        { length: HTTP_CALLERS },
        (_, index) => `New-password-${index}!`
      );
      const results = await concurrently<HttpResponse>(HTTP_CALLERS, (index) =>
        rq.post('/api/auth/reset-password', { body: { token, newPassword: passwords[index] } })
      );

      const winners = results.filter(({ statusCode }) => statusCode >= 200 && statusCode < 300);

      expect(winners).toHaveLength(1);
      expect(winners[0].body).toEqual({ status: true });

      // Every other request is refused for the token, and not for any other reason
      for (const lost of results.filter((result) => result !== winners[0])) {
        expect(lost.statusCode).toBe(400);
        expect(lost.body.code).toBe('INVALID_TOKEN');
      }

      expect(await verificationsOf(identifier)).toBe(0);

      // The winner's password took: the requests that lost stopped before they wrote
      const winnersPassword = passwords[results.indexOf(winners[0])];
      const signIn = (password: string) =>
        rq.post('/api/auth/sign-in/email', { body: { email, password } });

      expect((await signIn(winnersPassword)).statusCode).toBe(200);
      expect((await signIn(PASSWORD)).statusCode).toBe(401);
    });
  });
});

/** The users this file signed up, and what hangs off them */
const removeUsers = async (strapi) => {
  const users = await strapi.db
    .query(USER_UID)
    .findMany({ where: { email: { $endsWith: EMAIL_DOMAIN } } });

  if (users.length === 0) {
    return;
  }

  const ids = users.map((user) => user.documentId);

  await strapi.db
    .query('plugin::end-users.profile')
    .deleteMany({ where: { user: { documentId: { $in: ids } } } });
  await strapi.db.query(SESSION_UID).deleteMany({ where: { userId: { $in: ids } } });
  await strapi.db.query(ACCOUNT_UID).deleteMany({ where: { userId: { $in: ids } } });
  await strapi.db.query(USER_UID).deleteMany({ where: { documentId: { $in: ids } } });
};

describe('end-users: the profile under concurrency', () => {
  // A profile is made with its user and no request can make one, so the only race is
  // the start's backfill (`ensureEveryUserHasAProfile`) running on two instances at once. It makes
  // its creates the plugin's own, through `asProfileLifecycle`, and `one-profile-per-user` takes a
  // row lock on the user and checks inside it. The script calls the backfill itself, from the build,
  // as the lifecycle mark is private to the module the plugin runs.
  const PROFILE_UID = 'plugin::end-users.profile';
  const RUNS = 10;
  let strapi;
  let rq;

  beforeAll(async () => {
    strapi = await createEndUsersInstance({ pluginConfig: { trustedOrigins: [TEST_ORIGIN] } });
    rq = createRequest({ strapi });
  });

  afterAll(async () => {
    await removeUsers(strapi);
    await strapi.destroy();
  });

  it(`gets exactly one profile for a user out of ${RUNS} simultaneous backfills`, async () => {
    const { ensureEveryUserHasAProfile } = require(
      path.join(
        path.dirname(require.resolve('@strapi/plugin-end-users/package.json')),
        'dist',
        'server',
        'bootstrap.js'
      )
    );
    const { documentId } = await createSignedInUser(rq, `${unique('profile')}${EMAIL_DOMAIN}`);
    const profiles = () => strapi.db.query(PROFILE_UID).count({ where: { user: { documentId } } });

    // The user's own create made its profile; take it away, as a database from before has none
    await strapi.db.query(PROFILE_UID).deleteMany({ where: { user: { documentId } } });
    expect(await profiles()).toBe(0);

    const results = await concurrently<{ failed: unknown[] }>(RUNS, () =>
      ensureEveryUserHasAProfile(strapi)
    );

    expect(await profiles()).toBe(1);
    // A run that lost the race found the profile there: nothing is reported missing
    expect(results.flatMap(({ failed }) => failed)).toHaveLength(0);
  });
});

describe('end-users: a role with many permissions', () => {
  const ROLE_UID = 'plugin::end-users.role';
  const ROWS = 1201;
  let strapi;

  beforeAll(async () => {
    strapi = await createEndUsersInstance();
  });

  afterAll(async () => {
    await strapi?.destroy();
  });

  it(`stores the ${ROWS} rows of a large create, in chunks, and reads them all back`, async () => {
    const roles = strapi.plugin('end-users').service('role');
    const permissions = strapi.plugin('end-users').service('permission');
    const big = await roles.create({ name: unique('big-role') });

    try {
      await permissions.applyDiff(big.documentId, {
        create: Array.from({ length: ROWS }, (_, index) => row(`bulk.action.n${index}`)),
        update: [],
        delete: [],
      });

      const found = await permissions.findForRoles([big.documentId]);

      expect(found).toHaveLength(ROWS);
      expect(new Set(found.map((permission) => permission.documentId)).size).toBe(ROWS);
    } finally {
      await roles.delete(big.documentId);
    }

    expect(
      await strapi.documents(ROLE_UID).count({ filters: { documentId: big.documentId } })
    ).toBe(0);
  });
});
