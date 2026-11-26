import fs from 'node:fs';
import path from 'node:path';

import { request, type WorkerInfo } from '@playwright/test';
import { seed, type Server } from '@strapi/tests-shared';

/**
 * The admin roles a ui test can start logged in as (RFC D5). Each one is an admin user with the
 * Strapi role of the same name: Super Admin, Editor, Author.
 */
export type Role = 'admin' | 'editor' | 'author';

export const ROLES: readonly Role[] = ['admin', 'editor', 'author'];

export interface Credentials {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  /** The code of the Strapi admin role the user gets. */
  roleCode: string;
}

/** Deterministic, created once per worker before the snapshot, so every reset keeps them. */
export const CREDENTIALS: Readonly<Record<Role, Readonly<Credentials>>> = {
  admin: {
    email: 'admin@tests.strapi.io',
    password: 'Admin-Tests-1',
    firstname: 'Admin',
    lastname: 'Tests',
    roleCode: 'strapi-super-admin',
  },
  editor: {
    email: 'editor@tests.strapi.io',
    password: 'Editor-Tests-1',
    firstname: 'Editor',
    lastname: 'Tests',
    roleCode: 'strapi-editor',
  },
  author: {
    email: 'author@tests.strapi.io',
    password: 'Author-Tests-1',
    firstname: 'Author',
    lastname: 'Tests',
    roleCode: 'strapi-author',
  },
};

/**
 * Where the storage state of a role is saved: under the project's output dir (`test-results`,
 * gitignored and emptied at the start of each run), one folder per project and server, since a
 * state only works against the server it logged in to.
 */
export const storageStatePath = (workerInfo: WorkerInfo, server: Server, role: Role) =>
  path.join(
    workerInfo.project.outputDir,
    '.auth',
    `${workerInfo.project.name}-${server.port}`,
    `${role}.json`
  );

/**
 * The guided tour, turned off like in the legacy e2e suite: its overview and popovers would cover
 * the panel in every test. The panel reads `STRAPI_GUIDED_TOUR` from localStorage
 * (packages/core/admin/admin/src/components/GuidedTour/Context.tsx) and fills in the missing tours
 * itself (`migrateTours`), so `enabled: false` is enough. A test of the tour itself can set it
 * back with `page.addInitScript`.
 */
export const GUIDED_TOUR_OFF = {
  name: 'STRAPI_GUIDED_TOUR',
  value: JSON.stringify({ enabled: false, completedActions: [] }),
};

/**
 * Log an admin user in through the admin API, the way the panel does after a "Remember me" login:
 * the refresh cookie the login sets, and the access token where the panel keeps it (`jwtToken` in
 * localStorage, see packages/core/admin/admin/src/reducer.ts), plus the guided tour turned off.
 * A context opened with the returned `storageState` starts in the panel logged in, and `token` is
 * the user's bearer token for admin API calls.
 *
 * For a user a test seeds (a custom role): `browser.newContext({ storageState })`. The built-in
 * roles already have theirs (`role`, `storageStates`). Each call is a login attempt:
 * `admin::rateLimit` allows 5 per email and IP in 5 minutes, so give the user a `unique` email
 * when a test can run more than that against the same server (`--repeat-each`).
 */
export const logIn = async (
  server: Server,
  { email, password }: Pick<Credentials, 'email' | 'password'>
) => {
  const context = await request.newContext({ baseURL: server.url });
  try {
    const res = await context.post('/admin/login', {
      data: { email, password, rememberMe: true },
    });
    if (!res.ok()) {
      throw new Error(`API login as ${email} failed (${res.status()}): ${await res.text()}`);
    }
    const { data } = (await res.json()) as { data: { token: string } };

    const storageState = await context.storageState();
    storageState.origins = [
      {
        origin: server.url,
        localStorage: [
          { name: 'jwtToken', value: JSON.stringify(data.token) },
          { name: 'isLoggedIn', value: 'true' },
          GUIDED_TOUR_OFF,
        ],
      },
    ];
    return { token: data.token, storageState };
  } finally {
    await context.dispose();
  }
};

/** Log one role in and save its storage state (see `logIn`). */
const saveStorageState = async (server: Server, role: Role, file: string) => {
  const { storageState } = await logIn(server, CREDENTIALS[role]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(storageState, null, 2));
};

/**
 * The admin API bearer token saved in a storage state (`storageStates[role]` or `logIn`'s), for
 * API calls a test makes as that user without logging in again.
 */
export const accessToken = (storageStateFile: string): string => {
  const state = JSON.parse(fs.readFileSync(storageStateFile, 'utf8')) as {
    origins: Array<{ localStorage: Array<{ name: string; value: string }> }>;
  };
  const jwt = state.origins
    .flatMap((origin) => origin.localStorage)
    .find((item) => item.name === 'jwtToken');
  if (!jwt) {
    throw new Error(`No admin access token in ${storageStateFile}.`);
  }
  return JSON.parse(jwt.value) as string;
};

/**
 * Create the user of each role and save their storage states. Call it once per worker, after the
 * server starts and before `snapshotDatabase`: the users and their admin sessions are then part of
 * the snapshot, so they survive every reset.
 */
export const loginRoles = async (server: Server, workerInfo: WorkerInfo) => {
  await seed(server, {
    adminUsers: ROLES.map((role) => {
      const { email, password, firstname, lastname, roleCode } = CREDENTIALS[role];
      return { email, password, firstname, lastname, roles: [roleCode] };
    }),
  });
  await Promise.all(
    ROLES.map((role) => saveStorageState(server, role, storageStatePath(workerInfo, server, role)))
  );
};
