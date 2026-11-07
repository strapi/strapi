// The role editor loads in under 2 s with 200 content types.
//
// A one-off measurement, in no Playwright project and no CI job. It signs in to the admin panel of a
// running Strapi, answers the two requests that make the editor big (the permission layout and the
// role) with a generated project of `--types` content types, opens a role from the Roles list
// `--runs` times, and prints the median time from the click to the last content type's row being
// visible. It exits 1 when the median is above 2,000 ms.
//
// The browser is Playwright's (`yarn playwright install chromium`, once). Run it against Strapi on a
// database of its own: it registers an administrator when there is none, and cannot sign in to a
// database whose administrator is someone else's.
//
//   cd examples/end-users && DATABASE_FILENAME=.tmp/measure.db yarn develop --no-watch-admin
//   node examples/end-users-frontend/scripts/measure-role-editor.mjs --url http://localhost:1337 --types 200 --runs 5
//
// "Visible" is Playwright's: the last content type's header (a collapsed row, all 200 are rendered
// closed) is in the DOM with a size and not hidden. It does not have to be inside the viewport, so
// the time is "click to the editor's whole list rendered", not "to the last row scrolled into view".
// Strapi's admin calls the plugin at `/end-users/...` of the server root, not under `/admin`.
// The admin rate-limits logins (429): a rerun within about a minute of many sign-ins fails to sign in.
//
// The time is taken from the script's side, so it includes Playwright's own round trip for the
// click (a few milliseconds to some tens): it errs high, which is the safe side of a limit.
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { chromium, request as playwrightRequest } from '@playwright/test';

/** The limit, in milliseconds */
const LIMIT_MS = 2000;

/** The administrator this script registers or signs in as. Test values, apart from the e2e specs' own. */
const ADMIN_EMAIL = 'timing-admin@example.com';
const ADMIN_PASSWORD = 'Timing-Admin-Passw0rd';
const ADMIN_FIRSTNAME = 'Timing';
const ADMIN_LASTNAME = 'Admin';

/** What the admin keeps for its guided tour, with the tours off: their pop-ups would cover the page */
const GUIDED_TOUR_OFF = {
  tours: {
    contentTypeBuilder: { currentStep: 0, length: 5, isCompleted: false },
    contentManager: { currentStep: 0, length: 4, isCompleted: false },
    apiTokens: { currentStep: 0, length: 4, isCompleted: false },
    strapiCloud: { currentStep: 0, length: 0, isCompleted: false },
  },
  enabled: false,
  completedActions: [],
};

/* -------------------------------------------------------------------------------------------------
 * The generated project
 * -----------------------------------------------------------------------------------------------*/

const DATA_ACTIONS = ['find', 'findOne', 'create', 'update', 'delete', 'read-drafts', 'publish'];

const END_USER = 'plugin::end-users.user';

const field = (name, type, extra = {}) => ({
  name,
  label: name.split('.').pop(),
  type,
  required: false,
  engineOwned: false,
  ...extra,
});

/** What a content type of a real project has: scalars of the common kinds, a component, a relation */
const fieldsOfType = () => [
  field('title', 'string', { required: true }),
  field('slug', 'uid'),
  field('body', 'richtext'),
  field('views', 'integer'),
  field('rating', 'float'),
  field('published', 'boolean'),
  field('publishedOn', 'date'),
  field('kind', 'enumeration'),
  field('cover', 'media'),
  field('seo', 'component', {
    children: [field('seo.metaTitle', 'string'), field('seo.metaDescription', 'text')],
  }),
  field('author', 'relation', { relationTarget: END_USER }),
];

/** The leaves of the fields: what a role's list of fields names, a component by its children */
const FIELD_NAMES = [
  'title',
  'slug',
  'body',
  'views',
  'rating',
  'published',
  'publishedOn',
  'kind',
  'cover',
  'seo.metaTitle',
  'seo.metaDescription',
  'author',
];

const IS_OWNER = {
  name: 'plugin::end-users.is-owner',
  displayName: 'Is owner',
  source: 'builtin',
  params: [
    { name: 'field', type: 'attribute', required: true, options: ['author'] },
    { name: 'setOnCreate', type: 'boolean', required: false, default: true },
  ],
};

/** How many digits the numbers of the types have, so that their labels sort the way they count */
const widthOf = (types) => Math.max(3, String(types).length);

const labelOfType = (index, types) => `Type ${String(index).padStart(widthOf(types), '0')}`;

const uidOfType = (index, types) => {
  const name = `type-${String(index).padStart(widthOf(types), '0')}`;

  return `api::${name}.${name}`;
};

/** The permission layout of a project of `types` collection types, as `GET /permissions/layout` answers */
export const generateLayout = (types) => ({
  contentTypes: Array.from({ length: types }, (_, position) => {
    const uid = uidOfType(position + 1, types);

    return {
      uid,
      label: labelOfType(position + 1, types),
      kind: 'collectionType',
      actions: DATA_ACTIONS.map((action) => ({
        action,
        actionId: `${uid}.${action}`,
        hasRules: action === 'update',
      })),
      fields: fieldsOfType(),
      locked: [],
      conditions: [IS_OWNER],
    };
  }),
  groups: [
    {
      id: 'plugin::end-users',
      kind: 'plugin',
      label: 'End users',
      categories: [
        {
          label: 'Me',
          routes: [
            {
              actionId: 'plugin::end-users.me.find',
              label: 'Find',
              route: 'GET /api/users/me',
              hasRules: false,
            },
          ],
        },
      ],
    },
    {
      id: 'api::health',
      kind: 'custom',
      label: 'Health',
      categories: [
        {
          label: 'Health',
          routes: [
            {
              actionId: 'api::health.health.check',
              label: 'Check',
              route: 'GET /api/health',
              hasRules: false,
            },
          ],
        },
      ],
    },
  ],
});

/**
 * A role of that project, as `GET /roles/:documentId` answers: everything readable on every type
 * with every field, and on every fifth type also Create and Update (the owner's, with a condition),
 * and Delete and Publish on every tenth. About 500 rows for 200 types.
 */
export const generateRole = (documentId, types) => {
  let rows = 0;
  const permission = (uid, action, extra = {}) => {
    rows += 1;

    return {
      documentId: `permission-${rows}`,
      action: `${uid}.${action}`,
      subject: null,
      properties: {},
      conditions: [],
      ...extra,
    };
  };

  const permissions = Array.from({ length: types }, (_, position) => {
    const uid = uidOfType(position + 1, types);
    const fields = { properties: { fields: FIELD_NAMES } };
    const owned = {
      properties: { fields: ['title', 'body'] },
      conditions: [{ name: IS_OWNER.name, params: { field: 'author', setOnCreate: true } }],
    };

    return [
      permission(uid, 'find', fields),
      permission(uid, 'findOne', fields),
      ...(position % 5 === 0
        ? [permission(uid, 'create', owned), permission(uid, 'update', owned)]
        : []),
      ...(position % 10 === 0 ? [permission(uid, 'delete'), permission(uid, 'publish')] : []),
    ];
  }).flat();

  return {
    documentId,
    name: 'Timing role',
    description: 'Made up by measure-role-editor.mjs',
    type: 'custom',
    requireTwoFactor: false,
    usersCount: 0,
    createdAt: '2026-11-03T09:00:00.000Z',
    updatedAt: '2026-11-03T09:00:00.000Z',
    revision: 1,
    permissions,
    problems: [],
  };
};

/** The last row of the editor: the types are listed by label */
export const lastLabel = (types) => labelOfType(types, types);

/* -------------------------------------------------------------------------------------------------
 * Arguments, and the median
 * -----------------------------------------------------------------------------------------------*/

const toCount = (name, value) => {
  const count = Number(value);

  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`--${name} must be a whole number of at least 1, not "${value}"`);
  }

  return count;
};

export const readArguments = (argv) => {
  const { values } = parseArgs({
    args: argv,
    options: {
      url: { type: 'string', default: 'http://localhost:1337' },
      types: { type: 'string', default: '200' },
      runs: { type: 'string', default: '5' },
    },
  });

  return {
    url: values.url.replace(/\/+$/, ''),
    types: toCount('types', values.types),
    runs: toCount('runs', values.runs),
  };
};

export const median = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/* -------------------------------------------------------------------------------------------------
 * Signing in
 * -----------------------------------------------------------------------------------------------*/

/**
 * Registers the administrator when Strapi has none, through the route the registration page uses.
 * The request has a cookie jar of its own: its answer sets the session cookie, which would sign the
 * browser in and leave no login form to go through.
 */
const registerAdminIfMissing = async (url) => {
  const api = await playwrightRequest.newContext({ baseURL: url });

  try {
    const init = await api.get('/admin/init').catch((error) => {
      throw new Error(`Could not reach Strapi at ${url}: ${error.message.split('\n')[0]}`, {
        cause: error,
      });
    });

    if (!init.ok()) {
      throw new Error(`GET /admin/init answered ${init.status()}: is Strapi running at ${url}?`);
    }

    if ((await init.json()).data.hasAdmin) {
      return;
    }

    const registered = await api.post('/admin/register-admin', {
      data: {
        email: ADMIN_EMAIL,
        firstname: ADMIN_FIRSTNAME,
        lastname: ADMIN_LASTNAME,
        password: ADMIN_PASSWORD,
      },
    });

    if (!registered.ok()) {
      throw new Error(
        `POST /admin/register-admin answered ${registered.status()}: ${await registered.text()}`
      );
    }
  } finally {
    await api.dispose();
  }
};

const settingsLink = (page) => page.getByRole('link', { name: /^Settings/ }).last();

const signIn = async (page, url) => {
  await page.goto(`${url}/admin`);
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password*', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();

  try {
    await settingsLink(page).waitFor({ state: 'visible', timeout: 30_000 });
  } catch (error) {
    throw new Error(
      `Could not sign in as ${ADMIN_EMAIL}. The database has an administrator that is not this ` +
        "script's: run Strapi on a database of its own (DATABASE_FILENAME=.tmp/measure.db).",
      { cause: error }
    );
  }
};

/* -------------------------------------------------------------------------------------------------
 * The measurement
 * -----------------------------------------------------------------------------------------------*/

/**
 * The admin's own API calls of the plugin, which the admin panel sends to `/end-users/...` of the
 * server's root (not under `/admin`; the page itself is `/admin/settings/end-users/...`, which these
 * must not match). `GET /end-users/roles/<documentId>`, and not the list, the export, or a write.
 */
const ROLE_URL = /^https?:\/\/[^/]+\/end-users\/roles\/([^/?#]+)(?:\?.*)?$/;
const LAYOUT_URL = /^https?:\/\/[^/]+\/end-users\/permissions\/layout(?:\?.*)?$/;

const json = (route, data) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });

const measure = async ({ url, types, runs }) => {
  await registerAdminIfMissing(url);

  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({ baseURL: url });

    await context.addInitScript((tour) => {
      window.localStorage.setItem('STRAPI_GUIDED_TOUR', JSON.stringify(tour));
    }, GUIDED_TOUR_OFF);

    const page = await context.newPage();

    await signIn(page, url);

    // The project and the role are made up once: only the editor's own work is measured
    const layout = generateLayout(types);

    await page.route(LAYOUT_URL, (route) =>
      route.request().method() === 'GET' ? json(route, layout) : route.fallback()
    );
    await page.route(ROLE_URL, (route) => {
      const request = route.request();

      return request.method() === 'GET'
        ? json(route, generateRole(decodeURIComponent(request.url().match(ROLE_URL)[1]), types))
        : route.fallback();
    });

    const times = [];

    for (let run = 1; run <= runs; run += 1) {
      // A page load of its own each time, so that nothing the editor kept in memory is reused
      // eslint-disable-next-line no-await-in-loop
      await page.goto(`${url}/admin/settings/end-users/roles`);

      const role = page.getByRole('row').nth(1).getByRole('gridcell').first();
      const lastRow = page.getByText(lastLabel(types), { exact: true });

      // eslint-disable-next-line no-await-in-loop
      await role.waitFor({ state: 'visible', timeout: 30_000 });

      const started = performance.now();

      // eslint-disable-next-line no-await-in-loop
      await role.click();
      // eslint-disable-next-line no-await-in-loop
      await lastRow.waitFor({ state: 'visible', timeout: 30_000 });

      times.push(performance.now() - started);
      console.log(`run ${run}: ${Math.round(times[times.length - 1])} ms`);
    }

    return times;
  } finally {
    await browser.close();
  }
};

const main = async () => {
  const options = readArguments(process.argv.slice(2));

  console.log(
    `Role editor with ${options.types} content types, ${options.runs} runs, against ${options.url}`
  );

  const result = median(await measure(options));
  const passes = result <= LIMIT_MS;

  console.log(
    `median: ${Math.round(result)} ms (limit ${LIMIT_MS} ms): ${passes ? 'ok' : 'too slow'}`
  );

  process.exit(passes ? 0 : 1);
};

// Run as a script; importing it (to look at the generated project) runs nothing
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
